begin;

create table public.content_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'admin'))
);
create table public.teacher_content (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'rejected', 'published', 'archived')),
  revision integer not null default 0,
  review_note text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default clock_timestamp()
);
create table public.content_audit (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.teacher_content(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  revision integer not null,
  created_at timestamptz not null default clock_timestamp()
);
create index teacher_content_author on public.teacher_content(author_id, id);
create index teacher_content_published_grade on public.teacher_content((payload->>'grade'), id) where status = 'published';
alter table public.content_roles enable row level security;
alter table public.teacher_content enable row level security;
alter table public.content_audit enable row level security;
revoke all on public.content_roles, public.teacher_content, public.content_audit from public, anon, authenticated;

create function public.content_role()
returns text language sql stable security definer set search_path = ''
as $$ select role from public.content_roles where user_id = auth.uid() $$;
revoke all on function public.content_role() from public, anon;
grant execute on function public.content_role() to authenticated;

create function public.validate_teacher_content(value jsonb)
returns void language plpgsql set search_path = ''
as $$
declare q jsonb; choice jsonb; field text; max_length integer;
begin
  if value is null or jsonb_typeof(value) <> 'object' or octet_length(value::text) > 16000 then
    raise exception 'Content must be an object smaller than 16 KB.';
  end if;
  if (value - array['title','grade','subject','kind','passage','questions']) <> '{}'::jsonb then
    raise exception 'Unknown content fields.';
  end if;
  foreach field in array array['title','grade','subject','kind','passage'] loop
    if jsonb_typeof(value->field) is distinct from 'string' then raise exception 'Missing text field: %', field; end if;
  end loop;
  if length(btrim(value->>'title')) = 0 or length(value->>'title') > 120 or
    value->>'grade' not in ('prek','k','1','2','3','4','5') or
    value->>'subject' not in ('english','math') or value->>'kind' not in ('passage','quiz') then
    raise exception 'Choose a title, supported grade, subject, and content type.';
  end if;
  if length(value->>'passage') > 6000 or
    ((value->>'kind' = 'passage') and length(btrim(value->>'passage')) = 0) or
    ((value->>'kind' = 'quiz') and value->>'passage' <> '') then
    raise exception 'Passages need text up to 6000 characters; quizzes do not contain a passage.';
  end if;
  if jsonb_typeof(value->'questions') is distinct from 'array' then raise exception 'Questions must be an array.'; end if;
  if jsonb_array_length(value->'questions') > 5 or
    ((value->>'kind' = 'quiz') and jsonb_array_length(value->'questions') = 0) then
    raise exception 'Use up to five questions, at least one for a quiz.';
  end if;
  for q in select * from jsonb_array_elements(value->'questions') loop
    if jsonb_typeof(q) <> 'object' or (q - array['prompt','choices','answer','explanation']) <> '{}'::jsonb then
      raise exception 'Invalid question fields.';
    end if;
    foreach field in array array['prompt','explanation'] loop
      max_length := case when field = 'prompt' then 300 else 500 end;
      if jsonb_typeof(q->field) is distinct from 'string' or length(btrim(q->>field)) = 0 or length(q->>field) > max_length then
        raise exception 'Questions need a prompt (300 characters) and explanation (500 characters).';
      end if;
    end loop;
    if jsonb_typeof(q->'choices') is distinct from 'array' then raise exception 'Questions need three choices.'; end if;
    if jsonb_array_length(q->'choices') <> 3 then raise exception 'Questions need three choices.'; end if;
    for choice in select * from jsonb_array_elements(q->'choices') loop
      if jsonb_typeof(choice) <> 'string' or length(btrim(choice #>> '{}')) = 0 or length(choice #>> '{}') > 150 then
        raise exception 'Each answer choice needs 1 to 150 characters.';
      end if;
    end loop;
    if (select count(distinct lower(btrim(item))) from jsonb_array_elements_text(q->'choices') item) <> 3 then
      raise exception 'Answer choices must be distinct.';
    end if;
    if jsonb_typeof(q->'answer') is distinct from 'number' or (q->>'answer') not in ('0','1','2') then
      raise exception 'Choose the correct answer.';
    end if;
  end loop;
end;
$$;
revoke all on function public.validate_teacher_content(jsonb) from public, anon, authenticated;

create function public.studio_content(after_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare access text := public.content_role();
begin
  if access is null then raise exception 'Teacher or content administrator access required.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(page) order by page.id) from (
    select id, payload, status, revision, review_note, updated_at, coalesce(author_id = auth.uid(), false) as is_own
    from public.teacher_content
    where (access = 'admin' or author_id = auth.uid()) and (after_id is null or id > after_id)
    order by id limit 25
  ) page), '[]'::jsonb);
end;
$$;
revoke all on function public.studio_content(uuid) from public, anon;
grant execute on function public.studio_content(uuid) to authenticated;

create function public.save_teacher_content(entry_id uuid, new_payload jsonb, expected_revision integer)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare entry public.teacher_content; access text := public.content_role(); me uuid := auth.uid();
begin
  if access is null then raise exception 'Teacher or content administrator access required.' using errcode = '42501'; end if;
  perform public.validate_teacher_content(new_payload);
  if entry_id is null then
    perform 1 from auth.users where id = me for update;
    if (select count(*) from public.teacher_content where author_id = me) >= 100 then
      raise exception 'This author has reached the 100-item limit. Delete unused drafts or contact the operator.';
    end if;
    if expected_revision is distinct from 0 then raise exception 'Invalid new draft revision.'; end if;
    insert into public.teacher_content(author_id, payload) values(me, new_payload) returning * into entry;
  else
    select * into entry from public.teacher_content where id = entry_id for update;
    if not found or entry.author_id is distinct from me or entry.status not in ('draft','rejected') then
      raise exception 'Only your own draft or rejected item can be edited. Published items require a new draft.' using errcode = '42501';
    end if;
    if entry.revision is distinct from expected_revision then raise exception 'Content changed. Refresh before editing.' using errcode = '40001'; end if;
    update public.teacher_content set payload = new_payload, revision = revision + 1,
      status = 'draft', review_note = '', reviewed_by = null, updated_at = clock_timestamp()
      where id = entry_id returning * into entry;
  end if;
  insert into public.content_audit(content_id, actor_id, action, revision) values(entry.id, me, 'save', entry.revision);
  return entry.id;
end;
$$;
revoke all on function public.save_teacher_content(uuid, jsonb, integer) from public, anon;
grant execute on function public.save_teacher_content(uuid, jsonb, integer) to authenticated;

create function public.review_teacher_content(entry_id uuid, expected_revision integer, action text, note text default '')
returns boolean language plpgsql security definer set search_path = ''
as $$
declare entry public.teacher_content; access text := public.content_role(); me uuid := auth.uid();
begin
  if access is null then raise exception 'Teacher or content administrator access required.' using errcode = '42501'; end if;
  select * into entry from public.teacher_content where id = entry_id for update;
  if not found then raise exception 'Content was not found.'; end if;
  if entry.revision is distinct from expected_revision then raise exception 'Content changed. Refresh before reviewing.' using errcode = '40001'; end if;
  if action = 'submit' then
    if entry.author_id is distinct from me or entry.status not in ('draft','rejected') then
      raise exception 'Submit only your own draft or rejected item.' using errcode = '42501';
    end if;
    perform public.validate_teacher_content(entry.payload);
    update public.teacher_content set status = 'submitted', review_note = '', reviewed_by = null where id = entry_id;
  elsif action = 'delete' then
    if entry.author_id is distinct from me or entry.status not in ('draft','rejected') then
      raise exception 'Delete only your own draft or rejected item.' using errcode = '42501';
    end if;
    delete from public.teacher_content where id = entry_id;
    return true;
  elsif action in ('publish','reject','archive') then
    if access <> 'admin' then raise exception 'Content administrator approval required.' using errcode = '42501'; end if;
    if note is null or length(note) > 1000 or (action in ('reject','archive') and length(btrim(note)) = 0) then
      raise exception 'Supply a review reason up to 1000 characters.';
    end if;
    if (action in ('publish','reject') and entry.status <> 'submitted') or (action = 'archive' and entry.status <> 'published') then
      raise exception 'This review action is not available in the current state.';
    end if;
    perform public.validate_teacher_content(entry.payload);
    update public.teacher_content set status = case action when 'publish' then 'published' when 'reject' then 'rejected' else 'archived' end,
      reviewed_by = me, review_note = note where id = entry_id;
  else raise exception 'Unknown content action.';
  end if;
  update public.teacher_content set revision = revision + 1, updated_at = clock_timestamp() where id = entry_id;
  insert into public.content_audit(content_id, actor_id, action, revision) values(entry_id, me, action, entry.revision + 1);
  return true;
end;
$$;
revoke all on function public.review_teacher_content(uuid, integer, text, text) from public, anon;
grant execute on function public.review_teacher_content(uuid, integer, text, text) to authenticated;

-- Published teaching material is public, never drafts, author identities, or review notes.
create function public.published_teacher_content(learning_grade text, after_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if learning_grade is null or learning_grade not in ('prek','k','1','2','3','4','5') then raise exception 'Choose a supported grade.'; end if;
  return coalesce((select jsonb_agg(to_jsonb(page) order by page.id) from (
    select id, payload, revision from public.teacher_content
    where status = 'published' and payload->>'grade' = learning_grade and (after_id is null or id > after_id)
    order by id limit 25
  ) page), '[]'::jsonb);
end;
$$;
revoke all on function public.published_teacher_content(text, uuid) from public;
grant execute on function public.published_teacher_content(text, uuid) to anon, authenticated;
commit;
