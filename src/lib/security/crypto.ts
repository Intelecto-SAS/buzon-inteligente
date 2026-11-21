import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "crypto";

function keyBytes(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("CREDENTIALS_ENCRYPTION_KEY no está configurada.");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  return createHash("sha256").update(raw).digest();
}

export type EncryptedPayload = {
  ciphertext: string;
  nonce: string;
  keyVersion: number;
};

export function encryptJson(value: unknown): EncryptedPayload {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), nonce);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: nonce.toString("base64"),
    keyVersion: 1,
  };
}

export function decryptJson<T>(payload: EncryptedPayload): T {
  const nonce = Buffer.from(payload.nonce, "base64");
  const combined = Buffer.from(payload.ciphertext, "base64");
  const tag = combined.subarray(combined.length - 16);
  const data = combined.subarray(0, combined.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  return JSON.parse(plain) as T;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
