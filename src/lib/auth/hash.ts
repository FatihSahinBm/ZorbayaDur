/**
 * Standard Web Crypto SHA-256 with application salt.
 * Fully compatible with both modern browser runtimes and Node.js / Edge.
 */
const SALT = "koza_app_auth_salt_v2026";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${SALT}`);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  const computed = await hashPassword(password);
  return computed === hash;
}
