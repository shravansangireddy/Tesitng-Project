// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleNativeAuthUrl } from "./native-auth";
import PrivacyCenter from "./PrivacyCenter";
import { initialProgress } from "./game";

function fakeClient() {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  } as unknown as SupabaseClient;
}

describe("handleNativeAuthUrl", () => {
  it("ignores URLs that are not on the app scheme", async () => {
    const client = fakeClient();
    const onError = vi.fn();
    expect(await handleNativeAuthUrl("https://learnplaychampion.com/?code=abc", client, onError)).toBe(false);
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(client.auth.setSession).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("exchanges a PKCE code from the app-scheme link", async () => {
    const client = fakeClient();
    const onError = vi.fn();
    expect(await handleNativeAuthUrl("learnplaychampion://auth?code=pkce-code", client, onError)).toBe(true);
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith("pkce-code");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a failed code exchange the same way as a failed web link", async () => {
    const client = fakeClient();
    vi.mocked(client.auth.exchangeCodeForSession).mockResolvedValue({
      data: { session: null },
      error: { message: "code expired", name: "AuthApiError", status: 400 },
    } as never);
    const onError = vi.fn();
    expect(await handleNativeAuthUrl("learnplaychampion://auth?code=stale", client, onError)).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toContain("code expired");
  });

  it("sets the session from implicit-flow tokens in the hash", async () => {
    const client = fakeClient();
    const onError = vi.fn();
    expect(
      await handleNativeAuthUrl(
        "learnplaychampion://auth#access_token=tok&refresh_token=ref",
        client,
        onError,
      ),
    ).toBe(true);
    expect(client.auth.setSession).toHaveBeenCalledExactlyOnceWith({
      access_token: "tok",
      refresh_token: "ref",
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a link error from the app-scheme URL", async () => {
    const client = fakeClient();
    const onError = vi.fn();
    expect(
      await handleNativeAuthUrl(
        "learnplaychampion://auth?error_description=Link+expired",
        client,
        onError,
      ),
    ).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toContain("Link expired");
  });
});

describe("donations in native builds", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    delete (window as unknown as Record<string, unknown>).androidBridge;
    vi.restoreAllMocks();
  });

  it("shows the donation panel on the web", async () => {
    await act(async () => root.render(<PrivacyCenter progress={initialProgress} cloud={false} />));
    expect(container.textContent).toContain("Optional grown-up donations");
  });

  it("hides the donation panel in the native shell", async () => {
    // Capacitor reads window.androidBridge to detect the Android shell.
    (window as unknown as Record<string, unknown>).androidBridge = {};
    await act(async () => root.render(<PrivacyCenter progress={initialProgress} cloud={false} />));
    expect(container.textContent).not.toContain("Optional grown-up donations");
    expect(container.textContent).toContain("Parents dashboard");
  });
});
