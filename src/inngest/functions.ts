import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptJson, type EncryptedPayload } from "@/lib/security/crypto";
import { fetchGraphDelta, refreshMicrosoftToken, renewGraphSubscription, fetchGraphMessage } from "@/lib/mail/microsoft";
import { fetchGmailHistory, fetchGmailMessage, refreshGoogleToken, watchGmail } from "@/lib/mail/gmail";
import { ingestNormalizedMessage } from "@/lib/pipeline/ingest";

export const processProviderEvent = inngest.createFunction(
  { id: "process-provider-event", retries: 5, idempotency: "event.data.eventId" },
  { event: "mail/provider.received" },
  async ({ event }) => {
    const supabase = createServiceClient();
    if (!supabase) throw new Error("Supabase no está configurado.");
    const eventId = event.data.eventId as string;
    const { data: row } = await supabase.from("provider_events").select("*").eq("id", eventId).maybeSingle();
    if (!row) return { skipped: true };
    if (row.status === "processed") return { duplicate: true };
    await supabase.from("provider_events").update({ status: "processing", attempts: row.attempts + 1 }).eq("id", row.id);

    try {
      const payload = row.payload as { messageId?: string; mailboxId?: string };
      const mailboxId = payload.mailboxId || row.mailbox_id;
      if (!mailboxId || !payload.messageId) throw new Error("El evento no incluye buzón o mensaje.");
      const { data: mailbox } = await supabase.from("mailboxes").select("*").eq("id", mailboxId).single();
      const { data: secret } = await supabase.from("mailbox_credentials").select("*").eq("mailbox_id", mailboxId).single();
      const token = decryptJson<{ refreshToken: string }>(secret as EncryptedPayload);
      if (mailbox.provider === "microsoft") {
        const fresh = await refreshMicrosoftToken(token.refreshToken);
        const message = await fetchGraphMessage(fresh.accessToken, payload.messageId);
        await ingestNormalizedMessage(supabase, mailbox, message);
      } else {
        const fresh = await refreshGoogleToken(token.refreshToken);
        const historyId = (row.payload as { historyId?: string }).historyId;
        if (historyId) {
          const { data: cursor } = await supabase.from("sync_cursors").select("history_id").eq("mailbox_id", mailboxId).maybeSingle();
          const start = cursor?.history_id || historyId;
          const history = await fetchGmailHistory(fresh.accessToken, start);
          for (const id of history.messageIds) {
            const message = await fetchGmailMessage(fresh.accessToken, id);
            await ingestNormalizedMessage(supabase, mailbox, message);
          }
          if (history.historyId) await supabase.from("sync_cursors").upsert({ mailbox_id: mailboxId, history_id: history.historyId, updated_at: new Date().toISOString() });
        } else {
          const message = await fetchGmailMessage(fresh.accessToken, payload.messageId);
          await ingestNormalizedMessage(supabase, mailbox, message);
        }
      }
      await supabase.from("provider_events").update({ status: "processed", processed_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      return { processed: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      await supabase.from("provider_events").update({ status: "failed", last_error: message }).eq("id", row.id);
      await supabase.from("technical_incidents").insert({ org_id: row.org_id, source: "provider_event", severity: "alta", message, detail: { eventId } });
      throw error;
    }
  },
);

export const recoverMailboxes = inngest.createFunction(
  { id: "recover-mailboxes", retries: 2 },
  { cron: "*/15 * * * *" },
  async () => {
    const supabase = createServiceClient();
    if (!supabase) return { skipped: "supabase" };
    const { data: mailboxes } = await supabase.from("mailboxes").select("*").eq("processing_enabled", true).eq("status", "connected");
    for (const mailbox of mailboxes || []) {
      try {
        const { data: secret } = await supabase.from("mailbox_credentials").select("*").eq("mailbox_id", mailbox.id).single();
        const { data: cursor } = await supabase.from("sync_cursors").select("*").eq("mailbox_id", mailbox.id).maybeSingle();
        const token = decryptJson<{ refreshToken: string }>(secret as EncryptedPayload);
        if (mailbox.provider === "microsoft") {
          const fresh = await refreshMicrosoftToken(token.refreshToken);
          const delta = await fetchGraphDelta(fresh.accessToken, cursor?.delta_link);
          for (const message of delta.messages) await ingestNormalizedMessage(supabase, mailbox, message);
          if (delta.deltaLink) await supabase.from("sync_cursors").upsert({ mailbox_id: mailbox.id, delta_link: delta.deltaLink, updated_at: new Date().toISOString() });
        } else if (cursor?.history_id) {
          const fresh = await refreshGoogleToken(token.refreshToken);
          try {
            const history = await fetchGmailHistory(fresh.accessToken, cursor.history_id);
            for (const id of history.messageIds) {
              const message = await fetchGmailMessage(fresh.accessToken, id);
              await ingestNormalizedMessage(supabase, mailbox, message);
            }
            if (history.historyId) await supabase.from("sync_cursors").upsert({ mailbox_id: mailbox.id, history_id: history.historyId, updated_at: new Date().toISOString() });
          } catch (error) {
            if (error instanceof Error && error.message === "HISTORY_EXPIRED") {
              await supabase.from("mailboxes").update({ status: "error", last_error: "El historial de Gmail expiró. Se requiere una sincronización completa autorizada." }).eq("id", mailbox.id);
            } else throw error;
          }
        }
        await supabase.from("mailboxes").update({ last_sync_at: new Date().toISOString(), last_error: null, status: "connected" }).eq("id", mailbox.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Fallo de sincronización";
        await supabase.from("mailboxes").update({ status: "error", last_error: message }).eq("id", mailbox.id);
        await supabase.from("connection_errors").insert({ mailbox_id: mailbox.id, org_id: mailbox.org_id, message });
      }
    }
    return { checked: mailboxes?.length ?? 0 };
  },
);

export const renewSubscriptions = inngest.createFunction(
  { id: "renew-subscriptions", retries: 2 },
  { cron: "0 */6 * * *" },
  async () => {
    const supabase = createServiceClient();
    if (!supabase) return { skipped: "supabase" };
    const soon = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const { data: subscriptions } = await supabase.from("mailbox_subscriptions").select("*, mailboxes(*)").lt("expires_at", soon);
    for (const subscription of subscriptions || []) {
      const mailbox = subscription.mailboxes as { id: string; provider: string };
      const { data: secret } = await supabase.from("mailbox_credentials").select("*").eq("mailbox_id", mailbox.id).single();
      const token = decryptJson<{ refreshToken: string }>(secret as EncryptedPayload);
      if (mailbox.provider === "microsoft") {
        const fresh = await refreshMicrosoftToken(token.refreshToken);
        const expiration = await renewGraphSubscription(fresh.accessToken, subscription.provider_subscription_id);
        await supabase.from("mailbox_subscriptions").update({ expires_at: expiration }).eq("id", subscription.id);
      } else {
        const fresh = await refreshGoogleToken(token.refreshToken);
        const watch = await watchGmail(fresh.accessToken);
        await supabase.from("mailbox_subscriptions").update({ expires_at: new Date(Number(watch.expiration)).toISOString() }).eq("id", subscription.id);
        await supabase.from("sync_cursors").upsert({ mailbox_id: mailbox.id, history_id: watch.historyId, updated_at: new Date().toISOString() });
      }
    }
    return { renewed: subscriptions?.length ?? 0 };
  },
);

export const scanDeadlines = inngest.createFunction(
  { id: "scan-deadlines", retries: 2 },
  { cron: "*/30 * * * *" },
  async () => {
    const supabase = createServiceClient();
    if (!supabase) return { skipped: "supabase" };
    const now = new Date().toISOString();
    const { data: due } = await supabase
      .from("cases")
      .select("id, org_id, public_code, due_at, assignee_id, priority, status")
      .eq("due_status", "confirmed")
      .lt("due_at", now)
      .not("status", "in", "(cerrado)");
    for (const item of due || []) {
      const dedupe = `overdue:${item.id}:${item.due_at}`;
      await supabase.from("alerts").upsert(
        {
          org_id: item.org_id,
          kind: "vencimiento",
          severity: "critica",
          case_id: item.id,
          title: `Plazo vencido ${item.public_code}`,
          body: "El plazo confirmado ya transcurrió.",
          dedupe_key: dedupe,
          status: "open",
        },
        { onConflict: "org_id,dedupe_key", ignoreDuplicates: true },
      );
    }
    return { overdue: due?.length ?? 0 };
  },
);

export const functions = [processProviderEvent, recoverMailboxes, renewSubscriptions, scanDeadlines];
