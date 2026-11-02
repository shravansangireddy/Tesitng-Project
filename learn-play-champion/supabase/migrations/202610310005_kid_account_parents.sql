-- Co-parenting: a kid login can be managed by more than one grown-up.
-- kid_accounts.parent_id stays the creator ("owner"); this link table
-- lists every grown-up who may manage the login (reset its PIN, pause
-- it, assign tasks, read its progress). The owner is always linked.
-- Access policies that used to check kid_accounts.parent_id now check
-- membership in this table. Links are written only by the kid-accounts
-- Edge Function (service role) or from the dashboard — never directly
-- by clients.

create table public.kid_account_parents (
  kid_user_id uuid not null
    references public.kid_accounts (kid_user_id) on delete cascade,
  parent_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kid_user_id, parent_id)
);

create index kid_account_parents_parent_idx
  on public.kid_account_parents (parent_id);

alter table public.kid_account_parents enable row level security;

revoke all on public.kid_account_parents from public, anon, authenticated;
grant select on public.kid_account_parents to authenticated;

create policy "Parents can read their kid account links"
  on public.kid_account_parents
  for select
  to authenticated
  using (parent_id = (select auth.uid()));

create policy "Kids can read their own kid account links"
  on public.kid_account_parents
  for select
  to authenticated
  using (kid_user_id = (select auth.uid()));

-- Every existing kid login starts with its creator linked.
insert into public.kid_account_parents (kid_user_id, parent_id)
select kid_user_id, parent_id from public.kid_accounts
on conflict do nothing;

-- kid_accounts: any linked grown-up may read / update / delete the link
-- row (deleting a login still goes through the Edge Function).
drop policy "Parents can read their kid accounts" on public.kid_accounts;
create policy "Parents can read their kid accounts"
  on public.kid_accounts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_accounts.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );

drop policy "Parents can update their kid accounts" on public.kid_accounts;
create policy "Parents can update their kid accounts"
  on public.kid_accounts
  for update
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_accounts.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_accounts.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );

drop policy "Parents can delete their kid account links" on public.kid_accounts;
create policy "Parents can delete their kid account links"
  on public.kid_accounts
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_accounts.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );

-- Progress viewing follows the same link.
drop policy "Parents can read their kid logins' progress" on public.learner_progress;
create policy "Parents can read their kid logins' progress"
  on public.learner_progress
  for select
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = learner_progress.user_id
        and kap.parent_id = (select auth.uid())
    )
  );

-- Tasks: any linked grown-up manages them; the row still records which
-- grown-up added it (inserts must stamp the caller's own id).
drop policy "Parents manage their kids' tasks" on public.kid_tasks;

create policy "Parents can read their kids' tasks"
  on public.kid_tasks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_tasks.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );

create policy "Parents can add tasks for their kids"
  on public.kid_tasks
  for insert
  to authenticated
  with check (
    parent_id = (select auth.uid())
    and exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_tasks.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );

create policy "Parents can update their kids' tasks"
  on public.kid_tasks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_tasks.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_tasks.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );

create policy "Parents can delete their kids' tasks"
  on public.kid_tasks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.kid_account_parents as kap
      where kap.kid_user_id = kid_tasks.kid_user_id
        and kap.parent_id = (select auth.uid())
    )
  );
