import { callGroq } from "./groqClient";
import { sanitizeForLLM } from "./sanitizer";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const sbAdmin = createClient<Database>(sbUrl, sbKey);

const ADAPTATION_PROMPT = `
Sen kısıtlı bir AI destek mesajı asistanısın. Görevin, okul PDR birimi tarafından onaylanmış bir BAZ ŞABLON metnini, verilen İHBAR ÖZETİ bağlamına göre çok hafifçe uyarlamaktır.

KAPSAM SINIRLAMALARI VE KURALLAR:
1. **Şablon Dışı İçerik Üretme:** Yeni tavsiyeler, yeni yönlendirmeler veya yeni kurallar ekleme.
2. **Kişisel Veri Eklememe:** İhbar sahibinin adını, sınıfını, spesifik yerini veya zamanını kesinlikle ekleme. Sadece zorbalık olayının genel doğasına (sözlü, siber, fiziksel, dışlama) değin.
3. **Yapısal Bütünlük:** Cümlelerin sırasını ve anlamını koru. Sadece akıcılık ve hafif kişiselleştirme (örn. "dijital ortamdaki bu mesajlar" gibi) yap.
4. **Çıktı Sınırı:** SADECE nihai mesaj metnini döndür. Başka hiçbir açıklama, "İşte uyarlanmış şablon:" gibi sunuş yazıları ekleme.

BAZ ŞABLON:
"{TEMPLATE_TEXT}"

İHBAR ÖZETİ:
"{REPORT_SUMMARY}"
`;

// Static fallback templates matching the database seeds exactly
export const STATIC_FALLBACK_TEMPLATES: Record<string, Record<string, string>> = {
  "Fiziksel Zorbalık": {
    "Hafif": "Yaşadığın bu fiziksel olayı paylaştığın için teşekkürler. Güvendesin ve yalnız değilsin. Okul yönetimi ve PDR birimi durumun tekrarlanmaması için yanındadır.",
    "Orta": "Yaşadığın bu incitici fiziksel davranışı ciddiye alıyoruz. Okul rehberlik servisimiz senin güvenliğini sağlamak için hemen harekete geçecektir.",
    "Ağır": "Sana yönelik bu kabul edilemez fiziksel müdahaleyi en üst düzeyde önemsiyoruz. Lütfen yalnız olmadığını ve okul yönetimi ile PDR servisinin seninle olduğunu unutma.",
    "Çok Ağır": "Fiziksel bütünlüğüne ve güvenliğine yönelik bu çok ağır durumu en hızlı şekilde çözmek için okul PDR birimi ve yönetimi acil destek planı başlatmıştır. Yanındayız."
  },
  "Sözel Zorbalık": {
    "Hafif": "Sana söylenen kırıcı sözleri bizimle paylaştığın için teşekkürler. Kimsenin seni incitmesine izin vermeyeceğiz. Rehberlik servisimiz seninle görüşecektir.",
    "Orta": "Sözel olarak maruz kaldığın bu kötü lakap ve ithamların seni üzmesini çok iyi anlıyoruz. Okul PDR birimi olarak bu akran baskısını çözmek için yanındayız.",
    "Ağır": "Maruz kaldığın bu ağır sözel hakaretler ve dışlama kabul edilemez. Güvenliğin ve psikososyal desteğin için rehberlik servisimiz en kısa sürede seninle olacaktır.",
    "Çok Ağır": "Sözel şiddetin en ağır boyutlarını içeren bu durum için okul rehberlik birimi ve disiplin komisyonu acil takibe geçmiştir. Yalnız değilsin."
  },
  "Siber Zorbalık": {
    "Hafif": "Sosyal medyada/dijital alanda seni üzen bu durumu paylaştığın için teşekkürler. Lütfen ekran görüntülerini sakla, okul rehberlik servisi sana destek olacaktır.",
    "Orta": "İnternet ortamında maruz kaldığın bu organize rahatsız edici mesajları ciddiye alıyoruz. PDR uzmanlarımız dijital güvenliğini koruman için sana rehberlik edecektir.",
    "Ağır": "Siber zorbalığın bu yıpratıcı ve ağır boyutlarını paylaştığın için teşekkürler. Okul yönetimi ve PDR servisi, ilgili kişiler hakkında yasal ve idari süreçleri başlatacaktır.",
    "Çok Ağır": "Dijital platformlarda maruz kaldığın bu çok ağır ve sistematik baskıya karşı PDR uzmanlarımız ve okul bilişim/yönetim ekibi acil engelleme ve destek adımları atmaktadır."
  },
  "Sosyal Zorbalık": {
    "Hafif": "Gruptan dışlanma veya yalnız bırakılma hissini bizimle paylaştığın için teşekkürler. PDR öğretmenlerimiz sınıf içi uyum etkinlikleri ile sana destek olacaktır.",
    "Orta": "Arkandan yayılan asılsız dedikoduların ve dışlanmanın seni ne kadar yorduğunun farkındayız. Rehberlik birimimiz bu akran dışlamasını çözmek için yanındadır.",
    "Ağır": "Sistematik ve organize bir şekilde yürütülen bu ağır akran dışlaması ve sosyal zorbalığı çözmek için rehberlik servisimiz sınıf düzeyinde müdahalelere başlayacaktır.",
    "Çok Ağır": "Gruptan tamamen tecrit edilmene yönelik bu çok ağır psikososyal baskı durumunda, okul PDR birimi ve sınıf rehber öğretmenleri senin için özel bir destek planı uygulamaktadır."
  },
  "Diğer": {
    "Hafif": "Yaşadığın ve seni rahatsız eden bu durumu bizimle paylaştığın için teşekkürler. Rehberlik öğretmenlerimiz en kısa sürede seninle görüşecektir.",
    "Orta": "Güvenliğini ve huzurunu bozan bu akran baskısı durumunu ciddiye alıyoruz. Okul PDR birimimiz durumun incelenmesi için seninle iletişime geçecektir.",
    "Ağır": "Seni derinden etkileyen bu ağır durumu paylaştığın için teşekkürler. Okul yönetimi ve rehberlik servisi tüm imkanlarıyla senin yanındadır.",
    "Çok Ağır": "Okuldaki güvenliğini doğrudan tehdit eden bu çok ağır durum için PDR uzmanlarımız ve okul yönetimi acil koruyucu ve destekleyici eylem planı başlatmıştır."
  }
};

// Sørensen-Dice Coefficient to measure semantic/lexical similarity
export function getSimilarityScore(str1: string, str2: string): number {
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    const clean = str.toLowerCase().replace(/[^a-z0-9ğışçöü]/g, "");
    for (let i = 0; i < clean.length - 1; i++) {
      bigrams.add(clean.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const s1 = getBigrams(str1);
  const s2 = getBigrams(str2);
  if (s1.size === 0 || s2.size === 0) return 0;
  
  let intersection = 0;
  s1.forEach(b => {
    if (s2.has(b)) intersection++;
  });
  
  return (2 * intersection) / (s1.size + s2.size);
}

export function getFallbackMessage(bullyingType: string, severity: string = "Orta"): string {
  // Normalize type
  let typeKey = "Diğer";
  if (bullyingType.includes("Fiziksel")) typeKey = "Fiziksel Zorbalık";
  else if (bullyingType.includes("Sözel")) typeKey = "Sözel Zorbalık";
  else if (bullyingType.includes("Siber")) typeKey = "Siber Zorbalık";
  else if (bullyingType.includes("Sosyal")) typeKey = "Sosyal Zorbalık";

  // Normalize severity
  let sevKey = severity;
  if (!["Hafif", "Orta", "Ağır", "Çok Ağır"].includes(severity)) {
    sevKey = "Orta";
  }

  const categoryTemplates = STATIC_FALLBACK_TEMPLATES[typeKey] || STATIC_FALLBACK_TEMPLATES["Diğer"];
  return categoryTemplates[sevKey] || categoryTemplates["Orta"];
}

function getDatabaseBullyingType(aiType: string): string {
  const type = (aiType || "").toLowerCase();
  if (type.includes("fiziksel")) return "Fiziksel Zorbalık";
  if (type.includes("sözel") || type.includes("sözlü")) return "Sözel Zorbalık";
  if (type.includes("siber")) return "Siber Zorbalık";
  if (type.includes("sosyal") || type.includes("ilişkisel")) return "Sosyal Zorbalık";
  return "Diğer";
}

export async function generateSupportMessage(
  bullyingType: string,
  severity: string,
  reportSummary: string
): Promise<string> {
  let templateText = "";
  
  try {
    const dbBullyingType = getDatabaseBullyingType(bullyingType);
    
    // 1. Fetch approved templates from database
    const { data: templates, error } = await sbAdmin
      .from("support_message_templates")
      .select("template_text")
      .eq("bullying_type", dbBullyingType)
      .eq("severity", severity)
      .eq("status", "onaylı");

    if (error || !templates || templates.length === 0) {
      // Fetch fallback Diğer category template if specific type has no template
      const { data: backupTemplates } = await sbAdmin
        .from("support_message_templates")
        .select("template_text")
        .eq("bullying_type", "Diğer")
        .eq("severity", severity)
        .eq("status", "onaylı");

      if (backupTemplates && backupTemplates.length > 0) {
        templateText = backupTemplates[0].template_text;
      } else {
        templateText = getFallbackMessage(dbBullyingType, severity);
      }
    } else {
      templateText = templates[0].template_text;
    }

    // 2. Sanitize user input report summary before processing
    const { sanitizedText } = sanitizeForLLM(reportSummary);

    // 3. Ask LLM to adapt the template text strictly
    const prompt = ADAPTATION_PROMPT
      .replace("{TEMPLATE_TEXT}", templateText)
      .replace("{REPORT_SUMMARY}", sanitizedText.slice(0, 300));

    const aiOutput = await callGroq(prompt, { temperature: 0.2 });
    const cleanOutput = aiOutput.trim().replace(/^"(.*)"$/, "$1"); // remove quotes

    // 4. Calculate similarity to verify no excessive deviations
    const score = getSimilarityScore(templateText, cleanOutput);
    console.log(`Support Message Similarity Score: ${score.toFixed(2)}`);

    // If similarity score drops below 0.70 (30% deviation), default to raw template
    if (score < 0.70) {
      console.warn("Semantic deviation threshold crossed. Defaulting to raw approved template.");
      return templateText;
    }

    return cleanOutput;
  } catch (err) {
    console.error("generateSupportMessage failed, returning raw approved template:", err);
    return templateText || getFallbackMessage(bullyingType, severity);
  }
}
