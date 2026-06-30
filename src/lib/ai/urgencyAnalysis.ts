import { callGroq, safeParseJSON } from "./groqClient";
import { sanitizeForLLM } from "./sanitizer";

export interface UrgencyResult {
  urgency_score: number;
  urgency_label: "Düşük" | "Orta" | "Yüksek" | "Acil";
  risk_factors: string[];
  recommended_action: string;
  emotional_state: string;
  intervention_timeline: "Hemen" | "24 saat" | "Bu hafta" | "Planlı takip";
  escalation_needed: boolean;
  keywords_detected: string[];
}

const URGENCY_PROMPT = `
Sen bir okul psikolojik danışmanı (PDR) asistanısın. 
Aşağıdaki zorbalık bildirimini analiz et ve JSON formatında yanıt ver.

BİLDİRİM:
{REPORT_TEXT}

ZORBALIK TİPİ: {BULLYING_TYPE}
YAŞANDIĞI YER: {LOCATION}
TEKRARLANMA: {FREQUENCY}

Şu metrikleri değerlendir ve SADECE JSON döndür, başka hiçbir şey yazma:

{
  "urgency_score": 0-100 arası tam sayı,
  "urgency_label": "Düşük" veya "Orta" veya "Yüksek" veya "Acil",
  "risk_factors": ["faktör1", "faktör2"],
  "recommended_action": "PDR için 1-2 cümle aksiyon önerisi",
  "emotional_state": "Mağdurun tahmini duygusal durumu",
  "intervention_timeline": "Hemen" veya "24 saat" veya "Bu hafta" veya "Planlı takip",
  "escalation_needed": true veya false,
  "keywords_detected": ["tespit edilen kritik kelimeler"]
}

Puanlama kriteri:
- 80-100: Fiziksel zarar, intihar ima, tehdit içeriyor
- 60-79: Yoğun duygusal zarar, tekrarlayan şiddet
- 40-59: Sosyal dışlanma, siber zorbalık
- 20-39: Sözlü taciz, tek seferlik
- 0-19: Belirsiz/hafif

JSON dışında kesinlikle hiçbir şey yazma.
`;

const FALLBACK: UrgencyResult = {
  urgency_score: 50,
  urgency_label: "Orta",
  risk_factors: ["Analiz tamamlanamadı"],
  recommended_action: "Manuel inceleme yapılması önerilir.",
  emotional_state: "Bilinmiyor",
  intervention_timeline: "Bu hafta",
  escalation_needed: false,
  keywords_detected: [],
};

export async function analyzeUrgency(
  reportText: string,
  bullyingType: string = "Bilinmiyor",
  location: string = "Bilinmiyor",
  frequency: string = "Bilinmiyor"
): Promise<UrgencyResult> {
  try {
    const { sanitizedText: sanitizedReportText } = sanitizeForLLM(reportText);
    const { sanitizedText: sanitizedLocation } = sanitizeForLLM(location);
    const prompt = URGENCY_PROMPT
      .replace("{REPORT_TEXT}", sanitizedReportText)
      .replace("{BULLYING_TYPE}", bullyingType)
      .replace("{LOCATION}", sanitizedLocation)
      .replace("{FREQUENCY}", frequency);

    const raw = await callGroq(prompt, { jsonMode: true });
    return safeParseJSON<UrgencyResult>(raw, FALLBACK);
  } catch (err) {
    console.error("analyzeUrgency failed, using fallback:", err);
    return FALLBACK;
  }
}
