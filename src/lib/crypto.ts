// AES-256 (AES-CBC) Encryption and Decryption utility using native Web Crypto API.
// Works seamlessly in both browser and Node.js environments.

const ENCRYPTION_KEY_STRING = process.env.NEXT_PUBLIC_CRYPTO_KEY || 'zorbaya-dur-secret-key-12345678';

// Helper to convert string to a 32-byte key for AES-CBC
async function getKey(cryptoInstance: Crypto): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Ensure the key is exactly 32 bytes (256 bits)
  const rawKey = enc.encode(ENCRYPTION_KEY_STRING.padEnd(32, '0').slice(0, 32));
  return cryptoInstance.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts student name and class to a Base64 string.
 */
export async function encryptIdentity(name: string, studentClass: string): Promise<string> {
  try {
    const cryptoInstance = typeof window !== 'undefined' ? window.crypto : (globalThis.crypto as Crypto);
    if (!cryptoInstance || !cryptoInstance.subtle) {
      throw new Error('Web Crypto API is not supported in this environment.');
    }

    const data = JSON.stringify({ name, studentClass });
    const enc = new TextEncoder();
    const encodedData = enc.encode(data);
    const iv = cryptoInstance.getRandomValues(new Uint8Array(16));
    const key = await getKey(cryptoInstance);
    
    const encrypted = await cryptoInstance.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      encodedData
    );
    
    const encryptedBytes = new Uint8Array(encrypted);
    // Combine IV (16 bytes) and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv);
    combined.set(encryptedBytes, iv.length);
    
    // Convert combined binary to base64
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Kimlik bilgileri şifrelenirken bir hata oluştu.');
  }
}

/**
 * Decrypts a Base64 cipher text back to student name and class object.
 */
export async function decryptIdentity(cipherText: string): Promise<{ name: string; studentClass: string } | null> {
  try {
    if (!cipherText) return null;
    const cryptoInstance = typeof window !== 'undefined' ? window.crypto : (globalThis.crypto as Crypto);
    if (!cryptoInstance || !cryptoInstance.subtle) {
      throw new Error('Web Crypto API is not supported in this environment.');
    }

    const binaryString = atob(cipherText);
    const len = binaryString.length;
    const combined = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 16);
    const encryptedBytes = combined.slice(16);
    const key = await getKey(cryptoInstance);
    
    const decrypted = await cryptoInstance.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encryptedBytes
    );
    
    const dec = new TextDecoder();
    const decoded = dec.decode(decrypted);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}
