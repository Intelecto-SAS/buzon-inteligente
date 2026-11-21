import { createOAuthState } from "@/lib/mail/oauth-state";
import { microsoftAuthorizeUrl } from "@/lib/mail/microsoft";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId || session.role !== "administrador" || !session.orgId) {
    return NextResponse.json({ error: "Solo un administrador de la organización puede conectar buzones." }, { status: 403 });
  }
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.CREDENTIALS_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Faltan MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET o CREDENTIALS_ENCRYPTION_KEY." }, { status: 412 });
  }
  const url = new URL(request.url);
  const mailboxId = url.searchParams.get("mailbox") || "";
  const state = createOAuthState({ orgId: session.orgId, userId: session.userId, mailboxId, provider: "microsoft" });
  return NextResponse.redirect(microsoftAuthorizeUrl(state));
}
