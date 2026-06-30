import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const sbAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutesParam = parseInt(searchParams.get("minutes") || "30", 10);

    const thresholdTime = new Date(Date.now() - minutesParam * 60 * 1000).toISOString();

    // 1. Fetch pending escalations older than the threshold
    const { data: pending, error: fetchErr } = await sbAdmin
      .from("escalations")
      .select(`
        id,
        sent_at,
        report_id,
        roster_id,
        reports:report_id (
          tracking_code
        ),
        on_call_roster:roster_id (
          assigned_name,
          escalation_target_name,
          escalation_contact_address
        )
      `)
      .eq("is_acknowledged", false)
      .eq("escalated_to_backup", false)
      .lt("sent_at", thresholdTime);

    if (fetchErr) throw fetchErr;

    const escalatedItems = [];

    if (pending && pending.length > 0) {
      for (const esc of pending) {
        const report = esc.reports as any;
        const roster = esc.on_call_roster as any;
        const trackingCode = report?.tracking_code || "BİLİNMİYOR";
        const backupName = roster?.escalation_target_name || "Müdür";
        const backupAddress = roster?.escalation_contact_address || "admin@school.edu.tr";

        // 2. Dispatch mock secondary notification
        console.log(`[İKİNCİ DERECE ESKALASYON BİLDİRİMİ] Nöbetçi ${roster?.assigned_name || 'Bilinmeyen'} tarafından görülmeyen kritik vaka. Takip Kodu: ${trackingCode}, Yedek Yetkili: ${backupName} (${backupAddress})`);

        // 3. Update escalation record
        await sbAdmin
          .from("escalations")
          .update({
            escalated_to_backup: true,
            backup_escalated_at: new Date().toISOString()
          })
          .eq("id", esc.id);

        // 4. Log to audit_logs
        await sbAdmin.from("audit_logs").insert([
          {
            log_id: `LOG-${Math.floor(Math.random() * 9000 + 1000)}`,
            action: `ESKALASYON_IKINCI_KADEME_TETIKLENDI: ${trackingCode}`,
            actor: "SYSTEM",
            status: "Başarılı"
          }
        ]);

        escalatedItems.push({
          id: esc.id,
          tracking_code: trackingCode,
          backup_notified: backupName
        });
      }
    }

    return NextResponse.json({
      success: true,
      escalated_count: escalatedItems.length,
      escalated_items: escalatedItems
    });
  } catch (error: any) {
    console.error("[/api/escalate/check-pending] Hata:", error);
    return NextResponse.json(
      { error: "Eskalasyon kontrolü sırasında hata: " + error.message },
      { status: 500 }
    );
  }
}
