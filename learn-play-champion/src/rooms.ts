import type { SupabaseClient } from "@supabase/supabase-js";

export interface RoomMember {
  id: string;
  nickname: string;
  points: number;
  isYou: boolean;
  isHost: boolean;
}
export interface PracticeRoom {
  id: string;
  isHost: boolean;
  inviteCode: string | null;
  weekStart: string;
  weekEnd: string;
  todayRounds: number;
  members: RoomMember[];
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
// The room RPCs explain refusals in their own messages. Translate the known
// ones into plain language and pass anything else through unchanged — never
// bury the real reason under generic setup advice.
const ROOM_ERROR_MESSAGES: [RegExp, string][] = [
  [/leave or close your current room first/i, "You're already in a room. Leave or close it first, then try again."],
  [/invite not found/i, "That code didn't match an open room. Check the code and try again."],
  [/too many join attempts/i, "Too many tries — wait a while before trying another code."],
  [/room creation limit reached/i, "You've reached today's room creation limit. Try again tomorrow."],
  [/room is full/i, "That room is full (30 learners), so nobody else can join right now."],
  [/the room is closed/i, "That room has been closed by its host."],
  [/not in a room/i, "You're not in a room right now. Refresh and try again."],
];
export function roomErrorMessage(raw: string): string {
  for (const [pattern, friendly] of ROOM_ERROR_MESSAGES) if (pattern.test(raw)) return friendly;
  return raw;
}
const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parseRoom(value: unknown): PracticeRoom | null {
  if (value === null) return null;
  if (object(value) && typeof value.error === "string") throw new Error(roomErrorMessage(value.error));
  if (!object(value) || !uuid(value.id) || typeof value.isHost !== "boolean" ||
    (value.isHost ? typeof value.inviteCode !== "string" || !/^[0-9a-f]{32}$/.test(value.inviteCode) : value.inviteCode !== null) ||
    typeof value.weekStart !== "string" || !Number.isFinite(Date.parse(value.weekStart)) ||
    typeof value.weekEnd !== "string" || Date.parse(value.weekEnd) - Date.parse(value.weekStart) !== 7 * 86400000 ||
    typeof value.todayRounds !== "number" || !Number.isInteger(value.todayRounds) || value.todayRounds < 0 || value.todayRounds > 5 ||
    !Array.isArray(value.members) || !value.members.length || value.members.length > 30) {
    throw new Error("The room service returned an invalid room. Refresh or ask the grown-up host to check setup.");
  }
  const members: RoomMember[] = value.members.map((member: unknown) => {
    if (!object(member) || !uuid(member.id) || typeof member.nickname !== "string" ||
      !/^Explorer-[0-9a-f]{8}$/.test(member.nickname) ||
      typeof member.points !== "number" || !Number.isInteger(member.points) ||
      member.points < 0 || member.points > 350 || member.points % 10 !== 0 ||
      typeof member.isYou !== "boolean" || typeof member.isHost !== "boolean") {
      throw new Error("The room service returned invalid standings.");
    }
    return { id: member.id, nickname: member.nickname, points: member.points, isYou: member.isYou, isHost: member.isHost };
  });
  if (new Set(members.map((member) => member.id)).size !== members.length ||
    members.filter((member) => member.isYou).length !== 1 || members.filter((member) => member.isHost).length !== 1 ||
    members.find((member) => member.isYou)?.isHost !== value.isHost)
    throw new Error("The room service returned inconsistent membership.");
  return {
    id: value.id, isHost: value.isHost, inviteCode: typeof value.inviteCode === "string" ? value.inviteCode : null,
    weekStart: value.weekStart, weekEnd: value.weekEnd, todayRounds: value.todayRounds, members,
  };
}
async function request(client: SupabaseClient, name: string, args?: Record<string, unknown>): Promise<PracticeRoom | null> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(roomErrorMessage(error.message));
  return parseRoom(data);
}
export const loadRoom = (client: SupabaseClient) => request(client, "practice_room_snapshot");
export const createRoom = (client: SupabaseClient) => request(client, "create_practice_room", { adult_confirmed: true });
export function joinRoom(client: SupabaseClient, code: string) {
  const invitation = code.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(invitation)) throw new Error("Enter the full 32-character invite code from your room's grown-up host.");
  return request(client, "join_practice_room", { invitation, adult_confirmed: true });
}
export const manageRoom = (client: SupabaseClient, action: "rotate" | "remove" | "close" | "leave", member?: string) =>
  request(client, "manage_practice_room", { action, target_member: member ?? null });
