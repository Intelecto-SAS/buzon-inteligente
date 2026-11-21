import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createLocalClient } from "@/lib/local/client";

async function connectedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) cookieStore.set(cookie.name, cookie.value, cookie.options);
        } catch {
          // Server Components cannot always write cookies; middleware refreshes the session.
        }
      },
    },
  });
}

export async function createUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // El buzón operativo se lee en memoria. No se consulta el schema cache de PostgREST en cada página:
  // mientras no hay buzón remoto conectado, ese error (PGRST205) dejaba la sesión sin organización.
  if (!url || !key || process.env.USE_REMOTE_MAILBOX !== "true") {
    return createLocalClient() as unknown as Awaited<ReturnType<typeof connectedClient>>;
  }
  return connectedClient();
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return createLocalClient() as unknown as ReturnType<typeof createClient>;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
