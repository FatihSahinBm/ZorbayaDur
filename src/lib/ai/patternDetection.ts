import { callGroq, safeParseJSON } from "./groqClient";
import { sanitizeForLLM } from "./sanitizer";

export interface PatternResult {
  patterns_found: boolean;
  hotspot_locations: string[];
  recurring_behavior_types: string[];
  victim_cluster: boolean;
  perpetrator_cluster: boolean;
  pattern_description: string;
  suggested_intervention: string;
  time_pattern: "Sabah" | "Öğle" | "Teneffüs" | "Özel bir gün" | "Belirsiz";
}

const PATTERN_PROMPT = `
Sen profesyonel bir Okul Psikolojik Danışmanı (PDR) veri analizi asistanısın. Görevin, son 30 güne ait anonim bildirim özetlerini ve önceden hesaplanmış konum/zaman kümeleme sonuçlarını inceleyerek okul genelindeki akran zorbalığı örüntülerini, eğilimlerini ve sistemik riskleri derinlemesine analiz etmektir. 

Metinleri dikkatlice oku, birbirleriyle olan bağlantıları, lokasyonları ve tekrarlayan temaları ortaya çıkar.

BİLDİRİMLER:
{REPORTS_SUMMARY}

ÖNCEDEN HESAPLANAN EN SIK OLAY YAŞANAN KONUMLAR (HOTSPOTS):
{PRE_HOTSPOTS}

ÖNCEDEN HESAPLANAN EN SIK OLAY YAŞANAN ZAMAN DİLİMİ:
{PRE_TIME_PATTERN}

Aşağıdaki JSON yapısını tam olarak doldur ve SADECE geçerli bir JSON objesi döndür. Açıklama veya ek metin ekleme. JSON içindeki metinler oldukça detaylı, kurumsal ve profesyonel bir dille yazılmalıdır.

{
  "patterns_found": true veya false (Eğer benzer konumlarda, benzer kişiler arasında veya benzer davranışlarda 2 veya daha fazla eşleşme/eğilim varsa true yap),
  "hotspot_locations": [], // Bu alan önceden hesaplanan hotspot'larla doldurulacaktır, modeli serbest bırak.
  "recurring_behavior_types": ["Tekrar eden spesifik zorbalık ve taciz davranış türleri. Örn: 'Sosyal dışlama ve akran baskısı', 'Siber ortamda grupça lakap takma ve alay etme', 'Fiziksel hırpalama ve eşyalara zarar verme'"],
  "victim_cluster": true veya false (Belirli bir mağdura veya mağdur grubuna yönelik sistematik/tekrarlayan bir odaklanma tespit edildi mi?),
  "perpetrator_cluster": true || false (Aynı failin veya akran grubunun birden fazla olayın arkasında olduğuna dair bulgular var mı?),
  "pattern_description": "PDR uzmanı için profesyonel, klinik ve analitik bir dille yazılmış kapsamlı değerlendirme. Olayların gelişim eğilimini, mağdur/fail dinamiklerini, psikolojik etkilerini ve tespit edilen kalıpları en az 4-5 detaylı cümleyle açıkla. Basit veya tek cümlelik yüzeysel özetler kesinlikle yazma.",
  "suggested_intervention": "PDR uzmanının ve okul yönetiminin hemen uygulayabileceği, eyleme dökülebilir, somut ve detaylı müdahale önerileri. Akran arabuluculuğu, sınıf içi psikososyal destek etkinlikleri, nöbetçi öğretmen konumlandırması veya veli bilgilendirme/seminer adımları gibi spesifik adımlar içermelidir (En az 3-4 cümle).",
  "time_pattern": "Sabah" veya "Öğle" veya "Teneffüs" veya "Özel bir gün" veya "Belirsiz"
}
`;

const FALLBACK: PatternResult = {
  patterns_found: false,
  hotspot_locations: [],
  recurring_behavior_types: [],
  victim_cluster: false,
  perpetrator_cluster: false,
  pattern_description: "Yeterli veri yok veya analiz tamamlanamadı.",
  suggested_intervention: "Daha fazla veri toplanması önerilir.",
  time_pattern: "Belirsiz",
};

export async function detectPatterns(reports: any[]): Promise<PatternResult> {
  if (!reports || reports.length === 0) return FALLBACK;

  try {
    // 1. Precise local geographical clustering (without LLM)
    const locationCounts: Record<string, number> = {};
    reports.forEach(r => {
      // Prioritize specific location, fallback to location_type
      const rawLoc = r.location || (r.ai_analysis as any)?.classification?.location_type || "Bilinmiyor";
      const loc = rawLoc.trim();
      if (loc && loc.toLowerCase() !== "bilinmiyor") {
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    });

    // Extract hotspots with count >= 2, or top counts if none has >= 2
    let hotspotLocations = Object.entries(locationCounts)
      .filter(([_, count]) => count >= 2)
      .map(([loc]) => loc);

    if (hotspotLocations.length === 0 && Object.keys(locationCounts).length > 0) {
      // Fallback to top 2 locations
      hotspotLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([loc]) => loc);
    }

    // 2. Precise temporal clustering (without LLM)
    const timeCounts: Record<string, number> = {
      "Sabah": 0,
      "Öğle": 0,
      "Teneffüs": 0,
      "Belirsiz": 0
    };
    reports.forEach(r => {
      if (!r.created_at) return;
      const hour = new Date(r.created_at).getHours();
      if (hour >= 6 && hour < 12) {
        timeCounts["Sabah"]++;
      } else if (hour >= 12 && hour < 14) {
        timeCounts["Öğle"]++;
      } else if (hour >= 14 && hour < 18) {
        timeCounts["Teneffüs"]++;
      } else {
        timeCounts["Belirsiz"]++;
      }
    });

    let topTimePattern: "Sabah" | "Öğle" | "Teneffüs" | "Özel bir gün" | "Belirsiz" = "Belirsiz";
    let maxCount = 0;
    Object.entries(timeCounts).forEach(([time, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topTimePattern = time as any;
      }
    });

    // 3. Mask PII in individual reports for LLM processing
    const sanitizedReportsText = reports.map((r, i) => {
      const { sanitizedText } = sanitizeForLLM(r.content);
      const ai = r.ai_analysis as any;
      const primaryType = ai?.classification?.primary_type || "Bilinmiyor";
      const urgencyLabel = ai?.urgency?.urgency_label || "Bilinmiyor";

      return `[Bildirim ${i + 1}] Tür: ${primaryType} | Aciliyet: ${urgencyLabel} | İçerik: ${sanitizedText}`;
    }).join("\n");

    // 4. Assemble LLM prompt
    const prompt = PATTERN_PROMPT
      .replace("{REPORTS_SUMMARY}", sanitizedReportsText)
      .replace("{PRE_HOTSPOTS}", hotspotLocations.length > 0 ? hotspotLocations.join(", ") : "Belirli bir odak nokta yok")
      .replace("{PRE_TIME_PATTERN}", topTimePattern);

    const raw = await callGroq(prompt, { model: "llama-3.1-8b-instant", jsonMode: true });
    const result = safeParseJSON<PatternResult>(raw, FALLBACK);

    // 5. Merge pre-calculated hotspots and time patterns to maintain 100% precision
    return {
      ...result,
      hotspot_locations: hotspotLocations,
      time_pattern: topTimePattern
    };
  } catch (err) {
    console.error("detectPatterns failed, using fallback:", err);
    return FALLBACK;
  }
}
