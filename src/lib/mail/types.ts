export type ProviderName = "microsoft" | "google";

export type NormalizedParticipant = {
  kind: "from" | "to" | "cc" | "bcc";
  address: string;
  name: string | null;
};

export type NormalizedAttachment = {
  providerId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type NormalizedMessage = {
  provider: ProviderName;
  providerMessageId: string;
  providerThreadId: string | null;
  internetMessageId: string | null;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  fromAddress: string;
  fromName: string | null;
  participants: NormalizedParticipant[];
  attachments: NormalizedAttachment[];
  receivedAt: string;
  headers: string;
};
