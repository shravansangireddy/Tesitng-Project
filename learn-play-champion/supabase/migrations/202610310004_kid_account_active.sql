-- Parents can pause a kid login: kid_accounts gains an `active` flag.
-- The flag is the record parents see in the app; the actual sign-in block
-- is enforced by the kid-accounts Edge Function, which bans/unbans the
-- kid's auth user when the parent flips the switch (set_active action).

alter table public.kid_accounts
  add column if not exists active boolean not null default true;

grant update (active) on public.kid_accounts to authenticated;
