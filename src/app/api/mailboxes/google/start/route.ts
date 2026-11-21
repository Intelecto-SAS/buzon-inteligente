import { createOAuthState } from "@/lib/mail/oauth-state";
import { googleAuthorizeUrl } from "@/lib/mail/gmail";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId || session.role !== "administrador" || !session.orgId) {
    return NextResponse.json({ error: "Solo un administrador de la organización puede conectar buzones." }, { status: 403 });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.CREDENTIALS_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o CREDENTIALS_ENCRYPTION_KEY." }, { status: 412 });
  }
  const mailboxId = new URL(request.url).searchParams.get("mailbox") || "";
  const state = createOAuthState({ orgId: session.orgId, userId: session.userId, mailboxId, provider: "google" });
  return NextResponse.redirect(googleAuthorizeUrl(state));
}
