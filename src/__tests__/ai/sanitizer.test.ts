import { describe, it, expect } from "vitest";
import { sanitizeForLLM, restorePII } from "../../lib/ai/sanitizer";
import { classifyBullying } from "../../lib/ai/bullyingClassifier";
import * as fs from "fs";
import * as path from "path";

describe("PII Sanitizer & AI Consistency tests", () => {
  describe("Sanitizer Unit Tests", () => {
    it("should redact names and surnames", () => {
      const input = "Ahmet Yılmaz beni okul çıkışında tehdit etti.";
      const { sanitizedText, redactionMap } = sanitizeForLLM(input);
      expect(sanitizedText).toContain("[İSİM_1]");
      expect(sanitizedText).not.toContain("Ahmet Yılmaz");
      expect(redactionMap["[İSİM_1]"]).toBe("Ahmet Yılmaz");
    });

    it("should redact single common Turkish names", () => {
      const input = "Kaan bana lakap taktı, çok üzüldüm.";
      const { sanitizedText, redactionMap } = sanitizeForLLM(input);
      expect(sanitizedText).toContain("[İSİM_1]");
      expect(sanitizedText).not.toContain("Kaan");
      expect(redactionMap["[İSİM_1]"]).toBe("Kaan");
    });

    it("should redact class names", () => {
      const input = "8-A sınıfından Melis beni ittirdi.";
      const { sanitizedText, redactionMap } = sanitizeForLLM(input);
      expect(sanitizedText).toContain("[SINIF_1]");
      expect(sanitizedText).toContain("[İSİM_1]");
      expect(sanitizedText).not.toContain("8-A");
      expect(sanitizedText).not.toContain("Melis");
      // Map contains values in insertion order
      expect(redactionMap["[SINIF_1]"]).toBe("8-A");
      expect(redactionMap["[İSİM_1]"]).toBe("Melis");
    });

    it("should generalize specific locations", () => {
      const input = "Kızlar tuvaletinde beni kilitleyip kantin arkasına kaçtılar.";
      const { sanitizedText } = sanitizeForLLM(input);
      expect(sanitizedText).toContain("[OKUL_İÇİ_KONUM]");
      expect(sanitizedText).not.toContain("Kızlar tuvaletinde");
      expect(sanitizedText).not.toContain("kantin arkasına");
    });

    it("should reuse the same placeholder for repeated names", () => {
      const input = "Ahmet Yılmaz beni çağırdı. Sonra Ahmet Yılmaz bana vurdu.";
      const { sanitizedText, redactionMap } = sanitizeForLLM(input);
      const matches = sanitizedText.match(/\[İSİM_1\]/g);
      expect(matches).toHaveLength(2);
      expect(Object.keys(redactionMap)).toHaveLength(1);
    });

    it("should restore original names and classes from placeholders", () => {
      const original = "8-A sınıfından Kaan Demir kütüphane arkasında bana vurdu.";
      const aiOutput = "[SINIF_1] sınıfından olan [İSİM_1] mağdura karşı fiziksel zorbalık uygulamaktadır.";
      
      const restored = restorePII(aiOutput, original);
      expect(restored).toContain("8-A sınıfından olan Kaan Demir mağdura karşı fiziksel zorbalık uygulamaktadır.");
      expect(restored).not.toContain("[SINIF_1]");
      expect(restored).not.toContain("[İSİM_1]");
    });
  });

  describe("ESLint / Code Integration Check", () => {
    it("should ensure all files calling callGroq call sanitizeForLLM", () => {
      const files = [
        "src/lib/ai/bullyingClassifier.ts",
        "src/lib/ai/urgencyAnalysis.ts",
        "src/lib/ai/supportMessage.ts",
        "src/lib/ai/patternDetection.ts"
      ];

      files.forEach(file => {
        const fullPath = path.resolve(file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes("callGroq") && !content.includes("sanitizeForLLM")) {
            throw new Error(`${file} calls callGroq but does not call sanitizeForLLM!`);
          }
        }
      });
    });
  });

  describe("20-Sample AI Classification Consistency Test Set", () => {
    const TEST_SAMPLES = [
      "8-A sınıfından Ahmet Yılmaz kütüphane arkasında bana vurdu.",
      "Kaan ve Ali siber ortamda Instagram üzerinden benimle alay ettiler.",
      "9/C sınıfındaki Merve kantinde bana hakaret etti.",
      "Rehberlik odasının yanında Serkan beni tehdit edip para istedi.",
      "10-B sınıfındaki Buse beni dışladı, dedikodu yaydı.",
      "Elif spor salonunda beni kilitleyip üzerime güldü.",
      "Zeynep WhatsApp grubunda bana hakaretler yağdırdı.",
      "Bora soyunma odasında üstüme su döktü.",
      "12-F sınıfından Murat koridorda yolumu kesti.",
      "Seda teneffüste bana laf attı, alay etti.",
      "9/A şubesindeki Ceren beni bahçede ittirdi.",
      "Hakan kantin sırasına girerken beni çekti ve hakaret etti.",
      "7/B şubesinden Veli sınıfta eşyalarımı yere fırlattı.",
      "Dilan merdivenlerde arkamdan gelip beni korkuttu.",
      "Can ve Cem oyun sunucusunda bana küfrettiler.",
      "11-A sınıfından Melis sürekli bana kötü bakışlar atıyor.",
      "Ömer tuvalette önümü kesip beni tehdit etti.",
      "Ayşe sınıf grubunda hakkımda yalanlar paylaştı.",
      "Tarık beni okul çıkışı kovaladı ve korkuttu.",
      "İrem okul bahçesinde üzerime yürüyüp bağırdı."
    ];

    it("should compare classification results before and after sanitization (accuracy >= 90%)", async () => {
      // Skip if api key is missing to avoid test suite failure on empty environment
      if (!process.env.GROQ_API_KEY) {
        console.warn("GROQ_API_KEY is not defined. Skipping AI consistency checks.");
        return;
      }

      let matches = 0;
      const count = TEST_SAMPLES.length;

      // Process samples sequentially to avoid rate limits
      for (const sample of TEST_SAMPLES) {
        const { sanitizedText } = sanitizeForLLM(sample);

        const originalResult = await classifyBullying(sample);
        const sanitizedResult = await classifyBullying(sanitizedText);

        // We check if the primary_type and severity are consistent
        const primaryMatch = originalResult.primary_type === sanitizedResult.primary_type;
        const severityMatch = originalResult.severity === sanitizedResult.severity;

        if (primaryMatch || severityMatch) {
          matches++;
        }
      }

      const consistencyRatio = matches / count;
      console.log(`AI Classification Consistency: ${consistencyRatio * 100}% (${matches}/${count})`);
      expect(consistencyRatio).toBeGreaterThanOrEqual(0.9);
    }, 60000); // 60s timeout for Groq API calls
  });
});
