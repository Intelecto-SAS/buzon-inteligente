-- Políticas de acceso. El rol de servicio de Supabase las omite y se usa solo en trabajos y webhooks.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.user_availability enable row level security;
alter table public.mailboxes enable row level security;
alter table public.mailbox_credentials enable row level security;
alter table public.mailbox_access enable row level security;
alter table public.mailbox_subscriptions enable row level security;
alter table public.sync_cursors enable row level security;
alter table public.provider_events enable row level security;
alter table public.connection_errors enable row level security;
alter table public.categories enable row level security;
alter table public.category_mailboxes enable row level security;
alter table public.category_expressions enable row level security;
alter table public.conversations enable row level security;
alter table public.cases enable row level security;
alter table public.case_counters enable row level security;
alter table public.messages enable row level security;
alter table public.message_participants enable row level security;
alter table public.attachments enable row level security;
alter table public.read_states enable row level security;
alter table public.message_labels enable row level security;
alter table public.classification_results enable row level security;
alter table public.case_messages enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_notes enable row level security;
alter table public.case_transitions enable row level security;
alter table public.case_relations enable row level security;
alter table public.calendars enable row level security;
alter table public.holidays enable row level security;
alter table public.attention_policies enable row level security;
alter table public.deadlines enable row level security;
alter table public.templates enable row level security;
alter table public.template_versions enable row level security;
alter table public.drafts enable row level security;
alter table public.approvals enable row level security;
alter table public.outbound_attempts enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_rule_versions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_events enable row level security;
alter table public.technical_incidents enable row level security;
alter table public.saved_views enable row level security;
alter table public.external_integrations enable row level security;
alter table public.ai_analyses enable row level security;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.org_role(p_org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.memberships m
  where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  limit 1;
$$;

create or replace function public.can_read_mailbox(p_mailbox uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mailbox_access a
    where a.mailbox_id = p_mailbox and a.user_id = auth.uid() and a.can_read
  );
$$;

-- Credenciales: ningún rol de usuario las lee. Solo el servicio.
create policy credentials_deny on public.mailbox_credentials for select using (false);

create policy profiles_self on public.profiles for select using (id = auth.uid() or exists (
  select 1 from public.memberships mine
  join public.memberships theirs on theirs.org_id = mine.org_id
  where mine.user_id = auth.uid() and theirs.user_id = profiles.id and mine.status = 'active'
));
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

create policy org_select on public.organizations for select using (public.is_org_member(id));

create policy memberships_select on public.memberships for select using (public.is_org_member(org_id));
create policy memberships_admin on public.memberships for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');

create policy invitations_admin on public.invitations for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');

create policy teams_select on public.teams for select using (public.is_org_member(org_id));
create policy teams_admin on public.teams for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy team_members_select on public.team_members for select using (public.is_org_member(org_id));
create policy team_members_admin on public.team_members for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy availability_member on public.user_availability for select using (public.is_org_member(org_id));
create policy availability_write on public.user_availability for all using (
  public.org_role(org_id) in ('administrador', 'supervisor') or user_id = auth.uid()
) with check (public.org_role(org_id) in ('administrador', 'supervisor') or user_id = auth.uid());

create policy mailboxes_select on public.mailboxes for select using (
  public.org_role(org_id) = 'administrador' or public.can_read_mailbox(id)
);
create policy mailboxes_admin on public.mailboxes for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy mailbox_access_select on public.mailbox_access for select using (public.is_org_member(org_id));
create policy mailbox_access_admin on public.mailbox_access for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');

create policy categories_select on public.categories for select using (public.is_org_member(org_id));
create policy categories_admin on public.categories for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy expressions_select on public.category_expressions for select using (public.is_org_member(org_id));
create policy expressions_admin on public.category_expressions for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy category_mailboxes_select on public.category_mailboxes for select using (
  exists (select 1 from public.categories c where c.id = category_id and public.is_org_member(c.org_id))
);

create policy messages_select on public.messages for select using (public.can_read_mailbox(mailbox_id));
create policy messages_update on public.messages for update using (
  public.can_read_mailbox(mailbox_id) and public.org_role(org_id) <> 'auditor'
);

create policy participants_select on public.message_participants for select using (
  exists (select 1 from public.messages m where m.id = message_id and public.can_read_mailbox(m.mailbox_id))
);
create policy attachments_select on public.attachments for select using (
  exists (select 1 from public.messages m where m.id = message_id and public.can_read_mailbox(m.mailbox_id))
);
create policy labels_select on public.message_labels for select using (
  exists (select 1 from public.messages m where m.id = message_id and public.can_read_mailbox(m.mailbox_id))
);
create policy class_select on public.classification_results for select using (
  exists (select 1 from public.messages m where m.id = message_id and public.can_read_mailbox(m.mailbox_id))
);
create policy read_states_own on public.read_states for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversations_select on public.conversations for select using (public.can_read_mailbox(mailbox_id));

create policy cases_select on public.cases for select using (
  public.is_org_member(org_id) and (
    mailbox_id is null or public.can_read_mailbox(mailbox_id) or assignee_id = auth.uid()
  )
);
create policy cases_write on public.cases for update using (
  public.org_role(org_id) in ('administrador', 'supervisor', 'usuario')
  and (mailbox_id is null or public.can_read_mailbox(mailbox_id) or assignee_id = auth.uid())
);

create policy notes_select on public.case_notes for select using (public.is_org_member(org_id));
create policy notes_insert on public.case_notes for insert with check (
  author_id = auth.uid() and public.org_role(org_id) in ('administrador', 'supervisor', 'usuario')
);
create policy transitions_select on public.case_transitions for select using (public.is_org_member(org_id));
create policy assignments_select on public.case_assignments for select using (public.is_org_member(org_id));
create policy case_messages_select on public.case_messages for select using (
  exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.org_id))
);

create policy calendars_member on public.calendars for select using (public.is_org_member(org_id));
create policy calendars_admin on public.calendars for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy holidays_select on public.holidays for select using (
  exists (select 1 from public.calendars c where c.id = calendar_id and public.is_org_member(c.org_id))
);
create policy policies_select on public.attention_policies for select using (public.is_org_member(org_id));
create policy policies_admin on public.attention_policies for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy deadlines_select on public.deadlines for select using (public.is_org_member(org_id));

create policy templates_select on public.templates for select using (public.is_org_member(org_id));
create policy templates_write on public.templates for all using (public.org_role(org_id) in ('administrador', 'supervisor')) with check (public.org_role(org_id) in ('administrador', 'supervisor'));
create policy template_versions_select on public.template_versions for select using (
  exists (select 1 from public.templates t where t.id = template_id and public.is_org_member(t.org_id))
);
create policy drafts_select on public.drafts for select using (public.is_org_member(org_id));
create policy drafts_write on public.drafts for all using (public.org_role(org_id) in ('administrador', 'supervisor', 'usuario')) with check (public.org_role(org_id) in ('administrador', 'supervisor', 'usuario'));
create policy approvals_select on public.approvals for select using (public.is_org_member(org_id));
create policy outbound_select on public.outbound_attempts for select using (public.is_org_member(org_id));

create policy rules_select on public.automation_rules for select using (public.is_org_member(org_id));
create policy rules_admin on public.automation_rules for all using (public.org_role(org_id) = 'administrador') with check (public.org_role(org_id) = 'administrador');
create policy runs_select on public.automation_runs for select using (public.is_org_member(org_id));

create policy alerts_select on public.alerts for select using (public.is_org_member(org_id));
create policy alerts_update on public.alerts for update using (public.org_role(org_id) in ('administrador', 'supervisor', 'usuario'));
create policy notifications_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid());
create policy preferences_own on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_read on public.audit_events for select using (public.org_role(org_id) in ('administrador', 'auditor'));
create policy incidents_read on public.technical_incidents for select using (public.org_role(org_id) in ('administrador', 'auditor'));
create policy views_own on public.saved_views for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy integrations_admin on public.external_integrations for select using (public.org_role(org_id) = 'administrador');
create policy ai_select on public.ai_analyses for select using (
  exists (select 1 from public.messages m where m.id = message_id and public.can_read_mailbox(m.mailbox_id))
);

revoke update, delete on public.audit_events from authenticated, anon;
revoke all on public.mailbox_credentials from authenticated, anon;
