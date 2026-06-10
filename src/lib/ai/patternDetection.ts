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
Sen profesyonel bir Okul Psikolojik Danışmanı (PDR) veri analizi asistanısın. Görevin, son 30 güne ait anonim bildirim özetlerini inceleyerek okul genelindeki akran zorbalığı örüntülerini, eğilimlerini ve sistemik riskleri derinlemesine analiz etmektir. 

Metinleri dikkatlice oku, birbirleriyle olan bağlantıları, lokasyonları ve tekrarlayan temaları ortaya çıkar.

BİLDİRİMLER:
{REPORTS_SUMMARY}

Aşağıdaki JSON yapısını tam olarak doldur ve SADECE geçerli bir JSON objesi döndür. Açıklama veya ek metin ekleme. JSON içindeki metinler oldukça detaylı, kurumsal ve profesyonel bir dille yazılmalıdır.

{
  "patterns_found": true veya false (Eğer benzer konumlarda, benzer kişiler arasında veya benzer davranışlarda 2 veya daha fazla eşleşme/eğilim varsa true yap),
  "hotspot_locations": ["Olayların en sık yaşandığı spesifik konumlar, sınıflar veya alanlar. Örn: 'A Blok 3. Kat Koridoru', 'Kantin Arkasındaki Bahçe Alanı'. Oldukça spesifik olmalıdır."],
  "recurring_behavior_types": ["Tekrar eden spesifik zorbalık ve taciz davranış türleri. Örn: 'Sosyal dışlama ve akran baskısı', 'Siber ortamda grupça lakap takma ve alay etme', 'Fiziksel hırpalama ve eşyalara zarar verme'"],
  "victim_cluster": true veya false (Belirli bir mağdura veya mağdur grubuna yönelik sistematik/tekrarlayan bir odaklanma tespit edildi mi?),
  "perpetrator_cluster": true veya false (Aynı failin veya akran grubunun birden fazla olayın arkasında olduğuna dair bulgular var mı?),
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

export async function detectPatterns(reportsSummary: string): Promise<PatternResult> {
  const prompt = PATTERN_PROMPT.replace("{REPORTS_SUMMARY}", reportsSummary);
  const raw = await callGroq(prompt, { model: "llama-3.1-8b-instant", jsonMode: true });
  return safeParseJSON<PatternResult>(raw, FALLBACK);
}
