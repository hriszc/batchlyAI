const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers WebCrypto max is 100K. NIST recommends >= 10K for SHA-256.
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const VERSION_PREFIX = "pbkdf2$";

function buf2hex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hex2buf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    KEY_BYTES * 8,
  );
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(password, salt);
  return `${VERSION_PREFIX}${buf2hex(salt)}:${buf2hex(new Uint8Array(key))}`;
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (!hash.startsWith(VERSION_PREFIX)) return false;

  const payload = hash.slice(VERSION_PREFIX.length);
  const [saltHex, keyHex] = payload.split(":");
  if (!saltHex || !keyHex) return false;

  const salt = hex2buf(saltHex);
  const targetKey = await deriveKey(password, salt);
  const targetHex = buf2hex(new Uint8Array(targetKey));
  return timingSafeEqual(targetHex, keyHex);
}
