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
  "risk_factors": ["tespit edilen risk faktörleri"],
  "recommended_action": "PDR için 1-2 cümle aksiyon önerisi",
  "emotional_state": "Mağdurun tahmini duygusal durumu",
  "intervention_timeline": "Hemen" veya "24 saat" veya "Bu hafta" veya "Planlı takip",
  "escalation_needed": true veya false,
  "keywords_detected": ["yalnızca BİLDİRİM metninde BİREBİR geçen, aciliyet teşkil eden kritik kelimeler. Metinde geçmeyen hiçbir kelimeyi buraya yazmayın."]
}

Puanlama kriteri ve kuralları:
- 80-100 (Kritik/Acil): Sadece doğrudan ağır fiziksel şiddet (darp, dayak, yaralama), kesici/delici/ateşli alet kullanımı veya tehdidi, ya da intihar/kendine zarar verme eğilimi/iması içeren çok kritik vakalar.
- 60-79 (Yüksek): Tekrarlayan fiziksel sıkıştırma/taciz (fiziki darp içermeyen), haraç kesme (zorla para/oyun parası/eşya alma), sürekli akran zorbalığı veya şantaj.
- 40-59 (Orta): Siber zorbalık (WhatsApp/Telegram/Sosyal medyada ifşa, alay, grup dışı bırakma), okulda sosyal dışlanma, dedikodu yayma, sıraya çöp atma gibi dolaylı baskılar veya sürekli yazılı taciz notları.
- 20-39 (Düşük): Tek seferlik alay etme, lakap takma, kitap fırlatma, yerinden etme gibi hafif/fiziki darp içermeyen münferit sataşmalar.
- 0-19 (Belirsiz): Net olmayan veya çok hafif içerikli bildirimler.

ÖNEMLİ KURALLAR:
1. İçinde darp (dayak), alet kullanımı, ölüm tehdidi veya kendine zarar verme geçmeyen sıradan ifşa, alay, dışlama, sataşma veya eşya fırlatma gibi vakalara KESİNLİKLE 60 veya üzeri puan VERMEYİN. Bunları 20-59 aralığında sınıflandırın.
2. Ağır bir darp, gasp veya ölüm tehdidi olmadığı sürece haraç kesme, köşeye sıkıştırma gibi yüksek riskli ama aletsiz vakalara 80 veya üzeri puan VERMEYİN. Bunları 60-75 aralığında sınıflandırın.
3. Her vakaya ezbere 75 puan VERMEYİN. Gerçek derecesini yukarıdaki kriterlere göre (Düşük için 20-39, Orta için 40-59, Yüksek için 60-79) hassas bir şekilde yansıtın.

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
