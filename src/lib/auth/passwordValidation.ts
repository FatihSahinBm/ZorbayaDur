export const WEAK_PASSWORDS = [
  "12345678",
  "123456789",
  "sifre123",
  "sifre123!",
  "password123",
  "qwertyuiop",
  "admin123",
  "admin123!",
  "1234567890",
  "zorbayadur123",
  "zorbayadur!"
];

export function validatePasswordComplexity(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: "Şifre en az 8 karakter olmalıdır." };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUppercase) {
    return { isValid: false, error: "Şifre en az bir büyük harf içermelidir." };
  }
  if (!hasLowercase) {
    return { isValid: false, error: "Şifre en az bir küçük harf içermelidir." };
  }
  if (!hasNumber) {
    return { isValid: false, error: "Şifre en az bir rakam içermelidir." };
  }
  if (!hasSpecial) {
    return { isValid: false, error: "Şifre en az bir özel karakter içermelidir." };
  }

  // Check against common weak passwords (case-insensitive check)
  const lowerPassword = password.toLowerCase();
  const isWeak = WEAK_PASSWORDS.some(weak => lowerPassword.includes(weak.toLowerCase()) || weak.toLowerCase().includes(lowerPassword));
  
  if (isWeak) {
    return { isValid: false, error: "Bu şifre çok yaygın ve zayıf. Lütfen daha güçlü bir şifre seçin." };
  }

  return { isValid: true };
}
