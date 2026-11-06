-- Registered parents for administrators: one row per grown-up account
-- (registered parent), with counts of the kid logins they manage and
-- those kids' tasks — including the task titles — listed flat under
-- the parent. Built for the Parents dashboard's admin area, beside the
-- payment records console.
--
-- Privacy shape (deliberate):
--   * Kid accounts NEVER appear as rows: a "parent" here is an
--     auth.users row whose id is not a kid login
--     (kid_accounts.kid_user_id).
--   * No kid names, kid usernames, or per-kid grouping appear anywhere
--     in the result — tasks are flattened under the parent, so nothing
--     says which kid a task belongs to. Only counts and task titles
--     (with their done state) cross the wire.
--   * A kid co-managed by two grown-ups counts under BOTH of them
--     (kid_count, and their tasks likewise), matching the per-parent
--     view kid_account_parents gives the rest of the app.
--
-- Access: server-assigned payment administrators only, exactly like
-- admin_payment_events — execute is granted to authenticated, and the
-- in-function is_payment_admin() guard does the real gating, raising
-- 42501 for everyone else (non-admin grown-ups, kid logins, and
-- signed-out callers, for whom is_payment_admin() is false).

create or replace function public.admin_registered_parents()
returns table (
  parent_user_id uuid,
  email text,
  registered_at timestamptz,
  kid_count integer,
  task_count integer,
  tasks_done integer,
  task_titles jsonb
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
    ), '[]'::jsonb) as task_titles
  from auth.users u
  where not exists (
    select 1 from public.kid_accounts ka where ka.kid_user_id = u.id
  )
  order by u.created_at asc, u.id asc;
end;
$$;

revoke all on function public.admin_registered_parents() from public, anon, authenticated;
grant execute on function public.admin_registered_parents() to authenticated;
