import { describe, it, expect } from "vitest";
import { STATIC_FALLBACK_TEMPLATES, getFallbackMessage, getSimilarityScore } from "../../lib/ai/supportMessage";

describe("Support Message Templates & Safekeeping tests", () => {
  const BULLYING_TYPES = [
    "Fiziksel Zorbalık",
    "Sözel Zorbalık",
    "Siber Zorbalık",
    "Sosyal Zorbalık",
    "Diğer"
  ];

  const SEVERITY_LEVELS = [
    "Hafif",
    "Orta",
    "Ağır",
    "Çok Ağır"
  ];

  describe("Seeded Fallback Template Coverage Check", () => {
    it("should ensure a fallback template exists for every combination of type and severity", () => {
      BULLYING_TYPES.forEach(type => {
        const typeTemplates = STATIC_FALLBACK_TEMPLATES[type];
        expect(typeTemplates, `Static fallback templates should contain category: ${type}`).toBeDefined();

        SEVERITY_LEVELS.forEach(severity => {
          const text = typeTemplates[severity];
          expect(text, `Static template text should be defined for type "${type}" and severity "${severity}"`).toBeDefined();
          expect(text.length, `Template text for type "${type}" and severity "${severity}" should not be empty`).toBeGreaterThan(10);
        });
      });
    });

    it("should ensure getFallbackMessage matches seed structure correctly", () => {
      BULLYING_TYPES.forEach(type => {
        SEVERITY_LEVELS.forEach(severity => {
          const res = getFallbackMessage(type, severity);
          expect(res).toBeDefined();
          expect(res.length).toBeGreaterThan(10);
        });
      });
    });
  });

  describe("Dice Similarity Coefficient Logic tests", () => {
    it("should compute high similarity (>= 0.70) for lightly adapted templates", () => {
      const template = "Yaşadığın bu fiziksel olayı paylaştığın için teşekkürler. Güvendesin ve yalnız değilsin.";
      const adapted = "Yaşadığın bu fiziksel akran zorbalığı olayını bizimle paylaştığın için çok teşekkürler. Tamamen güvendesin ve yalnız değilsin.";
      
      const score = getSimilarityScore(template, adapted);
      expect(score).toBeGreaterThanOrEqual(0.70);
    });

    it("should compute low similarity (< 0.70) for heavily deviated or hallucinated texts", () => {
      const template = "Yaşadığın bu fiziksel olayı paylaştığın için teşekkürler. Güvendesin ve yalnız değilsin.";
      const hallucinated = "Selam! Okulda kavga etmen çok kötü. Lütfen hemen polise haber ver ve okuldan kaç.";
      
      const score = getSimilarityScore(template, hallucinated);
      expect(score).toBeLessThan(0.70);
    });
  });
});
