import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectPatterns } from "@/lib/ai/patternDetection";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Son 30 günün raporlarını çek
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select("content, category, risk_level, status, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          patterns_found: false,
          hotspot_locations: [],
          recurring_behavior_types: [],
          victim_cluster: false,
          perpetrator_cluster: false,
          pattern_description: "Son 30 günde yeterli veri bulunamadı.",
          suggested_intervention: "Daha fazla bildirim toplanması önerilir.",
          time_pattern: "Belirsiz",
        },
        report_count: 0,
      });
    }

    // Rapor özetlerini oluştur (kimlik bilgisi yok, sadece içerik)
    const summary = reports
      .map(
        (r, i) =>
          `[${i + 1}] Kategori: ${r.category} | Risk: ${r.risk_level} | Tarih: ${new Date(r.created_at).toLocaleDateString("tr-TR")} | İçerik özeti: ${r.content.slice(0, 150)}`
      )
      .join("\n");

    const result = await detectPatterns(summary);

    return NextResponse.json({
      success: true,
      result,
      report_count: reports.length,
    });
  } catch (error: any) {
    console.error("[/api/analyze/patterns] Hata:", error);
    return NextResponse.json(
      { error: "Örüntü analizi sırasında bir hata oluştu: " + error.message },
      { status: 500 }
    );
  }
}
