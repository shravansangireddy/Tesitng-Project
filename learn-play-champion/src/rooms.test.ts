import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createRoom, joinRoom, loadRoom, manageRoom, parseRoom } from "./rooms";

const member = { id: "00000000-0000-4000-8000-000000000001", nickname: "Explorer-a1b2c3d4", points: 20, isYou: true, isHost: true };
const room = {
  id: "00000000-0000-4000-8000-000000000002", isHost: true, inviteCode: "a".repeat(32),
  weekStart: "2026-10-26T00:00:00+00:00", weekEnd: "2026-11-02T00:00:00+00:00", todayRounds: 2, members: [member],
};
function client(body: unknown, status = 200) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  }));
  return {
    client: createClient("https://example.supabase.co", "sb_publishable_test", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: fetcher },
    }), fetcher,
  };
}
describe("private room service boundaries", () => {
  it("parses actual room shape and accepts no membership without creating fake players", () => {
    expect(parseRoom(null)).toBeNull();
    expect(parseRoom(room)).toEqual(room);
    const user = { ...member, isHost: false };
    expect(parseRoom({ ...room, isHost: false, inviteCode: null,
      members: [user, { ...member, id: "00000000-0000-4000-8000-000000000003", isYou: false }] })?.isHost).toBe(false);
  });
  it("rejects malformed, overshared or inconsistent standings", () => {
    for (const invalid of [
      undefined, {}, [], { ...room, id: "bad" }, { ...room, weekStart: "bad" },
      { ...room, weekEnd: room.weekStart }, { ...room, todayRounds: 6 },
      { ...room, isHost: false }, { ...room, members: [] },
      { ...room, members: [member, member] },
      { ...room, members: [{ ...member, points: 360 }] },
      { ...room, members: [{ ...member, points: 15 }] },
      { ...room, members: [{ ...member, nickname: "child@example.com" }] },
      { ...room, members: [{ ...member, isYou: false }] },
      { ...room, members: [{ ...member, isHost: false }] },
    ]) expect(() => parseRoom(invalid)).toThrow();
    expect(() => parseRoom({ error: "Invite not found" })).toThrow("Invite not found");
  });
  it("uses only the snapshot RPC, not public table enumeration", async () => {
    const mock = client(room);
    expect(await loadRoom(mock.client)).toEqual(room);
    expect(String(mock.fetcher.mock.calls[0][0])).toContain("/rpc/practice_room_snapshot");
  });
  it("creates and joins with explicit adult confirmation and normalized full-length codes", async () => {
    const first = client(room);
    await createRoom(first.client);
    expect(JSON.parse(String(first.fetcher.mock.calls[0][1]?.body))).toEqual({ adult_confirmed: true });
    const second = client(room);
    await joinRoom(second.client, ` ${"A".repeat(32)} `);
    expect(JSON.parse(String(second.fetcher.mock.calls[0][1]?.body))).toEqual({ invitation: "a".repeat(32), adult_confirmed: true });
    expect(() => joinRoom(second.client, "short")).toThrow("32-character");
    expect(second.fetcher).toHaveBeenCalledTimes(1);
  });
  it("sends a membership ID, not another user's account identifier, for host actions", async () => {
    const mock = client(room);
    await manageRoom(mock.client, "remove", member.id);
    expect(JSON.parse(String(mock.fetcher.mock.calls[0][1]?.body))).toEqual({ action: "remove", target_member: member.id });
  });
  it("surfaces missing migrations, rate limits and connection errors", async () => {
    await expect(loadRoom(client({ message: "function not found" }, 404).client)).rejects.toThrow("migration");
    await expect(joinRoom(client({ error: "Too many join attempts" }).client, "a".repeat(32))).rejects.toThrow("Too many");
    const mock = client(null);
    mock.fetcher.mockRejectedValue(new Error("Offline"));
    await expect(loadRoom(mock.client)).rejects.toThrow("Offline");
  });
});
