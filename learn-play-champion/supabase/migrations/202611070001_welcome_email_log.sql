-- Welcome email log: one row per welcome email actually sent, so the
-- one-send promise ("no parent is welcomed twice, no kid is welcomed
-- twice") is a database guarantee instead of a hope held by two
-- different Edge Functions.
--
-- Who writes here:
--   * the welcome-email function records kind = 'parent_welcome' after
--     sending a newly registered grown-up their welcome;
--   * the kid-accounts create action records kind = 'kid_welcome' (with
--     kid_user_id) after sending the creating grown-up the
--     "your kid's login is ready" email.
-- Both functions check the log before sending and write only after a
-- successful send; mail that is not configured yet leaves no row, so
-- the welcome can still go out once the SMTP secrets are set.
--
-- Access shape (deliberate): the table is service-role only. RLS is
-- enabled and there are NO policies and NO grants for anon or
-- authenticated — the Edge Functions reach it with the service-role
-- key, which bypasses RLS, and no client can read or forge a row.
-- Nothing in the app reads this table; it exists so the functions can
-- dedupe, and so the operator can audit what was sent from SQL.
--
-- One-send guarantee: the unique index keys on (user_id, kind, kid),
-- with a NULL kid counting as the all-zero uuid, so a parent welcome
-- (kid_user_id is null) can be recorded exactly once per grown-up, and
-- a kid welcome exactly once per (grown-up, kid) — while a second kid
-- under the same grown-up is a different key and gets its own welcome.

create table if not exists public.welcome_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  kid_user_id uuid,
  sent_at timestamptz not null default now(),
  constraint welcome_email_log_kind_known check (
    kind in ('parent_welcome', 'kid_welcome')
  )
);

create unique index if not exists welcome_email_log_once_idx
  on public.welcome_email_log (
    user_id,
    kind,
    coalesce(kid_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.welcome_email_log enable row level security;

-- Service-role only: no policies exist, and no role below gets a grant.
revoke all on public.welcome_email_log from public, anon, authenticated;
