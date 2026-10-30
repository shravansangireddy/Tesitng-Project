-- Deploy after progress and private-room migrations.
begin;
create function public.erase_my_learning_data()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in to erase your learning data.' using errcode = '42501'; end if;
  perform 1 from auth.users where id = me for update;
  -- Removing the progress row makes stale revision-checked saves fail.
  delete from public.learner_progress where user_id = me;
  delete from public.practice_rooms where host_id = me;
  delete from public.practice_members where user_id = me;
  delete from public.practice_credits where user_id = me;
  delete from public.practice_join_attempts where user_id = me;
  return true;
end;
$$;
revoke all on function public.erase_my_learning_data() from public, anon;
grant execute on function public.erase_my_learning_data() to authenticated;
commit;
