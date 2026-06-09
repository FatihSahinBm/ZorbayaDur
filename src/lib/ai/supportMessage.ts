import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SUPPORT_PROMPT = `
Zorbalık bildirimi gönderen bir öğrenciye kısa, sıcak, destekleyici bir mesaj yaz.
Türkçe, samimi, 18 yaş altı için uygun.
Max 3 cümle. Klişe "güçlü ol" gibi ifadeler KULLANMA.
Bildirimin tipi: {BULLYING_TYPE}
Bildirimin içeriği (özet): {REPORT_SUMMARY}
Sadece mesajı yaz, başka hiçbir şey ekleme.
`;

export async function generateSupportMessage(
  bullyingType: string,
  reportSummary: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { temperature: 0.7 },
  });

  const prompt = SUPPORT_PROMPT
    .replace("{BULLYING_TYPE}", bullyingType)
    .replace("{REPORT_SUMMARY}", reportSummary.slice(0, 300));

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("generateSupportMessage failed, using fallback:", err);
    return "Bildirimin için teşekkürler. PDR uzmanın en kısa sürede seninle ilgilenecek. Yalnız değilsin.";
  }
}
