import type { NormalizedMessage } from "./types";

export type MicrosoftToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

const GRAPH = "https://graph.microsoft.com/v1.0";

export function microsoftAuthorizeUrl(state: string): string {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const params = new URLSearchParams({
    client_id: required("MICROSOFT_CLIENT_ID"),
    response_type: "code",
    redirect_uri: `${required("APP_URL")}/api/mailboxes/microsoft/callback`,
    response_mode: "query",
    scope: ["offline_access", "User.Read", "Mail.Read", "Mail.Send"].join(" "),
    state,
    prompt: "select_account",
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(code: string): Promise<MicrosoftToken> {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const body = new URLSearchParams({
    client_id: required("MICROSOFT_CLIENT_ID"),
    client_secret: required("MICROSOFT_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: `${required("APP_URL")}/api/mailboxes/microsoft/callback`,
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token || !json.refresh_token) {
    throw new Error(json.error || "Microsoft no entregó tokens.");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftToken> {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const body = new URLSearchParams({
    client_id: required("MICROSOFT_CLIENT_ID"),
    client_secret: required("MICROSOFT_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error || "No fue posible renovar el token de Microsoft.");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export async function graphMe(accessToken: string): Promise<{ id: string; mail: string; displayName: string }> {
  const response = await fetch(`${GRAPH}/me?$select=id,mail,userPrincipalName,displayName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Graph /me respondió ${response.status}.`);
  const json = (await response.json()) as { id: string; mail?: string; userPrincipalName?: string; displayName?: string };
  return { id: json.id, mail: json.mail || json.userPrincipalName || "", displayName: json.displayName || "" };
}

type GraphMessage = {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string; name?: string } }[];
  ccRecipients?: { emailAddress?: { address?: string; name?: string } }[];
  receivedDateTime?: string;
  hasAttachments?: boolean;
  internetMessageHeaders?: { name: string; value: string }[];
};

export function normalizeGraphMessage(message: GraphMessage): NormalizedMessage {
  const participants = [
    {
      kind: "from" as const,
      address: message.from?.emailAddress?.address || "",
      name: message.from?.emailAddress?.name || null,
    },
    ...(message.toRecipients || []).map((item) => ({
      kind: "to" as const,
      address: item.emailAddress?.address || "",
      name: item.emailAddress?.name || null,
    })),
    ...(message.ccRecipients || []).map((item) => ({
      kind: "cc" as const,
      address: item.emailAddress?.address || "",
      name: item.emailAddress?.name || null,
    })),
  ].filter((item) => item.address);
  const html = message.body?.contentType === "html" ? message.body.content || "" : "";
  const text = message.body?.contentType === "text" ? message.body.content || "" : message.bodyPreview || "";
  return {
    provider: "microsoft",
    providerMessageId: message.id,
    providerThreadId: message.conversationId || null,
    internetMessageId: message.internetMessageId || null,
    subject: message.subject || "(sin asunto)",
    bodyText: text,
    bodyHtml: html,
    fromAddress: message.from?.emailAddress?.address || "",
    fromName: message.from?.emailAddress?.name || null,
    participants,
    attachments: [],
    receivedAt: message.receivedDateTime || new Date().toISOString(),
    headers: (message.internetMessageHeaders || []).map((header) => `${header.name}: ${header.value}`).join("\n"),
  };
}

export async function fetchGraphMessage(accessToken: string, messageId: string, userPath = "me"): Promise<NormalizedMessage> {
  const encoded = encodeURIComponent(messageId);
  const response = await fetch(
    `${GRAPH}/${userPath}/messages/${encoded}?$select=id,conversationId,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,internetMessageHeaders`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error(`Graph message respondió ${response.status}.`);
  return normalizeGraphMessage((await response.json()) as GraphMessage);
}

export async function fetchGraphDelta(accessToken: string, deltaLink?: string | null): Promise<{ messages: NormalizedMessage[]; deltaLink: string | null }> {
  const url = deltaLink || `${GRAPH}/me/mailFolders/inbox/messages/delta?$select=id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,receivedDateTime,hasAttachments`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Graph delta respondió ${response.status}.`);
  const json = (await response.json()) as { value?: GraphMessage[]; "@odata.deltaLink"?: string; "@odata.nextLink"?: string };
  return {
    messages: (json.value || []).filter((item) => item.id && item.subject !== undefined).map(normalizeGraphMessage),
    deltaLink: json["@odata.deltaLink"] || json["@odata.nextLink"] || null,
  };
}

export async function createGraphSubscription(accessToken: string, clientState: string): Promise<{ id: string; expiration: string }> {
  const expiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch(`${GRAPH}/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      changeType: "created",
      notificationUrl: `${required("APP_URL")}/api/webhooks/microsoft`,
      resource: "me/mailFolders('inbox')/messages",
      expirationDateTime: expiration,
      clientState,
    }),
  });
  const json = (await response.json()) as { id?: string; expirationDateTime?: string; error?: { message?: string } };
  if (!response.ok || !json.id) throw new Error(json.error?.message || "No se pudo crear la suscripción de Graph.");
  return { id: json.id, expiration: json.expirationDateTime || expiration };
}

export async function renewGraphSubscription(accessToken: string, subscriptionId: string): Promise<string> {
  const expiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch(`${GRAPH}/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expirationDateTime: expiration }),
  });
  if (!response.ok) throw new Error(`No se pudo renovar la suscripción (${response.status}).`);
  return expiration;
}

export async function sendGraphMail(accessToken: string, input: { to: string[]; subject: string; html: string; replyToMessageId?: string }): Promise<{ accepted: true }> {
  const path = input.replyToMessageId ? `${GRAPH}/me/messages/${encodeURIComponent(input.replyToMessageId)}/reply` : `${GRAPH}/me/sendMail`;
  const body = input.replyToMessageId
    ? { comment: input.html }
    : {
        message: {
          subject: input.subject,
          body: { contentType: "HTML", content: input.html },
          toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
        },
        saveToSentItems: true,
      };
  const response = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph rechazó el envío (${response.status}): ${text.slice(0, 400)}`);
  }
  return { accepted: true };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no está configurada.`);
  return value;
}
