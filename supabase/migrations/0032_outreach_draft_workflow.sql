-- Atomic Outreach draft editing, restore, and review lifecycle.
begin;

alter table public.outreach_drafts
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text check (char_length(rejection_reason) <= 500);

alter table public.outreach_draft_versions drop constraint if exists outreach_draft_versions_change_type_check;
alter table public.outreach_draft_versions add constraint outreach_draft_versions_change_type_check
  check (change_type in ('generated','edited','restored','regenerated','approved_snapshot','manual'));

create or replace function public.create_outreach_draft_version(
  p_draft_id uuid, p_expected_version integer, p_subject text, p_body text,
  p_change_type text default 'edited', p_restore_version integer default null
) returns public.outreach_drafts
language plpgsql security invoker set search_path = public as $$
declare d public.outreach_drafts; source_v public.outreach_draft_versions; next_v integer;
begin
  select * into d from public.outreach_drafts where id = p_draft_id for update;
  if d.id is null then raise exception using errcode = 'PT404', message = 'draft_not_found'; end if;
  if d.current_version_number <> p_expected_version then raise exception using errcode = '40001', message = 'stale_version'; end if;
  if d.status = 'archived' then raise exception using errcode = '22023', message = 'invalid_transition'; end if;
  if p_restore_version is not null then
    select * into source_v from public.outreach_draft_versions
      where outreach_draft_id = d.id and workspace_id = d.workspace_id and version_number = p_restore_version;
    if source_v.id is null then raise exception using errcode = 'PT404', message = 'version_not_found'; end if;
    p_subject := source_v.subject; p_body := source_v.body;
  end if;
  p_subject := nullif(btrim(p_subject), ''); p_body := btrim(p_body);
  if p_body = '' or char_length(p_body) > 10000 or char_length(coalesce(p_subject,'')) > 240 then
    raise exception using errcode = '22023', message = 'invalid_content';
  end if;
  if d.channel = 'email' and p_subject is null then raise exception using errcode = '22023', message = 'subject_required'; end if;
  if d.channel <> 'email' then p_subject := null; end if;
  next_v := d.current_version_number + 1;
  insert into public.outreach_draft_versions(workspace_id,project_id,company_id,outreach_draft_id,version_number,subject,body,call_to_action,tone,length,change_type,change_reason,source_run_id,created_by)
    values(d.workspace_id,d.project_id,d.company_id,d.id,next_v,p_subject,p_body,d.call_to_action,d.tone,d.length,p_change_type,
      case when p_restore_version is null then null else 'Restored version ' || p_restore_version end,d.source_run_id,auth.uid());
  update public.outreach_drafts set subject=p_subject, body=p_body, current_version_number=next_v,
    status='draft', approved_by=null, approved_at=null, rejected_by=null, rejected_at=null, rejection_reason=null, updated_by=auth.uid()
    where id=d.id returning * into d;
  return d;
end $$;

create or replace function public.transition_outreach_draft(
  p_draft_id uuid, p_expected_version integer, p_target_status text, p_reason text default null
) returns public.outreach_drafts
language plpgsql security invoker set search_path = public as $$
declare d public.outreach_drafts; role_name text;
begin
  select * into d from public.outreach_drafts where id=p_draft_id for update;
  if d.id is null then raise exception using errcode='PT404', message='draft_not_found'; end if;
  if d.current_version_number <> p_expected_version then raise exception using errcode='40001', message='stale_version'; end if;
  select role into role_name from public.workspace_members where workspace_id=d.workspace_id and user_id=auth.uid();
  if p_target_status in ('approved','rejected') and role_name not in ('owner','admin') then
    raise exception using errcode='42501', message='forbidden';
  end if;
  if not ((d.status='draft' and p_target_status in ('approved','rejected','archived')) or
          (d.status='rejected' and p_target_status in ('draft','archived')) or
          (d.status='approved' and p_target_status='archived')) then
    raise exception using errcode='22023', message='invalid_transition';
  end if;
  p_reason := nullif(btrim(p_reason),'');
  if p_target_status='rejected' and p_reason is null then raise exception using errcode='22023', message='reason_required'; end if;
  if char_length(coalesce(p_reason,'')) > 500 then raise exception using errcode='22023', message='invalid_reason'; end if;
  update public.outreach_drafts set status=p_target_status, updated_by=auth.uid(),
    approved_by=case when p_target_status='approved' then auth.uid() else null end,
    approved_at=case when p_target_status='approved' then now() else null end,
    rejected_by=case when p_target_status='rejected' then auth.uid() else null end,
    rejected_at=case when p_target_status='rejected' then now() else null end,
    rejection_reason=case when p_target_status='rejected' then p_reason else null end,
    archived_at=case when p_target_status='archived' then now() else null end
    where id=d.id returning * into d;
  return d;
end $$;

revoke all on function public.create_outreach_draft_version(uuid,integer,text,text,text,integer) from public, anon;
revoke all on function public.transition_outreach_draft(uuid,integer,text,text) from public, anon;
grant execute on function public.create_outreach_draft_version(uuid,integer,text,text,text,integer) to authenticated;
grant execute on function public.transition_outreach_draft(uuid,integer,text,text) to authenticated;
commit;
