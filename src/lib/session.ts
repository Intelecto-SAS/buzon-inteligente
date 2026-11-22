import { ORG } from "./local/seed";
import type { Role } from "./security/permissions";
import { createAuthClient, createUserClient } from "./supabase/server";

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

const ROLES = new Set<Role>(["administrador", "supervisor", "usuario", "auditor"]);
const SEEDED = new Set([
  "0b1e0a10-3333-4111-8111-000000000001",
  "0b1e0a10-3333-4111-8111-000000000002",
  "0b1e0a10-3333-4111-8111-000000000003",
  "0b1e0a10-3333-4111-8111-000000000004",
  "0b1e0a10-3333-4111-8111-000000000005",
  "0b1e0a10-3333-4111-8111-000000000006",
]);

const empty = (configured: boolean): AppSession => ({
  configured,
  userId: null,
  email: null,
  fullName: null,
  orgId: null,
  orgName: null,
  timezone: "America/Bogota",
  role: null,
});

export async function getSession(): Promise<AppSession> {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const auth = await createAuthClient();
  let user: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null = null;
  try {
    const { data } = await auth.auth.getUser();
    user = data.user;
  } catch {
    return empty(configured);
  }
  if (!user) return empty(true);

  if (process.env.USE_REMOTE_MAILBOX === "true") {
    return membershipFrom(auth, user.id, user.email ?? null);
  }

  const db = await createUserClient();
  const email = (user.email || "").toLowerCase();
  const { data: profiles } = await db.from("profiles").select("id, full_name, email");
  const list = (profiles || []) as { id: string; full_name?: string; email?: string }[];
  let profile = list.find((item) => (item.email || "").toLowerCase() === email) || list.find((item) => item.id === user!.id);

  if (!profile) {
    const { data: invitations } = await db.from("invitations").select("id, role, accepted_at, email").eq("email", email);
    const invitation = ((invitations || []) as { id: string; role: string; accepted_at: string | null }[]).find((item) => !item.accepted_at);
    const { data: memberships } = await db.from("memberships").select("user_id, role, status");
    const hasExternalAdmin = ((memberships || []) as { user_id: string; role: string; status: string }[]).some((item) => item.status === "active" && item.role === "administrador" && !SEEDED.has(item.user_id));
    const stored = String(user.app_metadata?.org_role || user.user_metadata?.org_role || "");
    const role: Role = ROLES.has(invitation?.role as Role) ? (invitation!.role as Role) : ROLES.has(stored as Role) ? (stored as Role) : hasExternalAdmin ? "usuario" : "administrador";
    const fullName = String(user.user_metadata?.full_name || email || "Usuario");
    await db.from("profiles").insert({ id: user.id, full_name: fullName, email });
    await db.from("memberships").insert({ id: `m-${user.id}`, org_id: ORG, user_id: user.id, role, status: "active" });
    if (invitation) await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);
    profile = { id: user.id, full_name: fullName, email };
  } else if (user.app_metadata?.org_role && ROLES.has(String(user.app_metadata.org_role) as Role)) {
    await db.from("memberships").update({ role: user.app_metadata.org_role }).eq("user_id", profile.id).eq("org_id", ORG);
  }

  return membershipFrom(db, profile.id, email || null);
}

async function membershipFrom(db: Awaited<ReturnType<typeof createUserClient>>, userId: string, email: string | null): Promise<AppSession> {
  const { data: membership } = await db
    .from("memberships")
    .select("role, org_id, organizations(name, timezone), profiles(full_name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const org = membership?.organizations as { name?: string; timezone?: string } | { name?: string; timezone?: string }[] | null;
  const orgRow = Array.isArray(org) ? org[0] : org;
  const profile = membership?.profiles as { full_name?: string } | { full_name?: string }[] | null;
  const profileRow = Array.isArray(profile) ? profile[0] : profile;
  const role = membership?.role as Role | undefined;
  return {
    configured: true,
    userId,
    email,
    fullName: profileRow?.full_name || email,
    orgId: membership?.org_id ?? null,
    orgName: orgRow?.name ?? null,
    timezone: orgRow?.timezone || "America/Bogota",
    role: role && ROLES.has(role) ? role : null,
  };
}
