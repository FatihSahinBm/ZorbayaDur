import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { sanitizeForLLM } from "@/lib/ai/sanitizeForLLM";
import { encryptReportContent } from "@/lib/crypto/reportCrypto";
import { classifyBullying } from "@/lib/ai/bullyingClassifier";
import { analyzeUrgency } from "@/lib/ai/urgencyAnalysis";
import { generateSupportMessage } from "@/lib/ai/supportMessage";
import { triggerEscalationIfApplicable } from "@/lib/ai/escalation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseServer() {
  if (supabaseUrl && supabaseUrl.startsWith("http") && supabaseKey) {
    return createClient<Database>(supabaseUrl, supabaseKey);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content: rawContent,
      category,
      location,
      frequency,
      studentId = "anonim",
      schoolId: requestedSchoolId,
      identityLevel = 1,
      encryptedIdentity = null,
      evidenceUrl = null,
      assigneeRole = "pdr",
      sessionToken,
      trackingCode: providedTrackingCode
    } = body;

    if (!rawContent || rawContent.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "İhbar metni en az 10 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const sb = getSupabaseServer();
    if (!sb) {
      return NextResponse.json(
        { success: false, error: "Veritabanı bağlantısı yapılandırılamadı." },
        { status: 500 }
      );
    }

    // 1. Okul ID Çözümleme (Gerekirse ilk okul fallback)
    let schoolId = requestedSchoolId;
    if (!schoolId) {
      const { data: defaultSchool } = await sb
        .from("schools")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      schoolId = defaultSchool?.id || null;
    }

    // 2. ADIM 1 & 2: PII (Kişisel Veri) Filtresinden Geçir
    const { sanitizedText, maskedCount } = sanitizeForLLM(rawContent);

    // 3. ADIM 3: YZ Analizini YALNIZCA Arındırılmış Metinle (sanitizedText) Yap
    let classification: any = { primary_type: category || "Genel Zorbalık", severity: "Orta" };
    let urgency: any = { urgency_score: 50, urgency_label: "Orta" };
    let supportMsg: string = "Bildiriminiz alındı. Rehberlik birimimiz durumunuzla ilgilenecektir.";

    try {
      classification = await classifyBullying(sanitizedText);
      const [urgencyRes, supportRes] = await Promise.all([
        analyzeUrgency(
          sanitizedText,
          classification.primary_type,
          location ?? "Bilinmiyor",
          frequency ?? "Bilinmiyor"
        ),
        generateSupportMessage(classification.primary_type, classification.severity, sanitizedText)
      ]);
      urgency = urgencyRes;
      if (supportRes) supportMsg = supportRes;
    } catch (aiErr) {
      console.warn("YZ Analizi fallback modunda devam ediyor:", aiErr);
    }

    // İntihar / Ağır kriz anahtar kelime kontrolü (Arındırılmış metin üzerinden)
    const suicideKeywords = ["intihar", "kendimi öldür", "canıma kıy", "her şeyi bitir", "yaşamak istemi", "ölmek isti"];
    const hasSuicideKeyword = suicideKeywords.some(k => sanitizedText.toLowerCase().includes(k));

    let riskLevel = "Sarı";
    if (hasSuicideKeyword) {
      riskLevel = "Bordo";
      urgency.urgency_score = 100;
      urgency.urgency_label = "Acil";
    } else if (urgency.urgency_score >= 80) {
      riskLevel = "Bordo";
    } else if (urgency.urgency_score >= 60) {
      riskLevel = "Kırmızı";
    } else if (urgency.urgency_score >= 40) {
      riskLevel = "Turuncu";
    }

    // 4. ADIM 4: Veritabanı İçin Orijinal Ham Metni AES-256-GCM ile Şifrele
    const encryptedContent = await encryptReportContent(rawContent);

    // 5. ADIM 5: Veritabanına Yaz (Açık metin YERİNE şifreli metin)
    const trackingCode = providedTrackingCode || `KOZA-${Math.floor(100000 + Math.random() * 900000)}`;
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() + 48);

    const reportPayload: any = {
      tracking_code: trackingCode,
      student_id: studentId,
      category: classification.primary_type || category || "Belirtilmemiş",
      content: encryptedContent, // AES-256 Şifreli içerik!
      risk_level: riskLevel,
      status: "Yeni",
      assigned_role: assigneeRole,
      evidence_url: evidenceUrl,
      deadline_at: deadlineDate.toISOString(),
      identity_level: identityLevel,
      encrypted_identity: encryptedIdentity,
      identity_updated_at: new Date().toISOString(),
      session_token: sessionToken || crypto.randomUUID(),
      location: location || "Okul",
      frequency: frequency || "Belirtilmemiş",
      identity_sharing_approved: false,
      ai_analysis: {
        urgency,
        classification,
        pii_masked_count: maskedCount,
        analyzed_at: new Date().toISOString()
      }
    };

    if (schoolId) {
      reportPayload.school_id = schoolId;
    }

    const { data: inserted, error: insertError } = await sb
      .from("reports")
      .insert([reportPayload])
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase Report Insert Error:", insertError);
      throw insertError;
    }

    // Denetim Izi (Audit Log) Kaydi
    await (sb.from("audit_logs") as any).insert([
      {
        log_id: `LOG-${Math.floor(Math.random() * 9000 + 1000)}`,
        action: `Yeni Ihbar: ${riskLevel} risk - YZ analizi tamamlandi (PII Arindirildi, AES-256 Sifrelendi)`,
        actor: "Sistem",
        school_id: schoolId,
        status: "Basarili"
      }
    ]);

    // Eskalasyon kontrolü
    if (inserted?.id) {
      try {
        await triggerEscalationIfApplicable(inserted.id, sb);
      } catch (e) {
        console.warn("Eskalasyon tetikleme uyarısı:", e);
      }
    }

    return NextResponse.json({
      success: true,
      reportId: inserted.id,
      trackingCode,
      support_message: supportMsg,
      urgency_score: urgency.urgency_score,
      urgency_label: urgency.urgency_label,
      risk_level: riskLevel
    });
  } catch (err: any) {
    console.error("Report API Error:", err);
    return NextResponse.json(
      { success: false, error: "İhbar kaydedilirken sunucu hatası: " + (err.message || err) },
      { status: 500 }
    );
  }
}
