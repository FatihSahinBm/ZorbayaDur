import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeUrgency } from "@/lib/ai/urgencyAnalysis";
import { classifyBullying } from "@/lib/ai/bullyingClassifier";
import { generateSupportMessage } from "@/lib/ai/supportMessage";
import { Database } from "@/types/database.types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const aiAnalysis = {
      urgency,
      classification,
      analyzed_at: new Date().toISOString(),
    } as any;

    // Sonuçları Supabase'e yaz
    await supabaseAdmin
      .from("reports")
      .update({ ai_analysis: aiAnalysis })
      .eq("id", reportId);

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
