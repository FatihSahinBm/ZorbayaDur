import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function callGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text;
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error("Gemini API maksimum yeniden deneme sayısına ulaştı.");
}

export function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    // JSON code block içine alınmışsa temizle
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
