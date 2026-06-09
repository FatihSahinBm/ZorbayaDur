import { callGemini, safeParseJSON } from "./geminiClient";

export interface ClassificationResult {
  primary_type: "Fiziksel" | "Sözlü" | "Sosyal/İlişkisel" | "Siber" | "Cinsel" | "Karma";
  secondary_types: string[];
  severity: "Hafif" | "Orta" | "Ağır" | "Çok Ağır";
  is_recurring: boolean;
  involves_group: boolean;
  platform_if_cyber: null | "WhatsApp" | "Instagram" | "TikTok" | "Oyun" | "Diğer";
  location_type: "Sınıf" | "Koridor" | "Teneffüs" | "Okul Dışı" | "Online" | "Karma";
  confidence_score: number;
}

const CLASSIFICATION_PROMPT = `
Aşağıdaki bildirimi analiz et. SADECE JSON döndür, başka hiçbir şey yazma.

METİN: {REPORT_TEXT}

{
  "primary_type": "Fiziksel" veya "Sözlü" veya "Sosyal/İlişkisel" veya "Siber" veya "Cinsel" veya "Karma",
  "secondary_types": [],
  "severity": "Hafif" veya "Orta" veya "Ağır" veya "Çok Ağır",
  "is_recurring": true veya false,
  "involves_group": true veya false,
  "platform_if_cyber": null veya "WhatsApp" veya "Instagram" veya "TikTok" veya "Oyun" veya "Diğer",
  "location_type": "Sınıf" veya "Koridor" veya "Teneffüs" veya "Okul Dışı" veya "Online" veya "Karma",
  "confidence_score": 0-100 arası tam sayı
}
`;

const FALLBACK: ClassificationResult = {
  primary_type: "Karma",
  secondary_types: [],
  severity: "Orta",
  is_recurring: false,
  involves_group: false,
  platform_if_cyber: null,
  location_type: "Karma",
  confidence_score: 50,
};

export async function classifyBullying(reportText: string): Promise<ClassificationResult> {
  try {
    const prompt = CLASSIFICATION_PROMPT.replace("{REPORT_TEXT}", reportText);
    const raw = await callGemini(prompt);
    return safeParseJSON<ClassificationResult>(raw, FALLBACK);
  } catch (err) {
    console.error("classifyBullying failed, using fallback:", err);
    return FALLBACK;
  }
}
