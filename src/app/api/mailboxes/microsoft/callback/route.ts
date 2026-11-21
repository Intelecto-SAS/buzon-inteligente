import { readOAuthState } from "@/lib/mail/oauth-state";
import { createGraphSubscription, exchangeMicrosoftCode, graphMe } from "@/lib/mail/microsoft";
import { encryptJson, sha256 } from "@/lib/security/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = readOAuthState(url.searchParams.get("state") || "");
  const code = url.searchParams.get("code");
  if (!state || !code) return NextResponse.redirect(new URL("/buzones?error=autorizacion", process.env.APP_URL || url.origin));
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.redirect(new URL("/buzones?error=supabase", process.env.APP_URL || url.origin));

  const token = await exchangeMicrosoftCode(code);
  const profile = await graphMe(token.accessToken);
  const secret = encryptJson({ refreshToken: token.refreshToken, accessToken: token.accessToken, expiresAt: token.expiresAt });
  const mailboxId = state.mailboxId;
  let id = mailboxId;
  if (id) {
    await supabase.from("mailboxes").update({
      status: "connected",
      email_address: profile.mail,
      external_user_id: profile.id,
      processing_enabled: true,
      last_error: null,
    }).eq("id", id).eq("org_id", state.orgId);
  } else {
    const { data } = await supabase.from("mailboxes").insert({
      org_id: state.orgId,
      provider: "microsoft",
      display_name: profile.displayName || profile.mail,
      email_address: profile.mail,
      external_user_id: profile.id,
      status: "connected",
      processing_enabled: true,
    }).select("id").single();
    id = data?.id;
  }
  if (!id) return NextResponse.redirect(new URL("/buzones?error=buzon", process.env.APP_URL || url.origin));
  await supabase.from("mailbox_credentials").upsert({ mailbox_id: id, ...secret });
  await supabase.from("mailbox_access").upsert({
    org_id: state.orgId,
    mailbox_id: id,
    user_id: state.userId,
    can_read: true,
    can_reply: true,
    can_manage: true,
  }, { onConflict: "mailbox_id,user_id" });
  const clientState = process.env.MICROSOFT_WEBHOOK_SECRET || sha256(id);
  try {
    const subscription = await createGraphSubscription(token.accessToken, clientState);
    await supabase.from("mailbox_subscriptions").insert({
      mailbox_id: id,
      provider_subscription_id: subscription.id,
      resource: "inbox",
      client_state_hash: sha256(clientState),
      expires_at: subscription.expiration,
    });
  } catch (error) {
    await supabase.from("mailboxes").update({
      last_error: error instanceof Error ? error.message : "Suscripción pendiente",
    }).eq("id", id);
  }
  await supabase.from("audit_events").insert({
    org_id: state.orgId,
    actor_id: state.userId,
    action: "mailbox.connected",
    resource_type: "mailbox",
    resource_id: id,
    after_data: { provider: "microsoft", email: profile.mail },
  });
  return NextResponse.redirect(new URL("/buzones?conectado=1", process.env.APP_URL || url.origin));
}
