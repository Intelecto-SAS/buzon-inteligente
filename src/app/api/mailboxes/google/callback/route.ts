import { readOAuthState } from "@/lib/mail/oauth-state";
import { exchangeGoogleCode, googleProfile, watchGmail } from "@/lib/mail/gmail";
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
  const token = await exchangeGoogleCode(code);
  const profile = await googleProfile(token.accessToken);
  const secret = encryptJson({ refreshToken: token.refreshToken, accessToken: token.accessToken, expiresAt: token.expiresAt });
  const { data } = await supabase.from("mailboxes").insert({
    org_id: state.orgId,
    provider: "google",
    display_name: profile.email,
    email_address: profile.email,
    external_user_id: profile.sub,
    status: "connected",
    processing_enabled: true,
  }).select("id").single();
  if (!data) return NextResponse.redirect(new URL("/buzones?error=buzon", process.env.APP_URL || url.origin));
  await supabase.from("mailbox_credentials").upsert({ mailbox_id: data.id, ...secret });
  await supabase.from("mailbox_access").upsert({
    org_id: state.orgId,
    mailbox_id: data.id,
    user_id: state.userId,
    can_read: true,
    can_reply: true,
    can_manage: true,
  }, { onConflict: "mailbox_id,user_id" });
  if (process.env.GOOGLE_PUBSUB_TOPIC) {
    try {
      const watch = await watchGmail(token.accessToken);
      await supabase.from("sync_cursors").upsert({ mailbox_id: data.id, history_id: watch.historyId });
      await supabase.from("mailbox_subscriptions").insert({
        mailbox_id: data.id,
        provider_subscription_id: watch.historyId,
        resource: "INBOX",
        client_state_hash: sha256(data.id),
        expires_at: new Date(Number(watch.expiration)).toISOString(),
      });
    } catch (error) {
      await supabase.from("mailboxes").update({ last_error: error instanceof Error ? error.message : "Watch pendiente" }).eq("id", data.id);
    }
  } else {
    await supabase.from("mailboxes").update({ last_error: "GOOGLE_PUBSUB_TOPIC no está configurado. La recuperación periódica no tiene historial inicial." }).eq("id", data.id);
  }
  await supabase.from("audit_events").insert({
    org_id: state.orgId,
    actor_id: state.userId,
    action: "mailbox.connected",
    resource_type: "mailbox",
    resource_id: data.id,
    after_data: { provider: "google", email: profile.email },
  });
  return NextResponse.redirect(new URL("/buzones?conectado=1", process.env.APP_URL || url.origin));
}
