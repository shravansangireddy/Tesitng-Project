// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn(), create: vi.fn(), join: vi.fn(), manage: vi.fn() }));
vi.mock("./rooms", () => ({
  loadRoom: mocks.load, createRoom: mocks.create, joinRoom: mocks.join, manageRoom: mocks.manage,
}));
import PracticeRooms from "./PracticeRooms";
import App from "./App";
import { initialProgress, parseProgress, STORAGE_KEY } from "./game";
import { themes } from "./themes";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const client = createClient("https://example.supabase.co", "sb_publishable_test", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const room = {
  id: "00000000-0000-4000-8000-000000000001", isHost: true, inviteCode: "a".repeat(32),
  weekStart: "2026-10-26T00:00:00+00:00", weekEnd: "2026-11-02T00:00:00+00:00", todayRounds: 2,
  members: [
    { id: "00000000-0000-4000-8000-000000000002", nickname: "Explorer-a1b2c3d4", points: 20, isYou: true, isHost: true },
    { id: "00000000-0000-4000-8000-000000000003", nickname: "Explorer-1234abcd", points: 20, isYou: false, isHost: false },
  ],
};
let container: HTMLDivElement, root: Root;
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function mount(saving = false) { await act(async () => root.render(<PracticeRooms client={client} saving={saving} />)); }
async function adult() { await click(container.querySelector<HTMLInputElement>('.room-consent input')!); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  for (const mock of Object.values(mocks)) mock.mockReset().mockResolvedValue(null);
  mocks.create.mockResolvedValue(room); mocks.join.mockResolvedValue({ ...room, isHost: false, inviteCode: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  localStorage.clear();
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); vi.restoreAllMocks();
});
describe("private rooms UI", () => {
  it("never pretends guests have live competition", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore private rooms"));
    expect(container.querySelector(".room-setup")?.textContent).toContain("sign-in");
    expect(container.querySelector(".room-table")).toBeNull();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(container.querySelector(".voice-panel")).toBeNull();
  });
  it("requires grown-up opt-in, creates the room and keeps the code under host disclosure", async () => {
    await mount();
    expect(button("Create a room").disabled).toBe(true);
    await adult(); await click(button("Create a room"));
    expect(mocks.create).toHaveBeenCalledWith(client);
    expect(container.querySelector(".room-invite details")?.hasAttribute("open")).toBe(false);
    expect(container.querySelector(".room-invite code")?.textContent).toBe(room.inviteCode);
    expect(container.querySelectorAll(".room-table tbody tr td:first-child")[0].textContent).toBe("1");
    expect(container.querySelectorAll(".room-table tbody tr td:first-child")[1].textContent).toBe("1");
    expect(container.querySelector(".room-table")?.textContent).not.toContain("email");
  });
  it("joins only with a supplied invite and surfaces server refusal", async () => {
    await mount(); await adult();
    const input = container.querySelector<HTMLInputElement>("#room-invite")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "bad");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    mocks.join.mockRejectedValue(new Error("Invite not found or room closed"));
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Invite not found");
    expect(container.querySelector(".room-table")).toBeNull();
  });
  it("refreshes membership and allows only host controls with confirmation", async () => {
    mocks.load.mockResolvedValue(room); await mount();
    expect(button("Replace invite code").disabled).toBe(true);
    await adult();
    vi.mocked(window.confirm).mockReturnValue(false);
    await click(button("Replace invite code"));
    expect(mocks.manage).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockReturnValue(true);
    mocks.manage.mockResolvedValue(room);
    await click(button("Remove"));
    expect(mocks.manage).toHaveBeenLastCalledWith(client, "remove", room.members[1].id);
    await click(button("Replace invite code"));
    expect(mocks.manage).toHaveBeenLastCalledWith(client, "rotate", undefined);
    mocks.manage.mockResolvedValue(null);
    await click(button("Close room for everyone"));
    expect(container.querySelector(".room-table")).toBeNull();
    expect(button("Create a room")).toBeDefined();
  });
  it("never gives a member the host invitation or removal controls", async () => {
    mocks.load.mockResolvedValue({ ...room, isHost: false, inviteCode: null,
      members: room.members.map((m) => ({ ...m, isYou: !m.isYou })) });
    await mount();
    expect(container.querySelector(".room-invite")).toBeNull();
    expect(container.querySelector(".room-table")?.textContent).not.toContain("Host controls");
    await adult(); await click(button("Leave room"));
    expect(mocks.manage).toHaveBeenLastCalledWith(client, "leave", undefined);
  });
  it("shows failed loads and retries instead of showing invented standings", async () => {
    mocks.load.mockRejectedValueOnce(new Error("Migration missing")).mockResolvedValueOnce(room);
    await mount();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Migration missing");
    expect(container.querySelector(".room-entry")).toBeNull();
    await click(button("Refresh room"));
    expect(container.querySelector(".room-table")).not.toBeNull();
  });
  it("waits while personal progress is saving and blocks double room requests", async () => {
    await mount(true);
    expect(button("Refresh room").disabled).toBe(true);
    await mount(false);
    let finish!: (value: typeof room) => void;
    mocks.create.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await adult(); await click(button("Create a room"));
    expect(button("Create a room").disabled).toBe(true);
    await click(button("Create a room"));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await act(async () => finish(room));
    expect(container.querySelector(".room-table")).not.toBeNull();
  });
});
describe("colorful learning themes", () => {
  it("keeps white primary-button labels above 4.5:1 contrast in every palette", () => {
    const themeCss = readFileSync(join(process.cwd(), "src", "themes.css"), "utf8");
    const baseCss = readFileSync(join(process.cwd(), "src", "styles.css"), "utf8");
    const luminance = (hex: string) => {
      const channels = hex.slice(1).match(/../g)!.map((n) => parseInt(n, 16) / 255)
        .map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    for (const theme of themes) {
      const css = theme.id === "island" ? baseCss
        : themeCss.split(`.app-shell[data-theme="${theme.id}"]`)[1].split("}")[0];
      const primary = css.match(/--purple:\s*(#[0-9a-f]{6})/i)![1];
      expect(1.05 / (luminance(primary) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("saves the chosen palette, preserves grade and restores it after reload", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialProgress, selectedGrade: "4" }));
    await act(async () => root.render(<App />));
    for (const theme of themes) {
      await click(button(theme.label));
      expect(container.querySelector(".app-shell")?.getAttribute("data-theme")).toBe(theme.id);
      expect(button(theme.label).getAttribute("aria-pressed")).toBe("true");
      expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).selectedGrade).toBe("4");
    }
    await act(async () => root.render(<App key="reload" />));
    expect(container.querySelector(".app-shell")?.getAttribute("data-theme")).toBe("space");
    await click(button("Adventures"));
    expect(container.querySelector(".app-shell")?.getAttribute("data-theme")).toBe("space");
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).points).toBe(0);
  });
  it("sends account themes through the private save callback, not guest storage", async () => {
    const onProgressChange = vi.fn();
    await act(async () => root.render(<App cloudProgress={initialProgress} onProgressChange={onProgressChange} />));
    await click(button("Ocean Explorers"));
    expect(onProgressChange).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "ocean" }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("accepts known theme IDs and rejects invalid stored values without breaking old saves", () => {
    expect(parseProgress(JSON.stringify(initialProgress)).theme).toBeUndefined();
    for (const theme of themes) expect(parseProgress(JSON.stringify({ ...initialProgress, theme: theme.id })).theme).toBe(theme.id);
    for (const theme of [null, 1, {}, "dark", ""]) expect(() => parseProgress(JSON.stringify({ ...initialProgress, theme }))).toThrow();
  });
});
