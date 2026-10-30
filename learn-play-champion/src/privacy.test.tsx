// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privacySettings } from "./privacy";
import PrivacyCenter from "./PrivacyCenter";
import VoiceControls, { type VoiceContext } from "./VoiceControls";
import { initialProgress } from "./game";
import App from "./App";
import { STORAGE_KEY } from "./game";

let root: Root, container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
const reviewed = {
  VITE_CHILD_PRIVACY_REVIEWED: "true",
  VITE_PRIVACY_NOTICE_URL: "https://school.example/privacy",
  VITE_PRIVACY_CONTACT: "privacy@example.com",
  VITE_DATA_RETENTION_NOTICE: "Operator-reviewed retention schedule and deletion contact.",
};
describe("privacy deployment defaults", () => {
  it("does not construct a cloud client even with valid public credentials before review", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://privacy-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("VITE_CHILD_PRIVACY_REVIEWED", "false");
    vi.resetModules();
    const { supabase, configError } = await import("./supabase");
    expect(supabase).toBeNull();
    expect(configError).toContain("privacy review");
  });
  it("defaults to local learning and needs explicit notice/contact/retention to enable cloud", () => {
    expect(privacySettings({}).cloudEnabled).toBe(false);
    expect(privacySettings({ VITE_CHILD_PRIVACY_REVIEWED: "true" }).error).toContain("disabled");
    for (const key of Object.keys(reviewed)) {
      expect(privacySettings({ ...reviewed, [key]: "" }).cloudEnabled).toBe(false);
    }
    for (const url of ["http://example.com", "javascript:alert(1)", "https://name:password@example.com", "not a url"]) {
      expect(privacySettings({ ...reviewed, VITE_PRIVACY_NOTICE_URL: url }).cloudEnabled).toBe(false);
    }
    expect(privacySettings(reviewed).cloudEnabled).toBe(true);
    expect(privacySettings(reviewed).speechEnabled).toBe(false);
    expect(privacySettings({ ...reviewed, VITE_BROWSER_SPEECH_ENABLED: "true" }).speechEnabled).toBe(true);
    expect(privacySettings({ VITE_BROWSER_SPEECH_ENABLED: "true" }).speechEnabled).toBe(false);
  });
  it("never instantiates microphone or synthesis under default privacy settings", async () => {
    const recognition = vi.fn(), speak = vi.fn();
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("SpeechRecognition", recognition);
    vi.stubGlobal("SpeechSynthesisUtterance", vi.fn());
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
    const context: VoiceContext = { key: "privacy", read: "An app question", canAnswer: false, canNext: false, canReplay: false, canHint: false };
    await act(async () => root.render(<VoiceControls context={context} onAction={vi.fn()} onAnswer={vi.fn()} onAssist={vi.fn()} onActivity={vi.fn()} />));
    expect(button("Read this aloud").disabled).toBe(true);
    expect(button("Listen for one command").disabled).toBe(true);
    expect(container.textContent).toContain("privacy settings");
    await click(button("Listen for one command")); await click(button("Read this aloud"));
    expect(recognition).not.toHaveBeenCalled(); expect(speak).not.toHaveBeenCalled();
  });
});
describe("adult privacy choices", () => {
  it("only attempts to erase the learning key and shows a storage error without hiding failure", async () => {
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    await act(async () => root.render(<App />));
    await click(button("Privacy & data"));
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await click(button("Erase local"));
    expect(remove).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Storage blocked");
  });
  it("explains limits and gates data review/deletion without claiming verified consent", async () => {
    const onErase = vi.fn().mockResolvedValue(undefined);
    await act(async () => root.render(<PrivacyCenter progress={initialProgress} cloud={false} onErase={onErase} />));
    expect(container.textContent).toContain("not certified COPPA/FERPA compliant");
    expect(container.textContent).toContain("not verified parental consent");
    expect(container.querySelector("pre")).toBeNull();
    expect(button("Erase local").disabled).toBe(true);
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    expect(container.querySelector("pre")?.textContent).toContain('"points": 0');
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await click(button("Erase local")); expect(onErase).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockReturnValue(true);
    await click(button("Erase local")); expect(onErase).toHaveBeenCalledOnce();
  });
  it("surfaces erasure failures and explains cloud identity/backups are separate", async () => {
    await act(async () => root.render(<PrivacyCenter progress={initialProgress} cloud onErase={vi.fn().mockRejectedValue(new Error("Database unavailable"))} />));
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await click(button("Erase cloud"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Database unavailable");
    expect(container.textContent).toContain("does not delete the adult auth account");
  });
  it("does not permit cloud deletion while a save is pending", async () => {
    await act(async () => root.render(<PrivacyCenter progress={initialProgress} cloud />));
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    expect(button("Erase cloud").disabled).toBe(true);
    expect(container.textContent).toContain("Wait until saving finishes");
  });
  it("exports only the current learning save and reports download failures", async () => {
    const revoke = vi.fn(), create = vi.fn().mockReturnValue("blob:learning");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await act(async () => root.render(<PrivacyCenter progress={{ ...initialProgress, selectedGrade: "4" }} cloud={false} onErase={vi.fn()} />));
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    await click(button("Download current"));
    expect(create).toHaveBeenCalledOnce(); expect(anchor).toHaveBeenCalledOnce();
    create.mockImplementation(() => { throw new Error("Downloads blocked"); });
    await click(button("Download current"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Downloads blocked");
  });
});
