import { describe, it, expect, vi } from "vitest";

// We mock the database models and test similarity calculation
function getSimilarity(s1: string, s2: string): number {
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    const normalized = str.toLowerCase().replace(/\s+/g, "");
    for (let i = 0; i < normalized.length - 1; i++) {
      bigrams.add(normalized.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const bigram of b1) {
    if (b2.has(bigram)) intersection++;
  }
  
  const total = b1.size + b2.size;
  if (total === 0) return 0;
  return (2 * intersection) / total;
}

describe("Spam vs Recurring Incident Detection Logic", () => {
  it("should calculate high similarity for identical/near-identical strings", () => {
    const s1 = "fatihe hakaret ediyorlar sürekli ve hareketler giderek artıyor";
    const s2 = "Fatihe hakaret ediyorlar sürekli ve hareketler giderek artıyor. ";
    const sim = getSimilarity(s1, s2);
    expect(sim).toBeGreaterThanOrEqual(0.85);
  });

  it("should calculate low similarity for different strings", () => {
    const s1 = "fatihe hakaret ediyorlar sürekli ve hareketler giderek artıyor";
    const s2 = "okul kütüphanesinde kitabımı zorla alıp yırtmaya çalıştı.";
    const sim = getSimilarity(s1, s2);
    expect(sim).toBeLessThan(0.5);
  });

  it("should classify duplicate report as spam if same session or time difference <= 10 mins", () => {
    const currentReport = { session_token: "token-A", created_at: "2026-06-30T12:00:00.000Z" };
    const prevReport = { session_token: "token-A", created_at: "2026-06-30T12:02:00.000Z", content: "fatihe hakaret ediyorlar" };
    
    // Simulate our Route Handler logic
    const currentSession = currentReport.session_token;
    const prevSession = prevReport.session_token;
    const timeDiffMins = Math.abs(new Date(prevReport.created_at).getTime() - new Date(currentReport.created_at).getTime()) / (1000 * 60);

    const isSpam = currentSession === prevSession || timeDiffMins <= 10;
    expect(isSpam).toBe(true);
  });

  it("should classify duplicate report as recurring if different session and time difference > 10 mins", () => {
    const currentReport = { session_token: "token-A", created_at: "2026-06-30T12:30:00.000Z" };
    const prevReport = { session_token: "token-B", created_at: "2026-06-30T12:00:00.000Z", content: "fatihe hakaret ediyorlar" };
    
    const currentSession = currentReport.session_token;
    const prevSession = prevReport.session_token;
    const timeDiffMins = Math.abs(new Date(prevReport.created_at).getTime() - new Date(currentReport.created_at).getTime()) / (1000 * 60);

    const isSpam = currentSession === prevSession || timeDiffMins <= 10;
    const isRecurring = !isSpam && getSimilarity(prevReport.content, "fatihe hakaret ediyorlar") >= 0.85;

    expect(isSpam).toBe(false);
    expect(isRecurring).toBe(true);
  });
});
