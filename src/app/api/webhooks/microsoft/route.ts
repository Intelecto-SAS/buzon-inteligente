import { inngest } from "@/inngest/client";
import { sha256, safeEqual } from "@/lib/security/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const validation = url.searchParams.get("validationToken");
  if (validation) return new NextResponse(validation, { headers: { "Content-Type": "text/plain" } });

  const body = (await request.json()) as { value?: { subscriptionId?: string; clientState?: string; resourceData?: { id?: string } }[] };
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  for (const notice of body.value || []) {
    const { data: subscription } = await supabase
      .from("mailbox_subscriptions")
      .select("mailbox_id, client_state_hash, mailboxes(org_id)")
      .eq("provider_subscription_id", notice.subscriptionId || "")
      .maybeSingle();
    const expected = subscription?.client_state_hash;
    const received = notice.clientState ? sha256(notice.clientState) : "";
    if (!subscription || !expected || !safeEqual(expected, received)) {
      await supabase.from("technical_incidents").insert({
        source: "microsoft_webhook",
        severity: "alta",
        message: "Notificación de Graph rechazada.",
        detail: { subscriptionId: notice.subscriptionId },
      });
      continue;
    }
    const messageId = notice.resourceData?.id;
    if (!messageId) continue;
    const externalId = `microsoft:${notice.subscriptionId}:${messageId}`;
    const mailbox = subscription.mailboxes as { org_id: string } | { org_id: string }[] | null;
    const orgId = Array.isArray(mailbox) ? mailbox[0]?.org_id : mailbox?.org_id;
    const { data: inserted } = await supabase
      .from("provider_events")
      .upsert({
        org_id: orgId,
        mailbox_id: subscription.mailbox_id,
        provider: "microsoft",
        external_id: externalId,
        payload: { messageId, mailboxId: subscription.mailbox_id },
        status: "pending",
      }, { onConflict: "provider,external_id", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();
    if (inserted) {
      await inngest.send({ name: "mail/provider.received", data: { eventId: inserted.id } });
    }
  }
  return NextResponse.json({ ok: true });
}
