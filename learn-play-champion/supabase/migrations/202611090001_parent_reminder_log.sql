-- Parent reminder log + reminder status on the registered-parents
-- list: the administrator can send a registered grown-up a short
-- motivational email nudging them to add their kid's login (the
-- parent-reminder Edge Function), and the Parents dashboard shows —
-- per parent — whether a reminder has ever gone out, when the last
-- one was sent, and how many in total.
--
-- Who writes here: only the parent-reminder function, and only after
-- a successful send (mail that is not configured yet leaves no row,
-- exactly like welcome_email_log). History is kept — one row per
-- send — so the panel derives both the count and the last-sent time
-- from this table.
--
-- Access shape (deliberate, mirroring welcome_email_log): the table
-- is service-role only. RLS is enabled and there are NO policies and
-- NO grants for anon or authenticated — the function reaches it with
-- the service-role key, and no client can read or forge a row. The
-- administrator sees the derived status through
-- admin_registered_parents(), never the table itself.
--
-- admin_registered_parents() is recreated with two more columns
-- (reminder_count, last_reminder_at) appended to its result. The
-- fields describe the parent row only — the no-kid-names rule is
-- unchanged. CREATE OR REPLACE cannot grow a function's return type,
-- so the old definition is dropped first; the is_payment_admin()
-- guard and the grants are reapplied verbatim below.

create table if not exists public.parent_reminder_log (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.parent_reminder_log enable row level security;

-- Service-role only: no policies exist, and no role below gets a grant.
revoke all on public.parent_reminder_log from public, anon, authenticated;

drop function if exists public.admin_registered_parents();

create function public.admin_registered_parents()
returns table (
  parent_user_id uuid,
  email text,
  registered_at timestamptz,
  kid_count integer,
  task_count integer,
  tasks_done integer,
  task_titles jsonb,
  reminder_count integer,
  last_reminder_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_payment_admin() then
    raise exception 'Payment administrator access is required.' using errcode = '42501';
  end if;
  return query
  select
    u.id as parent_user_id,
    u.email::text as email,
    u.created_at as registered_at,
    (select count(*)::integer
       from public.kid_account_parents kap
      where kap.parent_id = u.id) as kid_count,
    (select count(*)::integer
       from public.kid_tasks kt
       join public.kid_account_parents kap
         on kap.kid_user_id = kt.kid_user_id
      where kap.parent_id = u.id) as task_count,
    (select count(*)::integer
       from public.kid_tasks kt
       join public.kid_account_parents kap
         on kap.kid_user_id = kt.kid_user_id
      where kap.parent_id = u.id and kt.done) as tasks_done,
    -- task_titles carries each task's title with its done state, as a
    -- jsonb array of {"title", "done"} objects ordered by the task's
    -- creation time — flat under the parent, never labeled by kid.
    coalesce((
      select jsonb_agg(
               jsonb_build_object('title', t.title, 'done', t.done)
               order by t.created_at, t.id
             )
        from public.kid_tasks t
        join public.kid_account_parents kap
          on kap.kid_user_id = t.kid_user_id
       where kap.parent_id = u.id
    ), '[]'::jsonb) as task_titles,
    -- Reminder status for THIS parent only: how many reminder emails
    -- the parent-reminder function has sent them, and when the most
    -- recent one went out (null when none ever has).
    (select count(*)::integer
       from public.parent_reminder_log prl
      where prl.parent_user_id = u.id) as reminder_count,
    (select max(prl.sent_at)
       from public.parent_reminder_log prl
      where prl.parent_user_id = u.id) as last_reminder_at
  from auth.users u
  where not exists (
    select 1 from public.kid_accounts ka where ka.kid_user_id = u.id
  )
  order by u.created_at asc, u.id asc;
end;
$$;

revoke all on function public.admin_registered_parents() from public, anon, authenticated;
grant execute on function public.admin_registered_parents() to authenticated;
