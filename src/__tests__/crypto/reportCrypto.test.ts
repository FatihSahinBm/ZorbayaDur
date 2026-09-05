import { describe, it, expect } from "vitest";
import { encryptReportContent, decryptReportContent } from "../../lib/crypto/reportCrypto";

describe("reportCrypto - AES-256-GCM Application-level Encryption Tests", () => {
  it("should encrypt plain text into a non-readable Base64 string", async () => {
    const plainText = "Ahmet beni okul kantininde itti ve tehdit etti.";
    const encrypted = await encryptReportContent(plainText);

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plainText);
    expect(encrypted).not.toContain("Ahmet");
    expect(encrypted).not.toContain("kantininde");
  });

  it("should successfully decrypt encrypted Base64 back to original plain text without loss", async () => {
    const original = "10-B sınıfındaki Ahmet ve Mehmet beni kantin sırasında itekledi. Çok korkuyorum.";
    const encrypted = await encryptReportContent(original);
    const decrypted = await decryptReportContent(encrypted);

    expect(decrypted).toBe(original);
  });

  it("should handle empty or null values gracefully", async () => {
    expect(await encryptReportContent("")).toBe("");
    expect(await decryptReportContent("")).toBe("");
  });

  it("should safely fallback to plain text for legacy unencrypted content", async () => {
    const legacyText = "Bu eski bir düz metin ihbardır ve şifreli değildir.";
    const result = await decryptReportContent(legacyText);
    expect(result).toBe(legacyText);
  });

  it("should work seamlessly with a 64-character hex key in ENCRYPTION_SECRET_KEY", async () => {
    const originalKey = process.env.ENCRYPTION_SECRET_KEY;
    try {
      process.env.ENCRYPTION_SECRET_KEY = "fd1601767b70b88542a6a2e4d4f385bee12de2fd77d93966e2548b5a8d4b0344";
      const sample = "Zorbalık bildirimi gizli içerik";
      const enc = await encryptReportContent(sample);
      const dec = await decryptReportContent(enc);
      expect(dec).toBe(sample);
    } finally {
      process.env.ENCRYPTION_SECRET_KEY = originalKey;
    }
  });
});
