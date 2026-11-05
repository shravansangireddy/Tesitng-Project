-- Same-grade nickname boards for grown-ups: for each grade where the
-- signed-in parent has at least one linked kid login, return every kid
-- login in that grade ranked by points. Other families' kids appear
-- ONLY under their Explorer nickname — the same nickname the Private
-- Rooms feature shows for that account — and their account ids and real
-- names are never returned. The caller's own kids keep their real
-- display name and id, flagged with is_mine.
--
-- Nicknames: a room membership stores its nickname in
-- practice_members.nickname, generated when the member joins as
-- 'Explorer-' || left(replace(member_id::text, '-', ''), 8) over the
-- membership row's own random id — so the nickname is not a function of
-- the account alone. To show the IDENTICAL nickname, this function
-- reuses the stored practice_members.nickname when the kid currently
-- belongs to a room (user_id is unique there, so at most one exists),
-- and falls back to the same expression over the kid's own user id when
-- they have never joined a room. Both forms match the
-- 'Explorer-' + 8 lowercase hex shape the client validates.
--
-- Points, streak, and rounds are read straight from the top level of
-- the learner_progress blob — exactly the fields summarizeProgress() in
-- src/kid-accounts.ts copies out of the parsed Progress object. The
-- client only accepts non-negative safe integers there, so each value
-- is guarded with the same numeric-shape check the room-credit trigger
-- uses and falls back to 0 (a kid with no saved progress yet scores 0,
-- like the Family Leaderboard). Ranking follows the family board:
-- points desc, streak desc, rounds desc, then name.
--
-- Boards are capped at the top 25 rows per grade, but the caller's own
-- kids are always included, even below the cap. A caller with no linked
-- kid in a grade learns nothing about that grade; kid logins themselves
-- get no rows at all.

create or replace function public.my_kids_grade_boards()
returns table (
  grade text,
  kid_user_id uuid,
  display_name text,
  nickname text,
  points integer,
  streak integer,
  rounds integer,
  is_mine boolean,
  board_rank integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Sign in with a grown-up account.' using errcode = '42501';
  end if;
  -- Kid logins never see grade boards, even if data anomalies ever
  -- linked one as a "parent" of another login.
  if exists (select 1 from public.kid_accounts ka where ka.kid_user_id = me) then
    return;
  end if;
  return query
  with my_kids as (
    -- "My kids" resolves exactly like fetchMyKidAccounts: membership in
    -- kid_account_parents (the creator is always linked; co-parents are
    -- linked too).
    select ka.kid_user_id as kid_id, ka.grade as kid_grade
    from public.kid_accounts ka
    join public.kid_account_parents kap
      on kap.kid_user_id = ka.kid_user_id
     and kap.parent_id = me
  ),
  my_grades as (
    select distinct mk.kid_grade as g from my_kids mk
  ),
  board as (
    select
      ka.grade as g,
      ka.kid_user_id as kid,
      case when mk.kid_id is not null then ka.display_name end as dname,
      coalesce(
        pm.nickname,
        'Explorer-' || left(replace(ka.kid_user_id::text, '-', ''), 8)
      ) as nick,
      case
        when coalesce(lp.data->>'points', '') ~ '^[0-9]{1,12}$'
          then least((lp.data->>'points')::bigint, 2147483647)::integer
        else 0
      end as pts,
      case
        when coalesce(lp.data->>'streak', '') ~ '^[0-9]{1,12}$'
          then least((lp.data->>'streak')::bigint, 2147483647)::integer
        else 0
      end as strk,
      case
        when coalesce(lp.data->>'rounds', '') ~ '^[0-9]{1,12}$'
          then least((lp.data->>'rounds')::bigint, 2147483647)::integer
        else 0
      end as rnds,
      (mk.kid_id is not null) as mine
    from public.kid_accounts ka
    join my_grades mg on mg.g = ka.grade
    left join my_kids mk on mk.kid_id = ka.kid_user_id
    left join public.learner_progress lp on lp.user_id = ka.kid_user_id
    left join public.practice_members pm on pm.user_id = ka.kid_user_id
  ),
  ranked as (
    select
      b.*,
      rank() over (
        partition by b.g order by b.pts desc, b.strk desc, b.rnds desc
      )::integer as rnk,
      row_number() over (
        partition by b.g
        order by b.pts desc, b.strk desc, b.rnds desc,
                 coalesce(b.dname, b.nick), b.kid
      ) as pos
    from board b
  )
  select
    r.g,
    case when r.mine then r.kid end,
    r.dname,
    r.nick,
    r.pts,
    r.strk,
    r.rnds,
    r.mine,
    r.rnk
  from ranked r
  where r.pos <= 25 or r.mine
  order by r.g, r.pos;
end;
$$;

revoke all on function public.my_kids_grade_boards() from public, anon, authenticated;
grant execute on function public.my_kids_grade_boards() to authenticated;
