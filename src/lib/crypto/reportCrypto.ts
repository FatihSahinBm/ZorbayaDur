/**
 * MEB Bilgi İşlem Standartları Uyumlu Rapor İçeriği Şifreleme Modülü
 * AES-256-GCM (Web Crypto API)
 * 
 * Veritabanında (Supabase reports.content) hiçbir açık metin bırakmamak üzere
 * uygulama seviyesinde şifreleme ve PDR oturumu için çözme işlevlerini sağlar.
 */

function getCryptoInstance(): Crypto {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto as Crypto;
}

/**
 * Ortam değişkeninden gelen anahtarı kesin olarak 32 baytlık (256-bit) ham diziye dönüştürür:
 * - 64 karakterlik Hex dizesi -> 32 bayt Uint8Array
 * - 44 karakterlik Base64 dizesi -> 32 bayt Uint8Array
 * - Diğer metinler / parolalar -> Deterministik SHA-256 özeti (32 bayt)
 */
function parseKeySource(rawKey: string): Uint8Array | null {
  const trimmed = rawKey.trim();

  // 1. 64 karakterlik Hex dizesi (Örn: crypto.randomBytes(32).toString('hex'))
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(trimmed.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  // 2. 44 karakterlik Base64 dizesi (32 bayt)
  if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed)) {
    try {
      if (typeof Buffer !== "undefined") {
        const buf = Buffer.from(trimmed, "base64");
        if (buf.length === 32) return new Uint8Array(buf);
      } else {
        const binary = atob(trimmed);
        if (binary.length === 32) {
          const bytes = new Uint8Array(32);
          for (let i = 0; i < 32; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        }
      }
    } catch {
      // fallback
    }
  }

  return null;
}

// 32-byte (256-bit) AES-GCM CryptoKey türetme
async function getAESKey(): Promise<CryptoKey> {
  const cryptoInstance = getCryptoInstance();
  if (!cryptoInstance || !cryptoInstance.subtle) {
    throw new Error("Web Crypto API ortamda desteklenmiyor.");
  }

  const rawKey =
    process.env.ENCRYPTION_SECRET_KEY ||
    process.env.NEXT_PUBLIC_CRYPTO_KEY ||
    "koza-aes-256-gcm-master-report-secret-key-32b!";

  const directBytes = parseKeySource(rawKey);
  let rawBuffer: ArrayBuffer;

  if (directBytes) {
    rawBuffer = directBytes.buffer as ArrayBuffer;
  } else {
    // SHA-256 ile herhangi bir rastgele dize veya paroladan deterministik 256-bit (32 bayt) anahtar üret
    const enc = new TextEncoder();
    rawBuffer = await cryptoInstance.subtle.digest("SHA-256", enc.encode(rawKey));
  }

  return cryptoInstance.subtle.importKey(
    "raw",
    rawBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Açık ihbar metnini AES-256-GCM modunda 12-byte rastgele IV ile şifreler.
 * Çıktı: "IV (12 byte) + Ciphertext" verisinin Base64 string hali.
 */
export async function encryptReportContent(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== "string") {
    return "";
  }

  try {
    const cryptoInstance = getCryptoInstance();
    const key = await getAESKey();

    // 12-byte standart NIST IV (Nonce)
    const iv = cryptoInstance.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const data = enc.encode(plainText);

    const ciphertextBuffer = await cryptoInstance.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      data
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);

    // IV (12 byte) ve Şifreli Metni birleştir
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv, 0);
    combined.set(ciphertext, iv.length);

    // Node.js veya Tarayıcı Base64 dönüşümü
    if (typeof Buffer !== "undefined") {
      return Buffer.from(combined).toString("base64");
    } else {
      let binary = "";
      const len = combined.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return btoa(binary);
    }
  } catch (err: any) {
    console.error("encryptReportContent hatası:", err);
    throw new Error("Rapor içeriği şifrelenemedi: " + (err.message || err));
  }
}

/**
 * Base64 ile şifrelenmiş ihbar içeriğini çözerek orijinal açık metni döndürür.
 * Eski/düz metin veriler veya hata durumlarında veri kaybını önlemek için güvenli geri dönüş (fallback) yapar.
 */
export async function decryptReportContent(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") {
    return "";
  }

  // Düz metin kontrolü: Eğer metin base64 formatına uymuyorsa doğrudan düz metin olarak kabul et
  const trimmed = encryptedBase64.trim();
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (trimmed.length < 24 || !base64Regex.test(trimmed)) {
    return encryptedBase64;
  }

  try {
    const cryptoInstance = getCryptoInstance();
    const key = await getAESKey();

    let combined: Uint8Array;
    if (typeof Buffer !== "undefined") {
      combined = new Uint8Array(Buffer.from(trimmed, "base64"));
    } else {
      const binaryString = atob(trimmed);
      combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }
    }

    if (combined.length <= 12) {
      return encryptedBase64;
    }

    // İlk 12 byte IV, kalanı ciphertext + auth tag
    const ivBytes = new Uint8Array(combined.slice(0, 12));
    const ciphertextBytes = new Uint8Array(combined.slice(12));

    const decryptedBuffer = await cryptoInstance.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes
      },
      key,
      ciphertextBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    // Şifre çözülemezse (örn: eski düz metin veya geçersiz anahtar), orijinal metni koru
    return encryptedBase64;
  }
}
