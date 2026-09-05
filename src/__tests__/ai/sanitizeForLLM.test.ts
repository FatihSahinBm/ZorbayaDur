import { describe, it, expect } from "vitest";
import { sanitizeForLLM, restorePII } from "../../lib/ai/sanitizeForLLM";

describe("sanitizeForLLM - MEB PII Masking Unit Tests", () => {
  it("should mask class patterns like 10-B, 9/A, 11 A, 12-C sınıfı to [SINIF]", () => {
    const input1 = "10-B sınıfındaki çocuklar beni rahatsız etti.";
    const res1 = sanitizeForLLM(input1);
    expect(res1.sanitizedText).toContain("[SINIF]");
    expect(res1.sanitizedText).not.toContain("10-B");

    const input2 = "9/A şubesinde ve 11 A dersinde dalga geçtiler.";
    const res2 = sanitizeForLLM(input2);
    expect(res2.sanitizedText).toContain("[SINIF]");
    expect(res2.sanitizedText).not.toContain("9/A");
    expect(res2.sanitizedText).not.toContain("11 A");
  });

  it("should mask student names sequentially to [ÖĞRENCİ 1] and [ÖĞRENCİ 2]", () => {
    const input = "10-B sınıfındaki Ahmet ve Mehmet beni kantin sırasında itekledi";
    const res = sanitizeForLLM(input);
    expect(res.sanitizedText).toContain("[SINIF]");
    expect(res.sanitizedText).toContain("[ÖĞRENCİ 1]");
    expect(res.sanitizedText).toContain("[ÖĞRENCİ 2]");
    expect(res.sanitizedText).not.toContain("Ahmet");
    expect(res.sanitizedText).not.toContain("Mehmet");
  });

  it("should mask teacher names to [ÖĞRETMEN]", () => {
    const input = "Ayşe hoca beni gördü ama bir şey demedi. Ali bey de oradaydı.";
    const res = sanitizeForLLM(input);
    expect(res.sanitizedText).toContain("[ÖĞRETMEN]");
    expect(res.sanitizedText).not.toContain("Ayşe hoca");
    expect(res.sanitizedText).not.toContain("Ali bey");
  });

  it("should mask school numbers and contact info", () => {
    const input = "Okul numaram 1453 beni 05321234567 veya veli@gmail.com adresinden arayın.";
    const res = sanitizeForLLM(input);
    expect(res.sanitizedText).toContain("[OKUL NO]");
    expect(res.sanitizedText).toContain("[İLETİŞİM BİLGİSİ]");
    expect(res.sanitizedText).not.toContain("1453");
    expect(res.sanitizedText).not.toContain("05321234567");
    expect(res.sanitizedText).not.toContain("veli@gmail.com");
  });

  it("should report maskedCount accurately", () => {
    const input = "10-B sınıfından Ahmet, Mehmet ile birlikte bana vurdu.";
    const res = sanitizeForLLM(input);
    expect(res.maskedCount).toBeGreaterThanOrEqual(3);
  });
});
