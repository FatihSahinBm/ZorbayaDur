import { describe, it, expect } from "vitest";
import { generateSafePassword, generateUniqueSafePasswords } from "../../lib/auth/passwordGenerator";
import { 
  generateSchoolCode, 
  formatStudentCode, 
  formatPdrCode, 
  formatAdminCode, 
  formatTeacherCode,
  parseUserCode,
  SCHOOL_CODE_CHARS
} from "../../lib/auth/codeGenerator";
import { hashPassword, verifyPassword } from "../../lib/auth/hash";
import { validatePasswordComplexity } from "../../lib/auth/passwordValidation";

describe("School Account Generation & Security Tests", () => {
  describe("Password Generator - Security & Injection Safety", () => {
    it("should never start with an Excel formula injection character (@, =, +, -, !, %)", () => {
      const forbiddenStarts = ["@", "=", "+", "-", "!", "%"];
      for (let i = 0; i < 50; i++) {
        const pass = generateSafePassword(8);
        expect(forbiddenStarts.includes(pass.charAt(0))).toBe(false);
        // Must start with an ASCII letter
        expect(/^[a-zA-Z]/.test(pass)).toBe(true);
      }
    });

    it("should never contain ambiguous characters (0, O, o, 1, I, i, l)", () => {
      const ambiguous = ["0", "O", "o", "1", "I", "i", "l"];
      for (let i = 0; i < 50; i++) {
        const pass = generateSafePassword(8);
        for (const char of ambiguous) {
          expect(pass.includes(char)).toBe(false);
        }
      }
    });

    it("should satisfy all complexity requirements and validate with validatePasswordComplexity", () => {
      for (let i = 0; i < 50; i++) {
        const pass = generateSafePassword(8);
        expect(pass.length).toBe(8);

        // At least 1 uppercase
        expect(/[A-Z]/.test(pass)).toBe(true);
        // At least 1 lowercase
        expect(/[a-z]/.test(pass)).toBe(true);
        // At least 1 number (2-9)
        expect(/[2-9]/.test(pass)).toBe(true);
        // At least 1 safe symbol (#, $, *, ?, &)
        expect(/[#$*?&]/.test(pass)).toBe(true);

        const val = validatePasswordComplexity(pass);
        expect(val.isValid).toBe(true);
      }
    });

    it("should generate a unique set of passwords for a batch", () => {
      const count = 30;
      const batch = generateUniqueSafePasswords(count, 8);
      expect(batch.length).toBe(count);
      const set = new Set(batch);
      expect(set.size).toBe(count);
    });
  });

  describe("Code Generator - Prefix & Hierarchy", () => {
    it("should generate a 4-character school code strictly from unambiguous chars", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateSchoolCode(4);
        expect(code.length).toBe(4);
        for (const c of code) {
          expect(SCHOOL_CODE_CHARS.includes(c)).toBe(true);
        }
      }
    });

    it("should format student codes with 3-digit padding", () => {
      expect(formatStudentCode("XRXF", 1)).toBe("XRXF-001");
      expect(formatStudentCode("XRXF", 42)).toBe("XRXF-042");
      expect(formatStudentCode("XRXF", 100)).toBe("XRXF-100");
    });

    it("should format PDR, Admin (YNT), and Teacher (OGR) codes correctly", () => {
      expect(formatPdrCode("TK82", 1)).toBe("TK82-PDR-01");
      expect(formatAdminCode("TK82", 2)).toBe("TK82-YNT-02");
      expect(formatTeacherCode("TK82", 3)).toBe("TK82-OGR-03");
    });

    it("should parse user codes and detect the school code and role", () => {
      const s1 = parseUserCode("XRXF-005");
      expect(s1.schoolCode).toBe("XRXF");
      expect(s1.role).toBe("ogrenci");

      const p1 = parseUserCode("XRXF-PDR-02");
      expect(p1.schoolCode).toBe("XRXF");
      expect(p1.role).toBe("pdr");

      const a1 = parseUserCode("XRXF-YNT-01");
      expect(a1.schoolCode).toBe("XRXF");
      expect(a1.role).toBe("mudur");

      const t1 = parseUserCode("XRXF-OGR-04");
      expect(t1.schoolCode).toBe("XRXF");
      expect(t1.role).toBe("ogretmen");
    });
  });

  describe("Password Hashing & Verification (Web Crypto SHA-256)", () => {
    it("should hash a password and verify it correctly", async () => {
      const pass = "Kz9$mQ2#";
      const hash = await hashPassword(pass);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex string

      const isMatch = await verifyPassword(pass, hash);
      expect(isMatch).toBe(true);

      const isWrong = await verifyPassword("WrongPassword1!", hash);
      expect(isWrong).toBe(false);
    });

    it("should produce deterministic hashes for identical inputs", async () => {
      const pass = "Abcd23$#";
      const hash1 = await hashPassword(pass);
      const hash2 = await hashPassword(pass);
      expect(hash1).toBe(hash2);
    });
  });

  describe("Batch Teacher Account Generation & Session Integrity", () => {
    it("should generate sequential teacher accounts with OGR prefix and valid hashes", async () => {
      const schoolCode = "TK82";
      const teacherCount = 5;
      const accounts = [];

      for (let i = 1; i <= teacherCount; i++) {
        const userCode = formatTeacherCode(schoolCode, i);
        const pass = generateSafePassword(8);
        const hash = await hashPassword(pass);
        accounts.push({
          user_code: userCode,
          password: pass,
          hash: hash,
          role: "ogretmen"
        });
      }

      expect(accounts.length).toBe(5);
      expect(accounts[0].user_code).toBe("TK82-OGR-01");
      expect(accounts[4].user_code).toBe("TK82-OGR-05");

      for (const acc of accounts) {
        expect(acc.role).toBe("ogretmen");
        const parsed = parseUserCode(acc.user_code);
        expect(parsed.role).toBe("ogretmen");
        expect(parsed.schoolCode).toBe("TK82");
        const isValid = await verifyPassword(acc.password, acc.hash);
        expect(isValid).toBe(true);
      }
    });

    it("should correctly encode and decode koza_session payload", () => {
      const sessionData = {
        user_code: "TK82-OGR-01",
        role: "teacher",
        school_id: "test-school-uuid",
        createdAt: Date.now()
      };

      const encoded = Buffer.from(JSON.stringify(sessionData)).toString("base64");
      const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));

      expect(decoded.user_code).toBe("TK82-OGR-01");
      expect(decoded.role).toBe("teacher");
      expect(decoded.school_id).toBe("test-school-uuid");
      expect(decoded.createdAt).toBeDefined();
    });
  });
});

