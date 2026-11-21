import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export function createOAuthState(payload: Record<string, string>): string {
  const body = Buffer.from(JSON.stringify({ ...payload, nonce: randomBytes(8).toString("hex") })).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function readOAuthState(state: string): Record<string, string> | null {
  const [body, sig] = state.split(".");
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, string>;
  } catch {
    return null;
  }
}

function sign(body: string): string {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY || "";
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
