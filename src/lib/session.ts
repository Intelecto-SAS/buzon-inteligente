import { createUserClient } from "./supabase/server";
import type { Role } from "./security/permissions";

export type AppSession = {
  configured: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  orgId: string | null;
  orgName: string | null;
  timezone: string;
  role: Role | null;
};

export async function getSession(): Promise<AppSession> {
  const supabase = await createUserClient();
  if (!supabase) {
    return { configured: false, userId: null, email: null, fullName: null, orgId: null, orgName: null, timezone: "America/Bogota", role: null };
  }
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return { configured: true, userId: null, email: null, fullName: null, orgId: null, orgName: null, timezone: "America/Bogota", role: null };
  }
  if (!user) {
    return { configured: true, userId: null, email: null, fullName: null, orgId: null, orgName: null, timezone: "America/Bogota", role: null };
  }
  const { data: membership } = await supabase
    .from("memberships")
    .select("role, org_id, organizations(name, timezone), profiles(full_name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const org = membership?.organizations as { name?: string; timezone?: string } | { name?: string; timezone?: string }[] | null;
  const orgRow = Array.isArray(org) ? org[0] : org;
  const profile = membership?.profiles as { full_name?: string } | { full_name?: string }[] | null;
  const profileRow = Array.isArray(profile) ? profile[0] : profile;

  return {
    configured: true,
    userId: user.id,
    email: user.email ?? null,
    fullName: profileRow?.full_name || user.email || null,
    orgId: membership?.org_id ?? null,
    orgName: orgRow?.name ?? null,
    timezone: orgRow?.timezone || "America/Bogota",
    role: (membership?.role as Role | undefined) ?? null,
  };
}
