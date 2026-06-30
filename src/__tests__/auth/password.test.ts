import { describe, it, expect } from "vitest";
import { validatePasswordComplexity } from "../../lib/auth/passwordValidation";

describe("BSG Yönergesi Md.9 Password Policy tests", () => {
  describe("Password Complexity Validator", () => {
    it("should reject passwords shorter than 8 characters", () => {
      const res = validatePasswordComplexity("Ab1!");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Şifre en az 8 karakter olmalıdır.");
    });

    it("should reject passwords without uppercase letter", () => {
      const res = validatePasswordComplexity("abc1234!");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Şifre en az bir büyük harf içermelidir.");
    });

    it("should reject passwords without lowercase letter", () => {
      const res = validatePasswordComplexity("ABC1234!");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Şifre en az bir küçük harf içermelidir.");
    });

    it("should reject passwords without number", () => {
      const res = validatePasswordComplexity("Abcdefgh!");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Şifre en az bir rakam içermelidir.");
    });

    it("should reject passwords without special character", () => {
      const res = validatePasswordComplexity("Abcdefg1");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Şifre en az bir özel karakter içermelidir.");
    });

    it("should reject common/weak blacklist passwords", () => {
      const res1 = validatePasswordComplexity("Sifre123!");
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain("zayıf");

      const res2 = validatePasswordComplexity("Admin123!");
      expect(res2.isValid).toBe(false);
      expect(res2.error).toContain("zayıf");
    });

    it("should accept strong passwords conforming to all criteria", () => {
      const res = validatePasswordComplexity("ZorbaGecit123!");
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe("Password Expiration Logic", () => {
    // Helper logic mirroring API route behavior
    function evaluatePasswordStatus(changedAtDateStr: string) {
      const passwordChangedAt = new Date(changedAtDateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - passwordChangedAt.getTime());
      const daysSinceChange = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const isExpired = daysSinceChange >= 180;
      const needsWarning = !isExpired && daysSinceChange >= 166;

      return { daysSinceChange, isExpired, needsWarning };
    }

    it("should flag password changed > 180 days ago as expired", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 185);
      
      const status = evaluatePasswordStatus(pastDate.toISOString());
      expect(status.isExpired).toBe(true);
      expect(status.needsWarning).toBe(false);
    });

    it("should flag password changed between 166 and 179 days ago as warning", () => {
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() - 170);

      const status = evaluatePasswordStatus(warningDate.toISOString());
      expect(status.isExpired).toBe(false);
      expect(status.needsWarning).toBe(true);
    });

    it("should mark password changed < 166 days ago as safe", () => {
      const safeDate = new Date();
      safeDate.setDate(safeDate.getDate() - 50);

      const status = evaluatePasswordStatus(safeDate.toISOString());
      expect(status.isExpired).toBe(false);
      expect(status.needsWarning).toBe(false);
    });
  });
});
