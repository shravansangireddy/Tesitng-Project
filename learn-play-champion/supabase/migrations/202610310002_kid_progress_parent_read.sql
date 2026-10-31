-- Let a grown-up read the learning progress saved under their own kid
-- logins, so parents and teachers can follow a child's points, streak,
-- badges, and best scores from the Kid logins area. Read-only: writes to
-- learner_progress still happen only through the owner's save RPC, and
-- this policy only matches rows whose owner is a kid account that
-- belongs to the caller.

create policy "Parents can read their kid logins' progress"
  on public.learner_progress
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.kid_accounts as k
      where k.kid_user_id = learner_progress.user_id
        and k.parent_id = (select auth.uid())
    )
  );
