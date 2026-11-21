export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isServiceConfigured(): boolean {
  return Boolean(isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function missingSetup(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.CREDENTIALS_ENCRYPTION_KEY) missing.push("CREDENTIALS_ENCRYPTION_KEY");
  return missing;
}

export function integrationStatus() {
  return {
    supabase: isSupabaseConfigured(),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    encryption: Boolean(process.env.CREDENTIALS_ENCRYPTION_KEY),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    googlePubsub: Boolean(process.env.GOOGLE_PUBSUB_TOPIC),
    inngest: Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY),
    ai: Boolean(process.env.AI_API_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
    smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
  };
}
