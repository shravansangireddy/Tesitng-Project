-- Stored privacy-policy agreement for grown-ups: when a parent agrees to
-- the privacy policy in the Parents dashboard, the agreement is saved to
-- their account — which policy version, when they agreed, and when they
-- withdrew — so it can be retrieved later, on any device.
--
-- Why this migration exists: until now every consent checkbox in the app
-- was transient (React state only), and the server-checked ones (the
-- rooms RPCs' adult_confirmed, the donations Edge Function's
-- adultConfirmed) were validated in the moment and never recorded. There
-- was no durable record that a parent ever agreed, and no policy version
-- anywhere to tie an agreement to.
--
-- Shape, mirroring the repo's existing patterns:
--   * One row per (account, policy version). Agreeing again to the same
--     version refreshes the same row instead of piling up duplicates.
--   * Parents can READ their own rows directly (RLS, like kid_accounts).
--   * Writes happen ONLY through the two SECURITY DEFINER RPCs below
--     (like the practice-room RPCs): there is no direct insert, update,
--     or delete grant for authenticated, so a client cannot forge an
--     agreement timestamp or edit another account's record.
--   * Each RPC derives the account from auth.uid() and refuses to run
--     signed out; accepted_at / withdrawn_at are stamped by the server.
--   * Deleting the adult auth account deletes its consent rows
--     (on delete cascade), matching the kid_accounts link tables.

create table if not exists public.parent_privacy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  notice_url text,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint parent_privacy_consents_version_present check (
    char_length(btrim(policy_version)) > 0
  ),
  unique (user_id, policy_version)
);

alter table public.parent_privacy_consents enable row level security;

-- Reads are the parent's own rows only; there are deliberately no write
-- grants — the RPCs below are the only way in.
revoke all on public.parent_privacy_consents from public, anon, authenticated;
grant select on public.parent_privacy_consents to authenticated;

drop policy if exists "Parents read their own privacy consent"
  on public.parent_privacy_consents;
create policy "Parents read their own privacy consent"
  on public.parent_privacy_consents
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Records (or re-records) the signed-in grown-up's agreement to one
-- policy version: stamps accepted_at with the server clock and clears
-- any earlier withdrawal of that same version.
create or replace function public.record_my_privacy_policy_consent(
  p_policy_version text,
  p_notice_url text
)
returns public.parent_privacy_consents
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  version text := btrim(coalesce(p_policy_version, ''));
  saved public.parent_privacy_consents;
begin
  if me is null then
    raise exception 'Sign in with a grown-up account to record your agreement.'
      using errcode = '42501';
  end if;
  if version = '' then
    raise exception 'A privacy policy version is required.'
      using errcode = '22023';
  end if;
  insert into public.parent_privacy_consents (user_id, policy_version, notice_url)
  values (me, version, nullif(btrim(coalesce(p_notice_url, '')), ''))
  on conflict (user_id, policy_version) do update
    set accepted_at = now(),
        withdrawn_at = null,
        notice_url = excluded.notice_url
  returning * into saved;
  return saved;
end;
$$;

-- Withdraws the signed-in grown-up's agreement to one policy version.
-- Returns the updated row, or no row when they never agreed to that
-- version (withdrawing is then a safe no-op).
create or replace function public.withdraw_my_privacy_policy_consent(
  p_policy_version text
)
returns public.parent_privacy_consents
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  version text := btrim(coalesce(p_policy_version, ''));
  saved public.parent_privacy_consents;
begin
  if me is null then
    raise exception 'Sign in with a grown-up account to withdraw your agreement.'
      using errcode = '42501';
  end if;
  if version = '' then
    raise exception 'A privacy policy version is required.'
      using errcode = '22023';
  end if;
  update public.parent_privacy_consents
     set withdrawn_at = now()
   where user_id = me
     and policy_version = version
  returning * into saved;
  return saved;
end;
$$;

revoke all on function public.record_my_privacy_policy_consent(text, text),
  public.withdraw_my_privacy_policy_consent(text) from public, anon, authenticated;
grant execute on function public.record_my_privacy_policy_consent(text, text),
  public.withdraw_my_privacy_policy_consent(text) to authenticated;
