-- 0003_workspace_invitations
-- Invitation schema + RLS. Full UI deferred; service contract lives in the application layer.
-- Tokens are stored as SHA-256 hashes; the plaintext token is sent via the EmailProvider (mock only,
-- development). No personal contact scraping; invitee must match the email and accept explicitly.

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists workspace_invitations_email_idx on public.workspace_invitations (email);
create index if not exists workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id);
create unique index if not exists workspace_invitations_token_hash_key on public.workspace_invitations (token_hash);
-- Prevent duplicate active invitations to the same email in the same workspace.
create unique index if not exists workspace_invitations_active_unique
  on public.workspace_invitations (workspace_id, lower(email))
  where accepted_at is null and cancelled_at is null;

alter table public.workspace_invitations enable row level security;

-- Visible to members of the workspace.
create policy "invitations_member_read"
  on public.workspace_invitations for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id and wm.user_id = auth.uid()
    )
  );

-- Only owner/admin may create invitations.
create policy "invitations_admin_insert"
  on public.workspace_invitations for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin')
    )
  );

-- Only owner/admin may cancel (update) invitations.
create policy "invitations_admin_update"
  on public.workspace_invitations for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin')
    )
  );