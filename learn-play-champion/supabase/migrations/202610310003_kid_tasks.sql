-- Kid tasks: a grown-up gives a kid login a short job list ("Play Math
-- Mountain", "Read a picture book"). After the kid signs in, the tasks appear
-- on their home screen; a task can deep-link straight into an activity, and
-- the kid checks it off when finished. The grown-up sees done/waiting state.
--
-- Access model:
--   * The parent who owns the kid login (per kid_accounts) can read, create,
--     update and delete that kid's tasks.
--   * The kid can read their own tasks and update them (in practice the app
--     only lets a kid flip done/completed_at on their own tasks).
-- Nobody else can see or touch a task row.

create table if not exists public.kid_tasks (
  id uuid primary key default gen_random_uuid(),
  kid_user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  activity text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.kid_tasks enable row level security;

grant select, insert, delete on public.kid_tasks to authenticated;
grant update (title, activity, done, completed_at) on public.kid_tasks to authenticated;

drop policy if exists "Parents manage their kids' tasks" on public.kid_tasks;
create policy "Parents manage their kids' tasks"
  on public.kid_tasks
  for all
  to authenticated
  using (
    parent_id = auth.uid()
    and exists (
      select 1 from public.kid_accounts k
      where k.kid_user_id = kid_tasks.kid_user_id
        and k.parent_id = auth.uid()
    )
  )
  with check (
    parent_id = auth.uid()
    and exists (
      select 1 from public.kid_accounts k
      where k.kid_user_id = kid_tasks.kid_user_id
        and k.parent_id = auth.uid()
    )
  );

drop policy if exists "Kids read their own tasks" on public.kid_tasks;
create policy "Kids read their own tasks"
  on public.kid_tasks
  for select
  to authenticated
  using (kid_user_id = auth.uid());

drop policy if exists "Kids update their own tasks" on public.kid_tasks;
create policy "Kids update their own tasks"
  on public.kid_tasks
  for update
  to authenticated
  using (kid_user_id = auth.uid())
  with check (kid_user_id = auth.uid());
