-- Run in your own Supabase project's SQL Editor. Never put a service-role key in the app.
begin;

create table public.learner_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint progress_object check (jsonb_typeof(data) = 'object' and data @> '{"version": 1}'::jsonb)
);

alter table public.learner_progress enable row level security;
revoke all on public.learner_progress from public, anon, authenticated;
grant select, insert, update on public.learner_progress to authenticated;

create policy "Adults read only their own learner progress"
  on public.learner_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Adults create only their own learner progress"
  on public.learner_progress for insert to authenticated
  with check ((select auth.uid()) = user_id and revision = 0);
create policy "Adults update only their own learner progress"
  on public.learner_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.save_learner_progress(new_data jsonb, expected_revision integer, expected_user_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare next_revision integer;
begin
  if auth.uid() is null or auth.uid() is distinct from expected_user_id then
    raise exception 'Sign in to the expected account before saving progress.' using errcode = '42501';
  end if;
  update public.learner_progress
    set data = new_data, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision
    returning revision into next_revision;
  if not found then
    raise exception 'Progress conflict. Reload the latest cloud progress.' using errcode = '40001';
  end if;
  return next_revision;
end;
$$;

revoke all on function public.save_learner_progress(jsonb, integer, uuid) from public, anon;
grant execute on function public.save_learner_progress(jsonb, integer, uuid) to authenticated;
commit;
