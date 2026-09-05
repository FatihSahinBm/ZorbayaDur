// Character pool excluding 0, O, 1, I, l (Anti-ambiguous)
export const SCHOOL_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a 4-character unambiguous uppercase school code (e.g. "XRXF", "TK82")
 */
export function generateSchoolCode(length: number = 4): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SCHOOL_CODE_CHARS.length);
    code += SCHOOL_CODE_CHARS.charAt(randomIndex);
  }
  return code;
}

/**
 * Generates a formatted student code: [SCHOOL_CODE]-001, [SCHOOL_CODE]-002...
 */
export function formatStudentCode(schoolCode: string, index: number): string {
  return `${schoolCode}-${index.toString().padStart(3, "0")}`;
}

/**
 * Generates a formatted PDR code: [SCHOOL_CODE]-PDR-01, [SCHOOL_CODE]-PDR-02...
 */
export function formatPdrCode(schoolCode: string, index: number): string {
  return `${schoolCode}-PDR-${index.toString().padStart(2, "0")}`;
}

/**
 * Generates a formatted management/principal code: [SCHOOL_CODE]-YNT-01, [SCHOOL_CODE]-YNT-02...
 */
export function formatAdminCode(schoolCode: string, index: number): string {
  return `${schoolCode}-YNT-${index.toString().padStart(2, "0")}`;
}

/**
 * Generates a formatted teacher code: [SCHOOL_CODE]-OGR-01, [SCHOOL_CODE]-OGR-02...
 */
export function formatTeacherCode(schoolCode: string, index: number): string {
  return `${schoolCode}-OGR-${index.toString().padStart(2, "0")}`;
}

export type ParsedUserCode = {
  schoolCode: string;
  role: "ogrenci" | "pdr" | "mudur" | "ogretmen" | "unknown";
  rawCode: string;
};

/**
 * Parses user code into its prefix and inferred role.
 * Examples:
 * - "XRXF-001" -> { schoolCode: "XRXF", role: "ogrenci" }
 * - "XRXF-PDR-01" -> { schoolCode: "XRXF", role: "pdr" }
 * - "XRXF-YNT-01" -> { schoolCode: "XRXF", role: "mudur" }
 * - "XRXF-MDR-01" -> { schoolCode: "XRXF", role: "mudur" } (legacy fallback)
 * - "XRXF-OGR-01" -> { schoolCode: "XRXF", role: "ogretmen" }
 */
export function parseUserCode(rawInput: string): ParsedUserCode {
  const clean = rawInput.trim().toUpperCase();
  const parts = clean.split("-");

  if (parts.length < 2) {
    return { schoolCode: "", role: "unknown", rawCode: clean };
  }

  const schoolCode = parts[0];

  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    return { schoolCode, role: "ogrenci", rawCode: clean };
  }

  if (parts.length >= 3) {
    const subType = parts[1];
    if (subType === "PDR") {
      return { schoolCode, role: "pdr", rawCode: clean };
    }
    if (subType === "YNT" || subType === "MDR") {
      return { schoolCode, role: "mudur", rawCode: clean };
    }
    if (subType === "OGR") {
      return { schoolCode, role: "ogretmen", rawCode: clean };
    }
  }

  return { schoolCode, role: "unknown", rawCode: clean };
}
