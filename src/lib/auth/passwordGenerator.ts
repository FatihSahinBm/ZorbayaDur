import { validatePasswordComplexity } from "./passwordValidation";

// Anti-ambiguous character pools (Excludes 0, O, o, 1, I, i, l)
const SAFE_UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No 'I', 'O'
const SAFE_LOWERCASE = "abcdefghjkmnpqrstuvwxyz"; // No 'i', 'l', 'o'
const SAFE_DIGITS = "23456789"; // No '0', '1'
const SAFE_SYMBOLS = "#$*?&"; // Safe symbols, avoids Excel formula triggers (@, =, +, -, !, %)

const SAFE_LETTERS = SAFE_UPPERCASE + SAFE_LOWERCASE;
const ALL_SAFE_CHARS = SAFE_UPPERCASE + SAFE_LOWERCASE + SAFE_DIGITS + SAFE_SYMBOLS;

function getRandomChar(str: string): string {
  const randomIndex = Math.floor(Math.random() * str.length);
  return str.charAt(randomIndex);
}

/**
 * Generates an 8-character password conforming strictly to:
 * 1. Excel Formula Injection Safe: Starts strictly with a letter (A-Z, a-z), never with @, =, +, -, !, %.
 * 2. Anti-Ambiguous: Excludes 0, O, o, 1, I, i, l.
 * 3. Guaranteed Complexity:
 *    - At least 1 uppercase letter
 *    - At least 1 lowercase letter
 *    - At least 1 digit (2-9)
 *    - At least 1 symbol (#, $, *, ?, &)
 * 4. Strictly passes validatePasswordComplexity.
 */
export function generateSafePassword(length: number = 8): string {
  const targetLength = Math.max(8, length);

  for (let attempt = 0; attempt < 500; attempt++) {
    // 1. Mandatory first char must be a safe letter (Excel injection immunity)
    const firstChar = getRandomChar(SAFE_LETTERS);
    const isFirstUpper = SAFE_UPPERCASE.includes(firstChar);

    // 2. We need at least one of each required type among the remaining positions
    const requiredChars: string[] = [];

    if (isFirstUpper) {
      requiredChars.push(getRandomChar(SAFE_LOWERCASE));
    } else {
      requiredChars.push(getRandomChar(SAFE_UPPERCASE));
    }
    requiredChars.push(getRandomChar(SAFE_DIGITS));
    requiredChars.push(getRandomChar(SAFE_SYMBOLS));

    // 3. Fill the remaining spots up to targetLength - 1
    const remainingCount = targetLength - 1 - requiredChars.length;
    for (let i = 0; i < remainingCount; i++) {
      requiredChars.push(getRandomChar(ALL_SAFE_CHARS));
    }

    // 4. Shuffle the characters after the first character
    for (let i = requiredChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
    }

    const password = firstChar + requiredChars.join("");

    // 5. Final check against system password policy
    const validation = validatePasswordComplexity(password);
    if (validation.isValid) {
      return password;
    }
  }

  // Fallback guaranteed password conforming to all criteria
  return "Kz7#" + getRandomChar(SAFE_UPPERCASE) + getRandomChar(SAFE_LOWERCASE) + getRandomChar(SAFE_DIGITS) + getRandomChar(SAFE_SYMBOLS);
}

/**
 * Generates an array of unique safe passwords
 */
export function generateUniqueSafePasswords(count: number, length: number = 8): string[] {
  const uniqueSet = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 20;

  while (uniqueSet.size < count && attempts < maxAttempts) {
    uniqueSet.add(generateSafePassword(length));
    attempts++;
  }

  return Array.from(uniqueSet);
}
