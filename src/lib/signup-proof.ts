const SIGNUP_PROOF_PURPOSE = "batchlyai-signup-pow-v1";
export const SIGNUP_PROOF_DIFFICULTY = 18;
const SIGNUP_PROOF_MAX_AGE_MS = 10 * 60 * 1000;
const SIGNUP_PROOF_MAX_FUTURE_MS = 60 * 1000;

export interface SignupProof {
  difficulty: number;
  email: string;
  hash: string;
  nonce: string;
  timestamp: number;
}

export function normalizeSignupProofEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getSignupProofInput(proof: SignupProof): string {
  return [
    SIGNUP_PROOF_PURPOSE,
    proof.email,
    String(proof.timestamp),
    proof.nonce,
    String(proof.difficulty),
  ].join(":");
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export function hasLeadingZeroBits(hex: string, bits: number): boolean {
  let remaining = bits;
  for (const char of hex) {
    const nibble = Number.parseInt(char, 16);
    if (!Number.isFinite(nibble)) return false;

    const zeroBits = nibble === 0 ? 4 : Math.clz32(nibble) - 28;
    if (zeroBits >= remaining) return true;
    if (zeroBits < 4) return false;
    remaining -= 4;
  }
  return remaining <= 0;
}

function readSignupProof(raw: unknown): SignupProof | null {
  if (!raw || typeof raw !== "object") return null;

  const proof = raw as Record<string, unknown>;
  if (
    typeof proof.email !== "string" ||
    typeof proof.hash !== "string" ||
    typeof proof.nonce !== "string" ||
    typeof proof.timestamp !== "number" ||
    typeof proof.difficulty !== "number"
  ) {
    return null;
  }

  return {
    difficulty: proof.difficulty,
    email: proof.email,
    hash: proof.hash,
    nonce: proof.nonce,
    timestamp: proof.timestamp,
  };
}

export async function verifySignupProof({
  email,
  now = Date.now(),
  rawProof,
}: {
  email: unknown;
  now?: number;
  rawProof: unknown;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof email !== "string") {
    return { ok: false, message: "Human verification required" };
  }

  const proof = readSignupProof(rawProof);
  if (!proof) {
    return { ok: false, message: "Human verification required" };
  }

  const normalizedEmail = normalizeSignupProofEmail(email);
  if (proof.email !== normalizedEmail) {
    return { ok: false, message: "Human verification failed" };
  }

  if (proof.difficulty !== SIGNUP_PROOF_DIFFICULTY) {
    return { ok: false, message: "Human verification failed" };
  }

  if (!/^[a-f0-9]{16,128}$/.test(proof.nonce) || !/^[a-f0-9]{64}$/.test(proof.hash)) {
    return { ok: false, message: "Human verification failed" };
  }

  if (
    now - proof.timestamp > SIGNUP_PROOF_MAX_AGE_MS ||
    proof.timestamp - now > SIGNUP_PROOF_MAX_FUTURE_MS
  ) {
    return { ok: false, message: "Human verification expired" };
  }

  const expectedHash = await sha256Hex(getSignupProofInput(proof));
  if (expectedHash !== proof.hash || !hasLeadingZeroBits(proof.hash, proof.difficulty)) {
    return { ok: false, message: "Human verification failed" };
  }

  return { ok: true };
}
