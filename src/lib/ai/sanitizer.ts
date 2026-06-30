export interface SanitizedOutput {
  sanitizedText: string;
  redactionMap: Record<string, string>;
}

export const COMMON_NAMES = [
  "ahmet", "mehmet", "ayşe", "ayse", "fatma", "ali", "veli", "elif", "zeynep", "merve", 
  "can", "cem", "deniz", "bora", "hakan", "kemal", "serkan", "murat", "seda", "burak", 
  "onur", "ayhan", "selin", "ece", "efe", "kaan", "kerem", "aslı", "asli", "buse", "melis",
  "ömer", "omer", "huseyin", "hüseyin", "hasan", "irem", "ceren", "dilan", "tarık", "tarik"
];

export const NON_NAME_WORDS = [
  "sonra", "dün", "bugün", "yarın", "rehberlik", "kantin", "okul", "sınıf", "öğretmen", 
  "hoca", "müdür", "çocuk", "öğrenci", "biz", "ben", "sen", "o", "bizim", "benim", "sizin", 
  "onların", "ama", "fakat", "lakin", "çünkü", "ve", "veya", "ise", "de", "da", "ki", 
  "her", "herkes", "kimse", "biri", "birisi", "hepsi", "hiçbiri", "hata", "durum", "ihbar", 
  "bildirim", "olay", "kategori", "tür", "aciliyet", "konum", "risk", "faktör", "zaman", "gün", 
  "sabah", "öğle", "akşam", "gece", "teneffüs", "hafta", "ay", "yıl"
];

const LOCATION_PATTERNS = [
  { pattern: /\b(?:kantin(?:in)?\s+(?:arkası|sırası|yanı|de)|kantinde)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" },
  { pattern: /\b(?:bahçe(?:nin)?\s+(?:arkası|köşesi|de)|arka\s+bahçe(?:de)?)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" },
  { pattern: /\b(?:tuvalet(?:ler)?(?:inde|de|in|e)?|kızlar\s+tuvaleti|erkekler\s+tuvaleti)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" },
  { pattern: /\b(?:kütüphane(?:nin)?\s+(?:arkası|de)|kütüphanede)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" },
  { pattern: /\b(?:spor\s+salonu(?:nda|de|nun|na)?)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" },
  { pattern: /\b(?:merdiven(?:ler)?(?:in\s+altı|lerinde|de|boşluğunda|e)?)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" },
  { pattern: /\b(?:soyunma\s+odası(?:nda|de)?)\b/gi, replacement: "[OKUL_İÇİ_KONUM]" }
];

export function sanitizeForLLM(rawText: string): SanitizedOutput {
  if (!rawText) return { sanitizedText: "", redactionMap: {} };

  const redactionMap: Record<string, string> = {};
  let sanitized = rawText;
  const indices: Record<string, number> = {};

  // Helper to register replacements
  const registerRedaction = (original: string, placeholderType: string): string => {
    const existing = Object.entries(redactionMap).find(([_, orig]) => orig.toLowerCase() === original.toLowerCase());
    if (existing) {
      return existing[0];
    }
    const idx = (indices[placeholderType] || 0) + 1;
    indices[placeholderType] = idx;
    const placeholder = `[${placeholderType}_${idx}]`;
    redactionMap[placeholder] = original;
    return placeholder;
  };

  // 1. Redact Name-Surname patterns (e.g. Ahmet Yılmaz, Ayşe Fatma Demir)
  const nameSurnameRegex = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)(?:\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+))+\b/g;
  sanitized = sanitized.replace(nameSurnameRegex, (match) => {
    const words = match.split(/\s+/);
    let nameStartIndex = 0;
    while (nameStartIndex < words.length && NON_NAME_WORDS.includes(words[nameStartIndex].toLowerCase())) {
      nameStartIndex++;
    }

    if (nameStartIndex >= words.length) {
      // All matched words are common non-name words, return as is
      return match;
    }

    const prefix = words.slice(0, nameStartIndex).join(" ");
    const namePart = words.slice(nameStartIndex).join(" ");

    // If only one word remains and it is not a capitalized name or is too short, avoid masking
    if (namePart.split(/\s+/).length < 2 && !COMMON_NAMES.includes(namePart.toLowerCase())) {
      return match;
    }

    const placeholder = registerRedaction(namePart, "İSİM");
    return prefix ? `${prefix} ${placeholder}` : placeholder;
  });

  // 2. Redact single common Turkish names (case-insensitive)
  COMMON_NAMES.forEach(name => {
    const singleNameRegex = new RegExp(`\\b${name}\\b`, "gi");
    sanitized = sanitized.replace(singleNameRegex, (match) => {
      return registerRedaction(match, "İSİM");
    });
  });

  // 3. Redact Classes (e.g., 8-A, 9/C, 10 B, 12-F, Hazırlık A)
  const classRegex = /\b\d{1,2}\s*[-\/]?\s*[A-ZÇĞİÖŞÜa-zçğıöşü]\b/gi;
  sanitized = sanitized.replace(classRegex, (match) => {
    return registerRedaction(match, "SINIF");
  });

  // 4. Redact Specific Locations
  LOCATION_PATTERNS.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  return {
    sanitizedText: sanitized,
    redactionMap
  };
}

export function restorePII(sanitizedText: string, originalContent: string): string {
  if (!sanitizedText || !originalContent) return sanitizedText;

  const { redactionMap } = sanitizeForLLM(originalContent);
  let restored = sanitizedText;

  Object.entries(redactionMap).forEach(([placeholder, original]) => {
    restored = restored.split(placeholder).join(original);
  });

  return restored;
}
