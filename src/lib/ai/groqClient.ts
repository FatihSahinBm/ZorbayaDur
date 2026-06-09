export interface CallGroqOptions {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callGroq(
  prompt: string,
  options: CallGroqOptions = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY tanımlı değil. Lütfen .env veya .env.local dosyasını kontrol edin.");
    throw new Error("GROQ_API_KEY eksik.");
  }

  const model = options.model || "llama-3.1-8b-instant";
  const temperature = options.temperature ?? 0.2;
  const jsonMode = options.jsonMode ?? false;

  const payload: any = {
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: temperature,
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Groq API hatası (Durum: ${response.status}): ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      return text;
    } catch (err: any) {
      attempt++;
      console.warn(`Groq API denemesi ${attempt} başarısız oldu: ${err.message}`);
      if (attempt >= maxRetries) throw err;
      // Üstel geri çekilme (exponential backoff)
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error("Groq API maksimum yeniden deneme sayısına ulaştı.");
}

export function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    // Eğer yanıt markdown kod blokları içindeyse temizle
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
