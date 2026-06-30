import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export async function triggerEscalationIfApplicable(
  reportId: string,
  supabase: SupabaseClient<Database>
): Promise<{ escalated: boolean; reason?: string }> {
  try {
    // 1. Fetch report details
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("id, tracking_code, risk_level, ai_analysis")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return { escalated: false, reason: "Rapor bulunamadı" };
    }

    // Determine score
    const aiAnalysis = report.ai_analysis as any;
    const score = aiAnalysis?.urgency?.urgency_score ?? 0;
    const isCritical = report.risk_level === "Kritik" || score >= 80;

    if (!isCritical) {
      return { escalated: false, reason: "Risk seviyesi kritik değil" };
    }

    // 2. Check PDR working hours
    const now = new Date();
    // JS: 0=Sunday, 1=Monday... 6=Saturday. Normalize: 1=Mon, ..., 7=Sun
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    
    // Format current time as HH:MM:SS
    const pad = (num: number) => num.toString().padStart(2, "0");
    const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const { data: workingHours, error: hoursErr } = await supabase
      .from("pdr_working_hours")
      .select("*")
      .eq("day_of_week", currentDay);

    if (hoursErr) {
      console.error("Çalışma saatleri sorgulanamadı:", hoursErr);
    }

    let isWithinWorkingHours = false;
    if (workingHours && workingHours.length > 0) {
      for (const wh of workingHours) {
        if (currentTimeStr >= wh.start_time && currentTimeStr <= wh.end_time) {
          isWithinWorkingHours = true;
          break;
        }
      }
    }

    // If within working hours, no out-of-hours escalation is triggered
    if (isWithinWorkingHours) {
      return { escalated: false, reason: "Çalışma saatleri dahilinde" };
    }

    // 3. Prevent duplicate escalations
    const { data: existingEscalation } = await supabase
      .from("escalations")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle();

    if (existingEscalation) {
      return { escalated: false, reason: "Zaten eskalasyon kaydı var" };
    }

    // 4. Query active roster duty
    const { data: rosterList } = await supabase
      .from("on_call_roster")
      .select("*")
      .eq("day_of_week", currentDay)
      .eq("is_active", true);

    let dutyRoster = rosterList && rosterList.length > 0 ? rosterList[0] : null;

    if (!dutyRoster) {
      // General fallback to any active roster
      const { data: fallbackList } = await supabase
        .from("on_call_roster")
        .select("*")
        .eq("is_active", true)
        .limit(1);
      
      if (fallbackList && fallbackList.length > 0) {
        dutyRoster = fallbackList[0];
      }
    }

    if (!dutyRoster) {
      return { escalated: false, reason: "Aktif nöbetçi bulunamadı" };
    }

    // 5. Send Notification (Twilio SMS/SMTP Email mock simulation)
    console.log(`[ESKALASYON BİLDİRİMİ] Nöbetçi: ${dutyRoster.assigned_name} (${dutyRoster.contact_address}) kanal: ${dutyRoster.contact_channel}`);
    console.log(`Mesaj: "Kritik risk skorlu yeni bir ihbar var, tracking_code: ${report.tracking_code}, lütfen panele giriş yapın"`);

    // 6. Create escalation entry
    const { error: insertErr } = await supabase
      .from("escalations")
      .insert([
        {
          report_id: reportId,
          roster_id: dutyRoster.id,
          is_acknowledged: false,
          escalated_to_backup: false
        }
      ]);

    if (insertErr) {
      throw insertErr;
    }

    // 7. Audit log creation
    await supabase.from("audit_logs").insert([
      {
        log_id: `LOG-${Math.floor(Math.random() * 9000 + 1000)}`,
        action: `ESKALASYON_BILDIRIMI_GONDERILDI: ${report.tracking_code}`,
        actor: "SYSTEM",
        status: "Başarılı"
      }
    ]);

    return { escalated: true };
  } catch (e: any) {
    console.error("triggerEscalationIfApplicable exception:", e);
    return { escalated: false, reason: e.message };
  }
}
