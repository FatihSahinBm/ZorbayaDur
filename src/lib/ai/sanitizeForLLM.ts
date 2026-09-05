/**
 * MEB Bilgi İşlem Genel Müdürlüğü Teknik Fizibilite Raporu (Madde 5 & 6)
 * ve Resmi Başvuru Paketi Uyumlu PII (Kişisel Veri) Maskeleme Modülü.
 * 
 * Yapay Zekâya (LLM/Groq) gönderilmeden önce metindeki tüm kimlik, sınıf,
 * okul numarası, telefon ve özel isimleri sırasıyla arındırır.
 */

export interface SanitizeResult {
  sanitizedText: string;
  maskedCount: number;
  redactionMap: Record<string, string>;
}

// Sık kullanılan Türkçe ilk isimler
export const COMMON_TURKISH_NAMES = [
  "ahmet", "mehmet", "mustafa", "ali", "veli", "can", "cem", "efe", "kaan", "kerem",
  "ömer", "omer", "hakan", "murat", "burak", "onur", "serkan", "kemal", "bora", "hasan",
  "hüseyin", "huseyin", "tarık", "tarik", "ayhan", "barış", "baris", "emre", "mert", "arda",
  "ayşe", "ayse", "fatma", "elif", "zeynep", "merve", "selin", "ece", "aslı", "asli",
  "buse", "melis", "irem", "ceren", "dilan", "seda", "gamze", "özge", "ozge", "tuğba", "tugba"
];

// İsim olmayan ancak büyük harfle başlayabilen veya bağlaç olan yaygın kelimeler
const NON_NAME_WORDS = new Set([
  "sonra", "dün", "bugün", "yarın", "rehberlik", "kantin", "okul", "sınıf", "öğretmen",
  "hoca", "müdür", "çocuk", "öğrenci", "biz", "ben", "sen", "o", "bizim", "benim", "sizin",
  "onların", "ama", "fakat", "lakin", "çünkü", "ve", "veya", "ise", "de", "da", "ki",
  "her", "herkes", "kimse", "biri", "birisi", "hepsi", "hiçbiri", "hata", "durum", "ihbar",
  "bildirim", "olay", "kategori", "tür", "aciliyet", "konum", "risk", "zaman", "gün",
  "sabah", "öğle", "akşam", "gece", "teneffüs", "hafta", "ay", "yıl", "orada", "burada",
  "şurada", "içeri", "dışarı", "sıra", "sırasında", "yanında", "arkasında", "önünde"
]);

export function sanitizeForLLM(rawText: string): SanitizeResult {
  if (!rawText || typeof rawText !== "string") {
    return { sanitizedText: "", maskedCount: 0, redactionMap: {} };
  }

  let text = rawText;
  let maskedCount = 0;
  const redactionMap: Record<string, string> = {};

  const studentNameMap = new Map<string, string>();
  let studentCounter = 0;

  // 1. İLETİŞİM BİLGİSİ: Telefon Numaraları ve E-posta Adresleri
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  text = text.replace(emailRegex, (match) => {
    maskedCount++;
    const placeholder = "[İLETİŞİM BİLGİSİ]";
    redactionMap[placeholder] = match;
    return placeholder;
  });

  const phoneRegex = /\b(?:\+?90\s*|0)?\s*[5]\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g;
  text = text.replace(phoneRegex, (match) => {
    maskedCount++;
    const placeholder = "[İLETİŞİM BİLGİSİ]";
    redactionMap[placeholder] = match;
    return placeholder;
  });

  // 2. SINIF / ŞUBE BİLGİSİ (Örn: 10-B, 9/A, 11 A, 12-C sınıfı, 8-A şubesi)
  const classPattern = /\b(?:1[0-2]|[1-9])\s*[-\/.]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])(?:\s*(?:sınıfı|şubesi))?\b/gi;
  text = text.replace(classPattern, (match) => {
    maskedCount++;
    const placeholder = "[SINIF]";
    redactionMap[placeholder] = match;
    return placeholder;
  });

  // 3. OKUL NUMARASI: 3 ila 4 haneli tek başına duran sayılar (Örn: 1453, 204, No: 1234)
  const schoolNoPattern = /(?<=\b(?:no[:\s]*|numara[:\s]*|öğrenci\s*no[:\s]*)?)\b\d{3,4}\b/gi;
  text = text.replace(schoolNoPattern, (match) => {
    maskedCount++;
    const placeholder = "[OKUL NO]";
    redactionMap[placeholder] = match;
    return placeholder;
  });

  // 4. ÖĞRETMEN İSİMLERİ (Örn: "Ayşe hoca", "Ali bey", "Ahmet öğretmen", "Merve Hanım")
  const teacherPattern = /\b([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s+(?:hoca(?:m|ya|dan|yı)?|öğretmen(?:im|e|den|i)?|bey(?:e|den|i)?|hanım(?:a|dan|ı)?)\b/gi;
  text = text.replace(teacherPattern, (match, name) => {
    if (!NON_NAME_WORDS.has(name.toLowerCase())) {
      maskedCount++;
      const placeholder = "[ÖĞRETMEN]";
      redactionMap[placeholder] = match;
      return placeholder;
    }
    return match;
  });

  // 5. ÖĞRENCİ İSİMLERİ (Sıralı: [ÖĞRENCİ 1], [ÖĞRENCİ 2]...)
  // 5a. İki kelimelik Ad-Soyad kalıpları (Örn: "Ahmet Yılmaz", "Caner Demir")
  const fullNamePattern = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\b/g;
  text = text.replace(fullNamePattern, (match, firstName, lastName) => {
    const fLower = firstName.toLowerCase();
    const lLower = lastName.toLowerCase();
    if (NON_NAME_WORDS.has(fLower) || NON_NAME_WORDS.has(lLower)) {
      return match;
    }
    if (COMMON_TURKISH_NAMES.includes(fLower) || firstName.length >= 3) {
      maskedCount++;
      const key = match.toLowerCase();
      if (!studentNameMap.has(key)) {
        studentCounter++;
        studentNameMap.set(key, `[ÖĞRENCİ ${studentCounter}]`);
      }
      const placeholder = studentNameMap.get(key)!;
      redactionMap[placeholder] = match;
      return placeholder;
    }
    return match;
  });

  // 5b. Tekil İsimler ve Ek Alan İsimler (Örn: "Ahmet ve Mehmet", "Ali beni itti", "Ayşe'ye")
  COMMON_TURKISH_NAMES.forEach((name) => {
    const singleNameRegex = new RegExp(`\\b(${name})(?:'?(?:ye|ya|e|a|in|ın|un|ün|nin|nın|nun|nün|yi|yı|yu|yü|i|ı|u|ü|le|la|den|dan))?\\b`, "gi");
    text = text.replace(singleNameRegex, (fullMatch, baseName) => {
      const key = baseName.toLowerCase();
      if (!studentNameMap.has(key)) {
        studentCounter++;
        studentNameMap.set(key, `[ÖĞRENCİ ${studentCounter}]`);
      }
      maskedCount++;
      const placeholder = studentNameMap.get(key)!;
      redactionMap[placeholder] = fullMatch;
      return placeholder;
    });
  });

  return {
    sanitizedText: text,
    maskedCount,
    redactionMap
  };
}

export function restorePII(sanitizedText: string, redactionMap: Record<string, string>): string {
  if (!sanitizedText || !redactionMap) return sanitizedText;
  let restored = sanitizedText;
  for (const [placeholder, original] of Object.entries(redactionMap)) {
    restored = restored.split(placeholder).join(original);
  }
  return restored;
}
