// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function asUser(user, sql, args = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${user}';`);
  try { return await db.query(sql, args); }
  finally { await db.exec("reset role; reset request.jwt.claim.sub;"); }
}
async function rpc(user, name, args = []) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
  return (await asUser(user, `select public.${name}(${placeholders}) as result`, args)).rows[0].result;
}
async function denied(user, sql, args = []) {
  await assert.rejects(() => asUser(user, sql, args));
  checks++;
}
async function save(user, rounds, revision, extra = {}) {
  return rpc(user, "save_learner_progress", [{ version: 1, rounds, answered: rounds * 5, ...extra }, revision, user]);
}
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  for (const name of ["202610290001_learner_progress.sql", "202610290002_private_practice_rooms.sql", "202610290003_erase_learning_data.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }
  for (let i = 1; i <= 40; i++) {
    await db.query("insert into auth.users(id) values ($1)", [id(i)]);
    await db.query("insert into public.learner_progress(user_id,data) values ($1,$2)", [id(i), { version: 1, rounds: 0, answered: 0 }]);
  }
  const host = id(1), learner = id(2), outsider = id(3);
  await denied(host, "select * from public.practice_rooms");
  await denied(host, "insert into public.practice_members(room_id,user_id,nickname) values (gen_random_uuid(),$1,'Real name')", [host]);
  await db.exec("set role anon");
  await assert.rejects(() => db.query("select public.practice_room_snapshot()")); checks++;
  await assert.rejects(() => db.query("select public.erase_my_learning_data()")); checks++;
  await db.exec("reset role");
  await assert.rejects(() => rpc("", "create_practice_room", [true])); checks++;
  await assert.rejects(() => rpc(host, "create_practice_room", [false])); checks++;
  check(await rpc(host, "practice_room_snapshot") === null, "No fictional room before creation");
  const room = await rpc(host, "create_practice_room", [true]);
  check(room.isHost && room.members.length === 1, "Host is a room member");
  check(/^[0-9a-f]{32}$/.test(room.inviteCode), "Invite is an unguessable UUID-v4 code");
  check(room.members[0].isYou && /^Explorer-[0-9a-f]{8}$/.test(room.members[0].nickname), "Generated nickname without an email");
  check(Date.parse(room.weekEnd) - Date.parse(room.weekStart) === 7 * 86400000, "UTC weekly interval");
  check(new Date(room.weekStart).getUTCDay() === 1 && new Date(room.weekStart).getUTCHours() === 0, "Monday UTC reset boundary");
  await assert.rejects(() => rpc(host, "create_practice_room", [true])); checks++;
  check(await rpc(outsider, "practice_room_snapshot") === null, "Outsiders cannot inspect another room");
  const joined = await rpc(learner, "join_practice_room", [room.inviteCode.toUpperCase(), true]);
  check(!joined.isHost && joined.inviteCode === null && joined.members.length === 2, "Members see only private standings, not the invite");
  check(!JSON.stringify(joined).includes(host), "Host account IDs are not disclosed");
  await assert.rejects(() => rpc(learner, "manage_practice_room", ["rotate", null])); checks++;
  await assert.rejects(() => rpc(learner, "manage_practice_room", ["close", null])); checks++;
  await assert.rejects(() => rpc(learner, "manage_practice_room", ["remove", room.members[0].id])); checks++;
  const rotated = await rpc(host, "manage_practice_room", ["rotate", null]);
  check(rotated.inviteCode !== room.inviteCode, "Host replaces invitation");
  const oldInvite = await rpc(outsider, "join_practice_room", [room.inviteCode, true]);
  check(!!oldInvite.error, "Rotated invitations no longer work");

  await save(learner, 1, 0);
  let state = await rpc(learner, "practice_room_snapshot");
  check(state.todayRounds === 1 && state.members.find((m) => m.isYou).points === 10, "Saved round receives ten room points");
  await save(learner, 1, 1, { theme: "ocean", selectedGrade: "4" });
  check((await rpc(learner, "practice_room_snapshot")).todayRounds === 1, "Settings do not earn room points");
  await assert.rejects(() => save(learner, 2, 0)); checks++;
  check((await rpc(learner, "practice_room_snapshot")).todayRounds === 1, "Failed revision saves do not award credits");
  await save(learner, 9, 2);
  state = await rpc(learner, "practice_room_snapshot");
  check(state.todayRounds === 5 && state.members.find((m) => m.isYou).points === 50, "Coalesced saves respect server daily cap");
  await save(learner, 10, 3);
  check((await rpc(learner, "practice_room_snapshot")).todayRounds === 5, "More saves cannot exceed daily cap");
  await rpc(learner, "manage_practice_room", ["leave", null]);
  check(await rpc(learner, "practice_room_snapshot") === null, "Leaving revokes room visibility");
  await rpc(learner, "join_practice_room", [rotated.inviteCode, true]);
  await save(learner, 11, 4);
  state = await rpc(learner, "practice_room_snapshot");
  check(state.todayRounds === 5, "Leaving and rejoining cannot reset daily quota");
  check(state.members.find((m) => m.isYou).points === 0, "Rejoining hides earlier standing");

  const ownMember = state.members.find((m) => m.isYou);
  const removed = await rpc(host, "manage_practice_room", ["remove", ownMember.id]);
  check(removed.members.length === 1 && removed.inviteCode !== rotated.inviteCode, "Removal hides member and rotates code");
  check(await rpc(learner, "practice_room_snapshot") === null, "Removed member loses access");
  await rpc(learner, "join_practice_room", [removed.inviteCode, true]);
  await db.query("update public.practice_credits set credited_at = date_trunc('week', now() at time zone 'UTC') at time zone 'UTC' - interval '1 second' where user_id=$1", [learner]);
  state = await rpc(learner, "practice_room_snapshot");
  check(state.members.find((m) => m.isYou).points === 0 && state.todayRounds === 0, "Past-week credits do not leak into current week or daily cap");
  await save(learner, 12, 5);
  check((await rpc(learner, "practice_room_snapshot")).members.find((m) => m.isYou).points === 10, "New server day/week permits fresh credits");
  check((await asUser(learner, "select * from public.learner_progress where user_id=$1", [host])).rows.length === 0,
    "Account RLS still hides another learner's progress");
  await denied(learner, "update public.practice_credits set rounds=5");
  for (let i = 0; i < 20; i++) await rpc(outsider, "join_practice_room", ["0".repeat(32), true]);
  check((await rpc(outsider, "join_practice_room", [removed.inviteCode, true])).error.includes("Too many"),
    "Failed invite attempts persist and throttle valid attempts after the limit");
  for (let n = 4; n <= 31; n++) await rpc(id(n), "join_practice_room", [removed.inviteCode, true]);
  check((await rpc(host, "practice_room_snapshot")).members.length === 30, "Room supports thirty members");
  check((await rpc(id(32), "join_practice_room", [removed.inviteCode, true])).error.includes("full"), "Full rooms reject another member");
  const secondRoom = await rpc(id(40), "create_practice_room", [true]);
  const strangerMember = secondRoom.members[0].id;
  await assert.rejects(() => rpc(host, "manage_practice_room", ["remove", strangerMember])); checks++;
  await rpc(host, "manage_practice_room", ["close", null]);
  check(await rpc(learner, "practice_room_snapshot") === null, "Closing revokes all room memberships");
  check((await rpc(id(33), "join_practice_room", [removed.inviteCode, true])).error.includes("closed"), "Closed invitations cannot be joined");
  check((await db.query("select count(*)::integer as n from public.practice_credits where room_id=$1", [room.id])).rows[0].n > 0,
    "Closed rooms retain accounting records for retention policy");
  await rpc(learner, "join_practice_room", [secondRoom.inviteCode, true]);
  check((await rpc(learner, "practice_room_snapshot")).members.find((m) => m.isYou).points === 0, "Historical personal rounds are not imported");
  await save(learner, 25, 6);
  check((await rpc(learner, "practice_room_snapshot")).todayRounds === 5, "Daily cap follows account across rooms");
  for (let n = 0; n < 4; n++) {
    await rpc(host, "create_practice_room", [true]);
    await rpc(host, "manage_practice_room", ["close", null]);
  }
  await assert.rejects(() => rpc(host, "create_practice_room", [true])); checks++;
  await db.query("delete from auth.users where id=$1", [learner]);
  check((await db.query("select count(*)::integer as n from public.practice_members where user_id=$1", [learner])).rows[0].n === 0,
    "Account deletion removes membership");
  check((await db.query("select count(*)::integer as n from public.practice_credits where user_id=$1", [learner])).rows[0].n === 0,
    "Account deletion removes credits");
  const erasableRoom = await rpc(id(4), "create_practice_room", [true]);
  await rpc(id(5), "join_practice_room", [erasableRoom.inviteCode, true]);
  await save(id(4), 1, 0); await save(id(5), 1, 0);
  const otherProgress = (await db.query("select data from public.learner_progress where user_id=$1", [id(5)])).rows[0].data;
  check((await db.query("select count(*)::integer as n from public.practice_credits where room_id=$1", [erasableRoom.id])).rows[0].n === 2,
    "Erasure fixture has real participation history");
  await rpc(id(4), "erase_my_learning_data");
  for (const table of ["learner_progress", "practice_members", "practice_credits", "practice_join_attempts"]) {
    check((await db.query(`select count(*)::integer as n from public.${table} where user_id=$1`, [id(4)])).rows[0].n === 0,
      `Learning erasure removes ${table}`);
  }
  check((await db.query("select count(*)::integer as n from auth.users where id=$1", [id(4)])).rows[0].n === 1,
    "Learning erasure does not claim to delete the auth identity");
  await assert.rejects(() => save(id(4), 1, 0)); checks++;
  check(JSON.stringify((await db.query("select data from public.learner_progress where user_id=$1", [id(5)])).rows[0].data) === JSON.stringify(otherProgress),
    "Erasure preserves other learners' progress");
  check(await rpc(id(5), "practice_room_snapshot") === null, "Host erasure removes shared room membership");
  check((await db.query("select count(*)::integer as n from public.practice_credits where room_id=$1", [erasableRoom.id])).rows[0].n === 0,
    "Host erasure removes room participation records");
  check(await rpc(id(4), "erase_my_learning_data") === true, "Repeated erasure is safe");
  await rpc(id(40), "erase_my_learning_data");
  check(await rpc(id(40), "practice_room_snapshot") === null, "Host erasure deletes hosted rooms");
  check((await db.query("select count(*)::integer as n from public.practice_rooms where host_id=$1", [id(40)])).rows[0].n === 0,
    "Host room records are erased");
  await assert.rejects(() => rpc("", "erase_my_learning_data")); checks++;
} finally {
  await db.close();
}
console.log(`Private-room PostgreSQL checks passed: ${checks}`);
