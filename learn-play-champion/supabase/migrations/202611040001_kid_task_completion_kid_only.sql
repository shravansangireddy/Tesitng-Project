-- Kid-only task completion: a kid's assignment can be marked done ONLY by
-- the kid, from their own login — never by a parent.
--
-- Why this migration exists: the base kid_tasks migration (202610310003)
-- granted UPDATE on (title, activity, done, completed_at) to the
-- authenticated role as a whole, and the parent policies (split per command
-- in 202610310005) include "Parents can update their kids' tasks". Column
-- grants and RLS policies act on the authenticated role, not on which
-- family member is calling, so a parent session could update done /
-- completed_at directly even though the app never offers it. RLS also
-- cannot compare the old and new row, so the distinction is enforced here
-- with a BEFORE trigger — the one place OLD vs NEW is visible:
--
--   * An authenticated caller who is NOT the task's kid may not change
--     done or completed_at (UPDATE), and may not create a task that is
--     already completed (INSERT with done = true or a completed_at).
--   * The kid (kid_user_id = auth.uid()) may flip their own completion
--     either way, exactly as the app's Done ✓ button does.
--   * Parents keep everything else: read, add, retitle/relink, delete —
--     the existing policies are untouched.
--   * auth.uid() is null for the service role (the kid-accounts Edge
--     Function's starter-task seeding inserts with done = false and never
--     touches completion), which stays allowed.

create or replace function public.guard_kid_task_completion()
returns trigger
language plpgsql
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is not null and caller <> new.kid_user_id then
    if tg_op = 'INSERT' then
      if new.done or new.completed_at is not null then
        raise exception 'Only the kid can complete their own task';
      end if;
    elsif new.done is distinct from old.done
       or new.completed_at is distinct from old.completed_at then
      raise exception 'Only the kid can complete their own task';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists kid_tasks_guard_completion on public.kid_tasks;
create trigger kid_tasks_guard_completion
  before insert or update on public.kid_tasks
  for each row
  execute function public.guard_kid_task_completion();
