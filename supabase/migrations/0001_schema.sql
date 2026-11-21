-- Buzón Inteligente — esquema inicial
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Bogota',
  retention_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('administrador', 'supervisor', 'usuario', 'auditor')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('administrador', 'supervisor', 'usuario', 'auditor')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  primary key (team_id, user_id)
);

create table public.user_availability (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'available' check (status in ('available', 'away')),
  substitute_user_id uuid references public.profiles (id),
  capacity integer not null default 30,
  primary key (org_id, user_id)
);

create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('microsoft', 'google')),
  kind text not null default 'personal' check (kind in ('personal', 'shared')),
  display_name text not null,
  email_address text,
  status text not null default 'authorization_required'
    check (status in ('disconnected', 'authorization_required', 'connected', 'syncing', 'error', 'paused')),
  processing_enabled boolean not null default false,
  sync_history_days integer not null default 7,
  external_user_id text,
  tenant_id text,
  monitored_folders jsonb not null default '[]'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mailbox_credentials (
  mailbox_id uuid primary key references public.mailboxes (id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
  key_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table public.mailbox_access (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  can_read boolean not null default true,
  can_reply boolean not null default false,
  can_forward boolean not null default false,
  can_manage boolean not null default false,
  unique (mailbox_id, user_id)
);

create table public.mailbox_subscriptions (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  provider_subscription_id text not null,
  resource text,
  client_state_hash text not null,
  expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (mailbox_id, provider_subscription_id)
);

create table public.sync_cursors (
  mailbox_id uuid primary key references public.mailboxes (id) on delete cascade,
  delta_link text,
  history_id text,
  updated_at timestamptz not null default now()
);

create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  mailbox_id uuid references public.mailboxes (id) on delete set null,
  provider text not null,
  external_id text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_id)
);

create table public.connection_errors (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  message text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 100,
  default_priority text not null default 'normal' check (default_priority in ('critica', 'alta', 'normal', 'baja')),
  sensitive_legal boolean not null default false,
  team_id uuid references public.teams (id),
  internal_response_hours integer,
  min_score numeric not null default 1,
  root_operator text not null default 'or' check (root_operator in ('and', 'or')),
  rules_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.category_mailboxes (
  category_id uuid not null references public.categories (id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  primary key (category_id, mailbox_id)
);

create table public.category_expressions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  text text not null,
  field text not null check (field in ('subject', 'body', 'sender', 'recipients', 'domain', 'attachment_names', 'attachment_text', 'headers')),
  match_mode text not null check (match_mode in ('partial', 'exact', 'word', 'phrase')),
  polarity text not null check (polarity in ('include', 'exclude')),
  case_sensitive boolean not null default false,
  normalize boolean not null default true,
  weight numeric not null default 1,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  provider_thread_id text,
  subject text,
  created_at timestamptz not null default now(),
  unique (mailbox_id, provider_thread_id)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  public_code text not null,
  mailbox_id uuid references public.mailboxes (id),
  category_id uuid references public.categories (id),
  priority text not null default 'normal' check (priority in ('critica', 'alta', 'normal', 'baja')),
  status text not null default 'recibido',
  assignee_id uuid references public.profiles (id),
  team_id uuid references public.teams (id),
  subject text not null default '',
  received_at timestamptz,
  first_response_at timestamptz,
  due_at timestamptz,
  due_status text not null default 'pending_validation' check (due_status in ('pending_validation', 'confirmed', 'none')),
  internal_due_at timestamptz,
  sensitive_legal boolean not null default false,
  close_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, public_code)
);

create table public.case_counters (
  org_id uuid not null references public.organizations (id) on delete cascade,
  year integer not null,
  last_value integer not null default 0,
  primary key (org_id, year)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  conversation_id uuid references public.conversations (id),
  case_id uuid references public.cases (id),
  provider_message_id text not null,
  internet_message_id text,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  subject text not null default '',
  snippet text not null default '',
  body_text text not null default '',
  body_html_sanitized text not null default '',
  from_address text not null default '',
  from_name text,
  received_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  has_attachments boolean not null default false,
  category_id uuid references public.categories (id),
  priority text check (priority in ('critica', 'alta', 'normal', 'baja')),
  management_status text not null default 'recibido',
  assignee_id uuid references public.profiles (id),
  team_id uuid references public.teams (id),
  classification_source text not null default 'none' check (classification_source in ('none', 'automatic', 'manual')),
  classification_locked boolean not null default false,
  classification_explanation text,
  due_at timestamptz,
  due_status text not null default 'pending_validation',
  internal_due_at timestamptz,
  needs_reply boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox_id, provider_message_id)
);

create table public.message_participants (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  kind text not null check (kind in ('from', 'to', 'cc', 'bcc')),
  address text not null,
  name text
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null default 0,
  storage_path text,
  sha256 text,
  created_at timestamptz not null default now()
);

create table public.read_states (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.message_labels (
  message_id uuid not null references public.messages (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  kind text not null check (kind in ('primary', 'secondary')),
  primary key (message_id, category_id)
);

create table public.classification_results (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.categories (id),
  is_primary boolean not null default false,
  score numeric not null default 0,
  conflict boolean not null default false,
  needs_review boolean not null default false,
  explanation text not null default '',
  detail jsonb not null default '{}'::jsonb,
  engine_version text not null,
  source text not null default 'automatic',
  created_at timestamptz not null default now()
);

create table public.case_messages (
  case_id uuid not null references public.cases (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  primary key (case_id, message_id)
);

create table public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  assignee_id uuid references public.profiles (id),
  team_id uuid references public.teams (id),
  assigned_by uuid references public.profiles (id),
  reason text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.case_transitions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles (id),
  reason text,
  created_at timestamptz not null default now()
);

create table public.case_relations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  related_case_id uuid not null references public.cases (id) on delete cascade,
  kind text not null default 'related',
  unique (case_id, related_case_id)
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  timezone text not null default 'America/Bogota',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  day date not null,
  name text not null,
  unique (calendar_id, day)
);

create table public.attention_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  priority text not null check (priority in ('critica', 'alta', 'normal', 'baja')),
  first_response_hours integer not null,
  reminder_hours integer not null,
  escalate_after_hours integer not null,
  unique (org_id, priority)
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('internal_first_response', 'legal')),
  due_at timestamptz,
  status text not null,
  source text not null,
  confirmed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('acuse', 'informativa', 'solicitud_informacion', 'cierre', 'borrador_ia', 'categoria')),
  category_id uuid references public.categories (id),
  active boolean not null default true,
  requires_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  version integer not null,
  subject text not null,
  body text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid references public.cases (id),
  message_id uuid references public.messages (id),
  template_version_id uuid references public.template_versions (id),
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'sent')),
  author_id uuid references public.profiles (id),
  source text not null default 'manual' check (source in ('manual', 'automation', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  requested_by uuid references public.profiles (id),
  reviewer_id uuid references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.outbound_attempts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  draft_id uuid not null references public.drafts (id) on delete cascade,
  idempotency_key text not null,
  status text not null check (status in ('pending', 'accepted', 'failed')),
  provider_message_id text,
  provider_response jsonb,
  error text,
  created_at timestamptz not null default now(),
  unique (draft_id, idempotency_key)
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text not null default '',
  owner_id uuid references public.profiles (id),
  priority integer not null default 100,
  active boolean not null default false,
  version integer not null default 1,
  sensitive_authorized boolean not null default false,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules (id) on delete cascade,
  version integer not null,
  definition jsonb not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rule_id uuid not null references public.automation_rules (id) on delete cascade,
  rule_version integer not null,
  event_key text not null,
  status text not null,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  unique (event_key)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null,
  severity text not null,
  case_id uuid references public.cases (id),
  message_id uuid references public.messages (id),
  mailbox_id uuid references public.mailboxes (id),
  title text not null,
  body text not null default '',
  dedupe_key text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now(),
  unique (org_id, dedupe_key)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  alert_id uuid references public.alerts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email')),
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  status text not null,
  attempts integer not null default 0,
  last_error text,
  provider_id text,
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null,
  kind text not null,
  enabled boolean not null default true,
  primary key (org_id, user_id, channel, kind)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id),
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text,
  result text not null default 'ok',
  before_data jsonb,
  after_data jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.technical_incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id),
  source text not null,
  severity text not null,
  message text not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  module text not null,
  query jsonb not null,
  created_at timestamptz not null default now()
);

create table public.external_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  system text not null,
  status text not null default 'not_configured',
  notes text not null default '',
  unique (org_id, system)
);

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  model text,
  available boolean not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index messages_org_received_idx on public.messages (org_id, received_at desc);
create index messages_category_status_idx on public.messages (org_id, category_id, management_status);
create index messages_assignee_idx on public.messages (assignee_id);
create index cases_org_status_idx on public.cases (org_id, status, priority);
create index alerts_org_status_idx on public.alerts (org_id, status, created_at desc);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
create index audit_org_created_idx on public.audit_events (org_id, created_at desc);
create index provider_events_status_idx on public.provider_events (status, received_at);

create trigger organizations_updated before update on public.organizations
for each row execute function public.set_updated_at();
create trigger teams_updated before update on public.teams
for each row execute function public.set_updated_at();
create trigger mailboxes_updated before update on public.mailboxes
for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories
for each row execute function public.set_updated_at();
create trigger cases_updated before update on public.cases
for each row execute function public.set_updated_at();
create trigger messages_updated before update on public.messages
for each row execute function public.set_updated_at();
create trigger templates_updated before update on public.templates
for each row execute function public.set_updated_at();
create trigger drafts_updated before update on public.drafts
for each row execute function public.set_updated_at();
create trigger rules_updated before update on public.automation_rules
for each row execute function public.set_updated_at();

create or replace function public.next_case_code(p_org uuid)
returns text
language plpgsql
as $$
declare
  y integer := extract(year from now() at time zone 'America/Bogota');
  n integer;
begin
  insert into public.case_counters (org_id, year, last_value)
  values (p_org, y, 1)
  on conflict (org_id, year) do update set last_value = public.case_counters.last_value + 1
  returning last_value into n;
  return 'COM-' || y::text || '-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
