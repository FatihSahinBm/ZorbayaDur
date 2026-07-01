import { callGroq, safeParseJSON } from "./groqClient";
import { sanitizeForLLM } from "./sanitizer";

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
Aşağıdaki akran zorbalığı bildirimini analiz et ve uygun kategoriye sınıflandır. SADECE geçerli bir JSON objesi döndür, başka hiçbir açıklama veya metin ekleme.

METİN: {REPORT_TEXT}

Kategoriler ve Kurallar:
- "Fiziksel": Vurma, itme, tekme atma, dövme, haraç kesme (zorla para veya eşya alma), tuvalette/köşede sıkıştırma, fiziksel zarar veya aletle/silahla yaralama/tehdit gibi fiziksel temas veya doğrudan fiziksel tehdit içeren vakalar.
- "Sözlü": Lakap takma, alay etme, hakaret, küfür, rencide edici sözler söyleme gibi sözlü tacizler (Fiziksel temas ve dijital ortamda yapılmamış olması gerekir).
- "Sosyal/İlişkisel": Gruptan dışlama, yalnız bırakma, arkadan dedikodu yayma, görmezden gelme, organize akran baskısı kurma gibi ilişkisel zararlar (Dijital ortamda yapılmamış olması gerekir).
- "Siber": Dijital ortamda (WhatsApp, Instagram, TikTok, Discord, oyun sohbetleri, SMS vb.) gerçekleşen her türlü zorbalık. İnternette dedikodu yapılması veya gruptan atılma gibi ilişkisel durumlar da dahil olmak üzere, eğer olay dijital bir platformda geçiyorsa birincil tür MUTLAKA "Siber" olmalıdır.
- "Cinsel": Cinsel içerikli hakaret, taciz edici cinsel sözler söyleme, cinsel şantaj veya cinsel amaçlı istenmeyen davranışlar.
- "Karma": Yukarıdaki zorbalık türlerinden birden fazlasının (örneğin hem siber grupta başlayıp hem okulda fiziksel darba dönüşen durumlar gibi) eşit derecede ağırlıklı olarak yaşanması.

SADECE aşağıdaki JSON şemasına uygun yanıt ver:
{
  "primary_type": "Fiziksel" | "Sözlü" | "Sosyal/İlişkisel" | "Siber" | "Cinsel" | "Karma",
  "secondary_types": ("Fiziksel" | "Sözlü" | "Sosyal/İlişkisel" | "Siber" | "Cinsel" | "Karma")[],
  "severity": "Hafif" | "Orta" | "Ağır" | "Çok Ağır",
  "is_recurring": true | false,
  "involves_group": true | false,
  "platform_if_cyber": null | "WhatsApp" | "Instagram" | "TikTok" | "Oyun" | "Diğer",
  "location_type": "Sınıf" | "Koridor" | "Teneffüs" | "Okul Dışı" | "Online" | "Karma",
  "confidence_score": 0-100 arası sayı
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
    const { sanitizedText } = sanitizeForLLM(reportText);
    const prompt = CLASSIFICATION_PROMPT.replace("{REPORT_TEXT}", sanitizedText);
    const raw = await callGroq(prompt, { jsonMode: true });
    const parsed = safeParseJSON<ClassificationResult>(raw, FALLBACK);
    
    // Post-processing: normalize primary type values
    let primary = parsed.primary_type as string;
    
    // Enforce "Siber" if digital indicators are present in parsed JSON or text
    const digitalKeywords = ["whatsapp", "instagram", "tiktok", "discord", "telegram", "sms", "internet", "sosyal medya", "itiraf", "online", "web", "mesaj", "şifre", "e-okul"];
    const lowerText = reportText.toLowerCase();
    
    if (parsed.platform_if_cyber || parsed.location_type === "Online" || digitalKeywords.some(kw => lowerText.includes(kw))) {
      primary = "Siber";
      parsed.location_type = "Online";
      if (!parsed.platform_if_cyber) {
        if (lowerText.includes("whatsapp")) parsed.platform_if_cyber = "WhatsApp";
        else if (lowerText.includes("instagram")) parsed.platform_if_cyber = "Instagram";
        else if (lowerText.includes("tiktok")) parsed.platform_if_cyber = "TikTok";
        else parsed.platform_if_cyber = "Diğer";
      }
    }
    
    // Normalize spelling/variations of verbal bullying
    if (primary === "Sözel") {
      primary = "Sözlü";
    }
    
    parsed.primary_type = primary as ClassificationResult["primary_type"];
    
    // Clean up secondary_types to ensure only valid categories
    const validCategories = ["Fiziksel", "Sözlü", "Sosyal/İlişkisel", "Siber", "Cinsel", "Karma"];
    if (parsed.secondary_types && Array.isArray(parsed.secondary_types)) {
      parsed.secondary_types = parsed.secondary_types
        .map(t => {
          let s = String(t).trim();
          if (s === "Sözel") return "Sözlü";
          return s;
        })
        .filter(t => validCategories.includes(t));
    } else {
      parsed.secondary_types = [];
    }

    return parsed;
  } catch (err) {
    console.error("classifyBullying failed, using fallback:", err);
    return FALLBACK;
  }
}
