-- Parent-created kid logins: a grown-up (auth user) creates a username +
-- password login for a child. The child's auth user signs in with a
-- synthetic email (username@kids.learnplaychampion.com) and gets their own
-- learner_progress row like any signed-in user. This table links the child
-- auth user to the parent who manages the login. Creating, resetting, and
-- deleting the child's auth user happens in the kid-accounts Edge Function
-- (service role); parents manage display name and grade directly here.

create table public.kid_accounts (
  kid_user_id uuid primary key references auth.users(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  grade text not null check (grade in ('prek', 'k', '1', '2', '3', '4', '5')),
  created_at timestamptz not null default now(),
  constraint kid_accounts_username_shape check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint kid_accounts_display_name_length check (
    char_length(display_name) between 1 and 20
  )
);

create index kid_accounts_parent_idx on public.kid_accounts (parent_id);

alter table public.kid_accounts enable row level security;

-- No direct inserts: rows are created only by the kid-accounts Edge
-- Function after it creates the child's auth user. Parents may read their
-- children's rows, update display name and grade, and delete the link row
-- (deleting the login itself goes through the Edge Function so the auth
-- user is removed too). A signed-in child may read their own row so the
-- app can greet them and load their grade.
revoke all on public.kid_accounts from public, anon, authenticated;
grant select on public.kid_accounts to authenticated;
grant update (display_name, grade) on public.kid_accounts to authenticated;
grant delete on public.kid_accounts to authenticated;

create policy "Parents can read their kid accounts"
  on public.kid_accounts
  for select
  to authenticated
  using (parent_id = (select auth.uid()));

create policy "Kids can read their own kid account"
  on public.kid_accounts
  for select
  to authenticated
  using (kid_user_id = (select auth.uid()));

create policy "Parents can update their kid accounts"
  on public.kid_accounts
  for update
  to authenticated
  using (parent_id = (select auth.uid()))
  with check (parent_id = (select auth.uid()));

create policy "Parents can delete their kid account links"
  on public.kid_accounts
  for delete
  to authenticated
  using (parent_id = (select auth.uid()));
