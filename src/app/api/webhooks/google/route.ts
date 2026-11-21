import { inngest } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Falta el token de Pub/Sub." }, { status: 401 });
  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE;
  if (audience) {
    const valid = await verifyGoogleJwt(token, audience);
    if (!valid) return NextResponse.json({ error: "JWT de Pub/Sub inválido." }, { status: 401 });
  }

  const body = (await request.json()) as { message?: { data?: string; messageId?: string } };
  const data = body.message?.data ? JSON.parse(Buffer.from(body.message.data, "base64").toString("utf8")) as { emailAddress?: string; historyId?: string } : null;
  if (!data?.emailAddress || !data.historyId) return NextResponse.json({ ok: true });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  const { data: mailbox } = await supabase.from("mailboxes").select("id, org_id").eq("email_address", data.emailAddress).eq("provider", "google").maybeSingle();
  if (!mailbox) return NextResponse.json({ ok: true });
  const externalId = `google:${mailbox.id}:${data.historyId}`;
  const { data: inserted } = await supabase.from("provider_events").upsert({
    org_id: mailbox.org_id,
    mailbox_id: mailbox.id,
    provider: "google",
    external_id: externalId,
    payload: { historyId: data.historyId, mailboxId: mailbox.id },
    status: "pending",
  }, { onConflict: "provider,external_id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (inserted) await inngest.send({ name: "mail/provider.received", data: { eventId: inserted.id } });
  return NextResponse.json({ ok: true });
}

async function verifyGoogleJwt(token: string, audience: string): Promise<boolean> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return false;
  const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { aud?: string; iss?: string; exp?: number; email?: string };
  if (body.aud !== audience) return false;
  if (!body.iss || !["accounts.google.com", "https://accounts.google.com"].includes(body.iss)) return false;
  if (!body.exp || body.exp * 1000 < Date.now()) return false;
  const certs = await fetch("https://www.googleapis.com/oauth2/v3/certs").then((response) => response.json()) as { keys: JsonWebKey[] };
  const headerJson = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { kid?: string };
  const jwk = certs.keys.find((key) => (key as { kid?: string }).kid === headerJson.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    Buffer.from(signature, "base64url"),
    Buffer.from(`${header}.${payload}`),
  );
  return valid;
}
