import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeUrgency } from "@/lib/ai/urgencyAnalysis";
import { classifyBullying } from "@/lib/ai/bullyingClassifier";
import { generateSupportMessage } from "@/lib/ai/supportMessage";
import { triggerEscalationIfApplicable } from "@/lib/ai/escalation";
import { Database } from "@/types/database.types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getSimilarity(s1: string, s2: string): number {
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    const normalized = str.toLowerCase().replace(/\s+/g, "");
    for (let i = 0; i < normalized.length - 1; i++) {
      bigrams.add(normalized.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const bigram of b1) {
    if (b2.has(bigram)) intersection++;
  }
  
  const total = b1.size + b2.size;
  if (total === 0) return 0;
  return (2 * intersection) / total;
}

export async function POST(request: NextRequest) {
  try {
    const { content, category, reportId, location, frequency } = await request.json();

    if (!content || !reportId) {
      return NextResponse.json({ error: "content ve reportId gerekli" }, { status: 400 });
    }

    // 1. Sınıflandırmayı çalıştır (Zorbalık türü ve şiddeti belirlemek için)
    const classification = await classifyBullying(content);

    // 2. Aciliyet ve destek mesajı analizlerini paralel çalıştır
    const [urgency, supportMsg] = await Promise.all([
      analyzeUrgency(content, classification.primary_type, location ?? "Bilinmiyor", frequency ?? "Bilinmiyor"),
      generateSupportMessage(classification.primary_type, classification.severity, content),
    ]);

    // 3. Spam / Mükerrer / Tekrarlanan Analizi
    const { data: currentReport } = await supabaseAdmin
      .from("reports")
      .select("session_token, created_at")
      .eq("id", reportId)
      .single();

    const { data: previousReports } = await supabaseAdmin
      .from("reports")
      .select("id, content, session_token, created_at, risk_level")
      .neq("id", reportId)
      .order("created_at", { ascending: false })
      .limit(50);

    let isSpam = false;
    let isRecurring = false;

    if (previousReports && previousReports.length > 0) {
      const nowTime = currentReport ? new Date(currentReport.created_at).getTime() : Date.now();
      for (const prev of previousReports) {
        const similarity = getSimilarity(prev.content, content);
        if (similarity >= 0.85) {
          const currentSession = currentReport?.session_token || "current-anon";
          const prevSession = prev.session_token || "prev-anon";
          
          const timeDiffMs = Math.abs(new Date(prev.created_at).getTime() - nowTime);
          const timeDiffMins = timeDiffMs / (1000 * 60);

          if (currentSession === prevSession || timeDiffMins <= 10) {
            isSpam = true;
            break;
          } else {
            isRecurring = true;
          }
        }
      }
    }

    const classPayload = classification as any;

    if (isSpam) {
      classPayload.is_spam = true;
      classPayload.primary_type = "Spam/Yinelenen";
      urgency.urgency_score = 15;
      urgency.urgency_label = "Düşük";
      urgency.recommended_action = "⚠️ Spam Şüphesi: Bu ihbar, kısa süre önce gönderilen başka bir ihbarla benzer veya aynı içeriğe sahiptir. İnceleme önceliği düşürülmüştür.";
    } else if (isRecurring) {
      classPayload.is_recurring = true;
      urgency.urgency_score = Math.min(100, urgency.urgency_score + 20);
      if (urgency.urgency_score >= 80) {
        urgency.urgency_label = "Acil";
      } else if (urgency.urgency_score >= 60) {
        urgency.urgency_label = "Yüksek";
      } else {
        urgency.urgency_label = "Orta";
      }
      urgency.recommended_action = (urgency.recommended_action || "") + " (Sistematik/Tekrarlayan vaka şüphesi: Aynı konuda farklı kişilerden birden fazla ihbar alınmıştır, öncelik yükseltilmiştir.)";
    }

    const aiAnalysis = {
      urgency,
      classification: classPayload,
      analyzed_at: new Date().toISOString(),
    } as any;

    const updatePayload: any = { ai_analysis: aiAnalysis };

    // "ve Tespit Edilenlerde intihar varsa direkt en yüksek risk grubunda sınıflandırılmalı"
    const suicideKeywords = ["intihar", "kendimi öldür", "canıma kıy", "her şeyi bitir", "yaşamak istemi", "ölmek isti"];
    const hasSuicideKeyword = suicideKeywords.some(keyword => content.toLowerCase().includes(keyword));

    if (hasSuicideKeyword) {
      updatePayload.risk_level = "Bordo"; // En yüksek risk
      urgency.urgency_score = 100;
      urgency.urgency_label = "Acil";
      if (!urgency.keywords_detected) urgency.keywords_detected = [];
      if (!urgency.keywords_detected.some((k: string) => k.toLowerCase().includes("intihar"))) {
        urgency.keywords_detected.push("intihar");
      }
    } else {
      // Clean up hallucinated 'intihar' keyword if no actual suicide intent is found in content
      if (urgency.keywords_detected) {
        urgency.keywords_detected = urgency.keywords_detected.filter(
          (k: string) => !k.toLowerCase().includes("intihar")
        );
      }

      if (isSpam) {
        updatePayload.risk_level = "Sarı"; // Low risk
      } else if (isRecurring) {
        if (urgency.urgency_score >= 80) {
          updatePayload.risk_level = "Bordo"; // Critical risk
        } else if (urgency.urgency_score >= 60) {
          updatePayload.risk_level = "Kırmızı"; // High risk
        } else {
          updatePayload.risk_level = "Turuncu"; // Medium risk
        }
      } else {
        // Normal/non-recurring vaka risk düzeyi güncellemesi
        if (urgency.urgency_score >= 80) {
          updatePayload.risk_level = "Bordo";
        } else if (urgency.urgency_score >= 60) {
          updatePayload.risk_level = "Kırmızı";
        } else if (urgency.urgency_score >= 40) {
          updatePayload.risk_level = "Turuncu";
        } else {
          updatePayload.risk_level = "Sarı";
        }
      }
    }

    // Sonuçları Supabase'e yaz
    await supabaseAdmin
      .from("reports")
      .update(updatePayload)
      .eq("id", reportId);

    // Eskalasyon kontrolü tetikle
    await triggerEscalationIfApplicable(reportId, supabaseAdmin);

    return NextResponse.json({
      success: true,
      support_message: supportMsg,
      urgency_score: urgency.urgency_score,
      urgency_label: urgency.urgency_label,
    });
  } catch (error: any) {
    console.error("[/api/analyze] Hata:", error);
    return NextResponse.json(
      { error: "Analiz sırasında bir hata oluştu: " + error.message },
      { status: 500 }
    );
  }
}
