// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
// Verifies my_kids_grade_boards() (migration 202611040003): a grown-up
// sees boards only for grades where they have a linked kid login; other
// families' kids appear nickname-only (no real name, no account id);
// points match what summarizeProgress() reads from the same blobs; and
// the top-25 cap never drops the caller's own kids.
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
async function boards(user) {
  return (await asUser(user, "select * from public.my_kids_grade_boards()")).rows;
}
async function addUser(user) {
  await db.query("insert into auth.users(id) values ($1)", [user]);
}
async function addKid(kid, parent, username, name, grade, progress) {
  await addUser(kid);
  await db.query(
    "insert into public.kid_accounts(kid_user_id, parent_id, username, display_name, grade) values ($1, $2, $3, $4, $5)",
    [kid, parent, username, name, grade],
  );
  await db.query(
    "insert into public.kid_account_parents(kid_user_id, parent_id) values ($1, $2)",
    [kid, parent],
  );
  if (progress) {
    await db.query("insert into public.learner_progress(user_id, data) values ($1, $2)", [
      kid,
      { version: 1, rounds: 0, answered: 0, correct: 0, streak: 0, points: 0, ...progress },
    ]);
  }
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
  for (const name of [
    "202610290001_learner_progress.sql",
    "202610290002_private_practice_rooms.sql",
    "202610310001_kid_accounts.sql",
    "202610310002_kid_progress_parent_read.sql",
    "202610310003_kid_tasks.sql",
    "202610310004_kid_account_active.sql",
    "202610310005_kid_account_parents.sql",
    "202611040003_grade_leaderboard.sql",
  ]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }

  // Two families. Parent A: one Grade 2 kid. Parent B: a Grade 2 kid
  // and a Grade 4 kid. An unrelated grown-up with no kids.
  const parentA = id(1), parentB = id(2), stranger = id(3);
  const kidA2 = id(11), kidB2 = id(12), kidB4 = id(13);
  for (const user of [parentA, parentB, stranger]) await addUser(user);
  // Points/streak/rounds below are exactly what summarizeProgress()
  // would copy out of each seeded blob.
  await addKid(kidA2, parentA, "akid", "A Kid", "2", { points: 100, streak: 3, rounds: 10 });
  await addKid(kidB2, parentB, "bkid", "B Kid", "2", { points: 250, streak: 1, rounds: 30 });
  await addKid(kidB4, parentB, "bkid4", "B Four", "4", { points: 40, streak: 2, rounds: 4 });

  // Grant surface: anon cannot call the function at all.
  await db.exec("set role anon");
  await assert.rejects(() => db.query("select * from public.my_kids_grade_boards()")); checks++;
  await db.exec("reset role");
  // Signed-out callers are refused.
  await assert.rejects(() => asUser("", "select * from public.my_kids_grade_boards()")); checks++;

  // Parent A gets the Grade 2 board only — no Grade 4 rows at all.
  const rowsA = await boards(parentA);
  check(rowsA.length === 2, "Parent A sees both Grade 2 kids and nothing else");
  check(rowsA.every((row) => row.grade === "2"), "Parent A learns nothing about Grade 4");
  const mineA = rowsA.find((row) => row.is_mine);
  const otherA = rowsA.find((row) => !row.is_mine);
  check(mineA.kid_user_id === kidA2 && mineA.display_name === "A Kid", "Own kid arrives named and identified");
  check(mineA.points === 100 && mineA.streak === 3 && mineA.rounds === 10,
    "Own kid's points/streak/rounds match summarizeProgress for the seeded blob");
  check(otherA.kid_user_id === null && otherA.display_name === null, "Other family's kid is anonymous: no id, no real name");
  check(/^Explorer-[0-9a-f]{8}$/.test(otherA.nickname), "Other family's kid is listed under an Explorer nickname");
  check(otherA.points === 250 && otherA.board_rank === 1 && mineA.board_rank === 2,
    "Higher points rank first across families");
  check(!JSON.stringify(rowsA).includes("B Kid"), "No other family's real name leaks into the payload");

  // Parent B gets both grades; their Grade 2 view mirrors A's.
  const rowsB = await boards(parentB);
  check(rowsB.filter((row) => row.grade === "2").length === 2, "Parent B also sees the Grade 2 board");
  check(rowsB.filter((row) => row.grade === "4").length === 1, "Parent B sees their Grade 4 board");
  const b4 = rowsB.find((row) => row.grade === "4");
  check(b4.is_mine && b4.points === 40 && b4.board_rank === 1, "Grade 4 board carries B's kid with matching points");

  // A kid account caller and an unrelated grown-up both get nothing.
  check((await boards(kidA2)).length === 0, "Kid logins get no grade boards");
  check((await boards(stranger)).length === 0, "A grown-up with no kid logins gets no grade boards");

  // Nickname identity: when a kid belongs to a Private Room, the board
  // must show the very nickname the rooms feature assigned them.
  const hostRoom = (await asUser(parentB, "select public.create_practice_room($1) as result", [true])).rows[0].result;
  const joined = (await asUser(kidB2, "select public.join_practice_room($1, $2) as result", [hostRoom.inviteCode, true])).rows[0].result;
  const roomNickname = joined.members.find((member) => member.isYou).nickname;
  const storedNickname = (await db.query("select nickname from public.practice_members where user_id = $1", [kidB2])).rows[0].nickname;
  check(roomNickname === storedNickname, "Rooms fixture nickname is the stored membership nickname");
  const rowsAAfterRoom = await boards(parentA);
  check(rowsAAfterRoom.find((row) => !row.is_mine).nickname === roomNickname,
    "Grade board shows the identical nickname the rooms feature shows for that account");
  // A kid with no room membership gets the same nickname expression
  // over their own account id.
  check(rowsAAfterRoom.find((row) => row.is_mine).nickname ===
    "Explorer-" + kidA2.replaceAll("-", "").slice(0, 8),
    "Roomless kid falls back to the nickname expression over their account id");

  // Co-parenting: a second grown-up linked to A's kid sees the same
  // board with that kid flagged as theirs.
  const coParent = id(4);
  await addUser(coParent);
  await db.query("insert into public.kid_account_parents(kid_user_id, parent_id) values ($1, $2)", [kidA2, coParent]);
  const rowsCo = await boards(coParent);
  check(rowsCo.length === 2 && rowsCo.find((row) => row.is_mine)?.kid_user_id === kidA2,
    "A co-parent linked to the kid gets the board with the kid flagged as theirs");

  // Cap: 27 more Grade 5 kids from other families plus parent A's own
  // Grade 5 kid with the lowest score. A must still see their own kid,
  // and only the top 25 others.
  const parentC = id(5);
  await addUser(parentC);
  for (let n = 0; n < 27; n++) {
    const other = id(100 + n);
    await addKid(other, parentC, `cap${n}`, `Cap ${n}`, "5", { points: 1000 - n, streak: 0, rounds: 0 });
  }
  const kidA5 = id(200);
  await addKid(kidA5, parentA, "akid5", "A Five", "5", { points: 1, streak: 0, rounds: 0 });
  const grade5A = (await boards(parentA)).filter((row) => row.grade === "5");
  check(grade5A.length === 26, "Grade board caps at 25 rows plus the caller's own kid below the cap");
  check(grade5A.some((row) => row.is_mine && row.kid_user_id === kidA5 && row.board_rank === 28),
    "Own kid ranked 28th is still included, with their true rank");
  check(grade5A.filter((row) => !row.is_mine).length === 25, "Exactly the top 25 other learners are listed");
  check(Math.min(...grade5A.filter((row) => !row.is_mine).map((row) => row.points)) === 976,
    "The two lowest-scoring other learners are the ones cut by the cap");
  // Parent C owns all 27 of those kids, so the cap never cuts their
  // own rows: they see every one, lowest-ranked included.
  const grade5C = (await boards(parentC)).filter((row) => row.grade === "5");
  check(grade5C.length === 27 && grade5C.every((row) => row.is_mine),
    "The cap family's parent still sees all of their own kids");
  check(grade5C.some((row) => row.points === 974 && row.board_rank === 27),
    "Even the family's lowest-scoring kid keeps their true rank");
} finally {
  await db.close();
}
console.log(`Grade-leaderboard PostgreSQL checks passed: ${checks}`);
