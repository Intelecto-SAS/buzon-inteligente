import type { NormalizedMessage } from "./types";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GoogleToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export function googleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: required("GOOGLE_CLIENT_ID"),
    redirect_uri: `${required("APP_URL")}/api/mailboxes/google/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.modify"].join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      redirect_uri: `${required("APP_URL")}/api/mailboxes/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token || !json.refresh_token) throw new Error(json.error || "Google no entregó tokens.");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<GoogleToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error || "No fue posible renovar el token de Google.");
  return {
    accessToken: json.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export async function googleProfile(accessToken: string): Promise<{ email: string; sub: string }> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Google userinfo respondió ${response.status}.`);
  const json = (await response.json()) as { email?: string; sub?: string };
  if (!json.email || !json.sub) throw new Error("Google no devolvió el correo del buzón.");
  return { email: json.email, sub: json.sub };
}

type GmailPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number; attachmentId?: string };
  headers?: { name: string; value: string }[];
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPart;
};

function decodeBase64Url(value: string): string {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function header(part: GmailPart | undefined, name: string): string {
  return part?.headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function collect(part: GmailPart | undefined, acc: { text: string; html: string; attachments: NormalizedMessage["attachments"] }) {
  if (!part) return;
  if (part.filename && part.body?.attachmentId) {
    acc.attachments.push({
      providerId: part.body.attachmentId,
      filename: part.filename,
      contentType: part.mimeType || "application/octet-stream",
      sizeBytes: part.body.size || 0,
    });
  }
  if (part.body?.data && part.mimeType === "text/plain") acc.text += decodeBase64Url(part.body.data);
  if (part.body?.data && part.mimeType === "text/html") acc.html += decodeBase64Url(part.body.data);
  for (const child of part.parts || []) collect(child, acc);
}

export function normalizeGmailMessage(message: GmailMessage): NormalizedMessage {
  const collected = { text: "", html: "", attachments: [] as NormalizedMessage["attachments"] };
  collect(message.payload, collected);
  const from = header(message.payload, "From");
  const address = from.match(/<([^>]+)>/)?.[1] || from;
  const name = from.includes("<") ? from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() : null;
  const to = header(message.payload, "To");
  const cc = header(message.payload, "Cc");
  const participants = [
    { kind: "from" as const, address, name },
    ...to.split(",").map((item) => item.trim()).filter(Boolean).map((item) => ({ kind: "to" as const, address: item, name: null })),
    ...cc.split(",").map((item) => item.trim()).filter(Boolean).map((item) => ({ kind: "cc" as const, address: item, name: null })),
  ];
  return {
    provider: "google",
    providerMessageId: message.id,
    providerThreadId: message.threadId || null,
    internetMessageId: header(message.payload, "Message-ID") || null,
    subject: header(message.payload, "Subject") || "(sin asunto)",
    bodyText: collected.text,
    bodyHtml: collected.html,
    fromAddress: address,
    fromName: name,
    participants,
    attachments: collected.attachments,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString(),
    headers: (message.payload?.headers || []).map((item) => `${item.name}: ${item.value}`).join("\n"),
  };
}

export async function fetchGmailMessage(accessToken: string, id: string): Promise<NormalizedMessage> {
  const response = await fetch(`${GMAIL}/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Gmail message respondió ${response.status}.`);
  return normalizeGmailMessage((await response.json()) as GmailMessage);
}

export async function fetchGmailHistory(accessToken: string, startHistoryId: string): Promise<{ messageIds: string[]; historyId: string | null }> {
  const response = await fetch(`${GMAIL}/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) {
    const error = new Error("HISTORY_EXPIRED");
    throw error;
  }
  if (!response.ok) throw new Error(`Gmail history respondió ${response.status}.`);
  const json = (await response.json()) as {
    history?: { messagesAdded?: { message: { id: string } }[] }[];
    historyId?: string;
  };
  const messageIds = (json.history || []).flatMap((item) => (item.messagesAdded || []).map((added) => added.message.id));
  return { messageIds, historyId: json.historyId || null };
}

export async function watchGmail(accessToken: string): Promise<{ historyId: string; expiration: string }> {
  const topic = required("GOOGLE_PUBSUB_TOPIC");
  const response = await fetch(`${GMAIL}/watch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ topicName: topic, labelIds: ["INBOX"] }),
  });
  const json = (await response.json()) as { historyId?: string; expiration?: string; error?: { message?: string } };
  if (!response.ok || !json.historyId) throw new Error(json.error?.message || "Gmail watch no se activó.");
  return { historyId: json.historyId, expiration: json.expiration || "" };
}

export async function sendGmail(accessToken: string, input: { to: string[]; subject: string; html: string; threadId?: string; inReplyTo?: string }): Promise<{ id: string }> {
  const headers = [
    `To: ${input.to.join(", ")}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
  ];
  if (input.inReplyTo) {
    headers.push(`In-Reply-To: ${input.inReplyTo}`);
    headers.push(`References: ${input.inReplyTo}`);
  }
  const raw = Buffer.from(`${headers.join("\r\n")}\r\n\r\n${input.html}`).toString("base64url");
  const response = await fetch(`${GMAIL}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw, threadId: input.threadId }),
  });
  const json = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !json.id) throw new Error(json.error?.message || "Gmail rechazó el envío.");
  return { id: json.id };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no está configurada.`);
  return value;
}
