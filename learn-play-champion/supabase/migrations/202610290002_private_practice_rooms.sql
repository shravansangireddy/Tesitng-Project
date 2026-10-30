-- Deploy after 202610290001. Rooms are adult-account-managed, one learner per account.
begin;

create table public.practice_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  closed boolean not null default false
);
create unique index one_open_room_per_host on public.practice_rooms(host_id) where not closed;
create table public.practice_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.practice_rooms(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text not null,
  joined_at timestamptz not null default now()
);
create table public.practice_credits (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.practice_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  credited_at timestamptz not null default now(),
  rounds integer not null check (rounds between 1 and 5)
);
create index practice_credits_user_time on public.practice_credits(user_id, credited_at);
create index practice_credits_room_time on public.practice_credits(room_id, credited_at);
create table public.practice_join_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.practice_rooms enable row level security;
alter table public.practice_members enable row level security;
alter table public.practice_credits enable row level security;
alter table public.practice_join_attempts enable row level security;
-- No direct table API, including for members. RPCs return only the allowed fields.
revoke all on public.practice_rooms, public.practice_members, public.practice_credits,
  public.practice_join_attempts from public, anon, authenticated;

create function public.practice_room_snapshot()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  member public.practice_members;
  room public.practice_rooms;
  week_start timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  used integer;
  board jsonb;
begin
  if me is null then raise exception 'Sign in with a grown-up account.' using errcode = '42501'; end if;
  select * into member from public.practice_members where user_id = me;
  if not found then return 'null'::jsonb; end if;
  select * into room from public.practice_rooms where id = member.room_id and not closed;
  if not found then return 'null'::jsonb; end if;
  select coalesce(sum(rounds), 0)::integer into used from public.practice_credits
    where user_id = me and credited_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC');
  select coalesce(jsonb_agg(row_data order by points desc, nickname), '[]'::jsonb) into board from (
    select jsonb_build_object(
      'id', m.id, 'nickname', m.nickname, 'points', coalesce(sum(c.rounds), 0) * 10,
      'isYou', m.user_id = me, 'isHost', m.user_id = room.host_id
    ) as row_data, coalesce(sum(c.rounds), 0) * 10 as points, m.nickname
    from public.practice_members m
    left join public.practice_credits c on c.user_id = m.user_id and c.room_id = m.room_id and c.credited_at >= week_start
      and c.credited_at >= m.joined_at
    where m.room_id = room.id group by m.id
  ) standings;
  return jsonb_build_object(
    'id', room.id, 'isHost', room.host_id = me,
    'inviteCode', case when room.host_id = me then room.invite_code else null end,
    'weekStart', week_start, 'weekEnd', week_start + interval '7 days',
    'todayRounds', least(used, 5), 'members', board
  );
end;
$$;

create function public.create_practice_room(adult_confirmed boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); room_id uuid; member_id uuid := gen_random_uuid();
begin
  if me is null or adult_confirmed is distinct from true then
    raise exception 'A signed-in grown-up must confirm room sharing.' using errcode = '42501';
  end if;
  -- The auth row lock serializes create/join/leave for this account.
  perform 1 from auth.users where id = me for update;
  if exists(select 1 from public.practice_members where user_id = me) then
    raise exception 'Leave or close your current room first.';
  end if;
  if (select count(*) from public.practice_rooms where host_id = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Room creation limit reached. Try tomorrow.';
  end if;
  insert into public.practice_rooms(host_id) values (me) returning id into room_id;
  insert into public.practice_members(id, room_id, user_id, nickname)
    values (member_id, room_id, me, 'Explorer-' || left(replace(member_id::text, '-', ''), 8));
  return public.practice_room_snapshot();
end;
$$;

create function public.join_practice_room(invitation text, adult_confirmed boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); room public.practice_rooms; member_id uuid := gen_random_uuid(); tries integer;
begin
  if me is null or adult_confirmed is distinct from true then
    raise exception 'A signed-in grown-up must confirm room sharing.' using errcode = '42501';
  end if;
  perform 1 from auth.users where id = me for update;
  if exists(select 1 from public.practice_members where user_id = me) then
    raise exception 'Leave or close your current room first.';
  end if;
  insert into public.practice_join_attempts(user_id, attempts) values (me, 1)
  on conflict (user_id) do update set
    attempts = case when practice_join_attempts.window_start < now() - interval '1 hour' then 1 else practice_join_attempts.attempts + 1 end,
    window_start = case when practice_join_attempts.window_start < now() - interval '1 hour' then now() else practice_join_attempts.window_start end
  returning attempts into tries;
  -- Return errors as data here so failed attempts are committed instead of rolled back.
  if tries > 20 then return jsonb_build_object('error', 'Too many join attempts. Try in an hour.'); end if;
  select * into room from public.practice_rooms
    where invite_code = lower(trim(invitation)) and not closed for update;
  if not found then return jsonb_build_object('error', 'Invite not found or room closed. Ask the room host for a current code.'); end if;
  if (select count(*) from public.practice_members where room_id = room.id) >= 30 then
    return jsonb_build_object('error', 'This room is full (30 learners).');
  end if;
  insert into public.practice_members(id, room_id, user_id, nickname)
    values (member_id, room.id, me, 'Explorer-' || left(replace(member_id::text, '-', ''), 8));
  return public.practice_room_snapshot();
end;
$$;

create function public.manage_practice_room(action text, target_member uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); member public.practice_members; room public.practice_rooms;
begin
  if me is null then raise exception 'Sign in with a grown-up account.' using errcode = '42501'; end if;
  perform 1 from auth.users where id = me for update;
  select * into member from public.practice_members where user_id = me;
  if not found then raise exception 'You are not in a room.'; end if;
  select * into room from public.practice_rooms where id = member.room_id and not closed for update;
  if not found then raise exception 'The room is closed.'; end if;
  if action = 'leave' then
    if room.host_id = me then raise exception 'Hosts must close their room instead of leaving.'; end if;
    delete from public.practice_members where id = member.id;
  else
    if room.host_id <> me then raise exception 'Only the room host can do this.' using errcode = '42501'; end if;
    if action = 'rotate' then
      update public.practice_rooms set invite_code = replace(gen_random_uuid()::text, '-', '') where id = room.id;
    elsif action = 'remove' then
      if target_member is null or target_member = member.id then raise exception 'Choose another room member.'; end if;
      delete from public.practice_members where id = target_member and room_id = room.id;
      if not found then raise exception 'That member is no longer in this room.'; end if;
      -- A removed learner must not reuse a previously shared code.
      update public.practice_rooms set invite_code = replace(gen_random_uuid()::text, '-', '') where id = room.id;
    elsif action = 'close' then
      update public.practice_rooms set closed = true where id = room.id;
      delete from public.practice_members where room_id = room.id;
    else raise exception 'Unknown room action.';
    end if;
  end if;
  return public.practice_room_snapshot();
end;
$$;

create function public.credit_private_practice()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare room uuid; old_rounds numeric; new_rounds numeric; available integer; amount integer;
begin
  if auth.uid() is distinct from new.user_id then return new; end if;
  if coalesce(old.data->>'rounds', '') !~ '^[0-9]{1,12}$'
    or coalesce(new.data->>'rounds', '') !~ '^[0-9]{1,12}$' then return new; end if;
  old_rounds := (old.data->>'rounds')::numeric;
  new_rounds := (new.data->>'rounds')::numeric;
  if new_rounds <= old_rounds then return new; end if;
  -- Same account writes are serialized by the learner_progress row update.
  select r.id into room from public.practice_members m join public.practice_rooms r on r.id = m.room_id
    where m.user_id = new.user_id and not r.closed for update of r;
  if not found then return new; end if;
  select greatest(0, 5 - coalesce(sum(rounds), 0))::integer into available from public.practice_credits
    where user_id = new.user_id and credited_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC');
  amount := least(new_rounds - old_rounds, available)::integer;
  if amount > 0 then
    insert into public.practice_credits(room_id, user_id, rounds) values (room, new.user_id, amount);
  end if;
  return new;
end;
$$;
create trigger credit_private_practice_after_save after update on public.learner_progress
  for each row execute function public.credit_private_practice();
revoke all on function public.credit_private_practice() from public, anon, authenticated;
revoke all on function public.practice_room_snapshot(), public.create_practice_room(boolean),
  public.join_practice_room(text, boolean), public.manage_practice_room(text, uuid) from public, anon;
grant execute on function public.practice_room_snapshot(), public.create_practice_room(boolean),
  public.join_practice_room(text, boolean), public.manage_practice_room(text, uuid) to authenticated;
commit;
