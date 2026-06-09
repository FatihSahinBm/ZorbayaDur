import { callGroq, safeParseJSON } from "./groqClient";

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
Aşağıda son 30 günün anonim bildirim özetleri var.
Tekrar eden örüntüleri tespit et. SADECE JSON döndür, başka hiçbir şey yazma.

BİLDİRİMLER: {REPORTS_SUMMARY}

{
  "patterns_found": true veya false,
  "hotspot_locations": ["lokasyon1"],
  "recurring_behavior_types": ["tip1"],
  "victim_cluster": true veya false,
  "perpetrator_cluster": true veya false,
  "pattern_description": "PDR için 2-3 cümle özet",
  "suggested_intervention": "Önerilen grup/okul müdahalesi",
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

export async function detectPatterns(reportsSummary: string): Promise<PatternResult> {
  const prompt = PATTERN_PROMPT.replace("{REPORTS_SUMMARY}", reportsSummary);
  const raw = await callGroq(prompt, { model: "llama-3.3-70b-versatile", jsonMode: true });
  return safeParseJSON<PatternResult>(raw, FALLBACK);
}
