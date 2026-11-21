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

async function remoteHasNoMessages(): Promise<boolean> {
  try {
    const remote = await connectedClient();
    const { count, error } = await remote.from("messages").select("id", { count: "exact", head: true });
    if (error) return true;
    return (count ?? 0) === 0;
  } catch {
    return true;
  }
}

export async function createUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || (await remoteHasNoMessages())) return createLocalClient() as unknown as Awaited<ReturnType<typeof connectedClient>>;
  return connectedClient();
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return createLocalClient() as unknown as ReturnType<typeof createClient>;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
