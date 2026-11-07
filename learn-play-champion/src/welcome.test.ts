import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  APP_URL,
  buildKidWelcomeEmail,
  buildParentWelcomeEmail,
  escapeHtml,
  isNewParentAccount,
  PARENT_WELCOME_MAX_AGE_DAYS,
} from "../supabase/functions/_shared/welcome.ts";

/**
 * The welcome email builders live in the Edge Functions' shared module
 * (supabase/functions/_shared/welcome.ts). One function sends the parent
 * welcome, the kid-accounts function sends the kid welcome, and both
 * trust this module for the copy — so the copy is pinned here: exact
 * subjects, the brand facts, exactly ONE call-to-action per email, HTML
 * escaping for anything a family typed, and the new-account age gate.
 */

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("buildParentWelcomeEmail", () => {
  const email = buildParentWelcomeEmail();

  it("uses the pinned subject", () => {
    expect(email.subject).toBe("Welcome to Learn & Play Champion 🎉");
  });

  it("carries the brand facts", () => {
    for (const fact of [
      "Pre-K–Grade 5",
      "English and Math",
      "10,000+ original questions",
      "no ads and no subscriptions",
    ]) {
      expect(email.text).toContain(fact);
      expect(email.html).toContain(fact.replace(/&/g, "&amp;"));
    }
  });

  it("has exactly one call to action: the Start exploring button", () => {
    expect(countOccurrences(email.html, `href="${APP_URL}"`)).toBe(1);
    expect(email.html).toContain("Start exploring");
    // The app URL appears nowhere else in the HTML, and exactly once in
    // the text (as the bare URL where the button sits in HTML).
    expect(countOccurrences(email.html, APP_URL)).toBe(1);
    expect(countOccurrences(email.text, APP_URL)).toBe(1);
  });

  it("leaves no placeholders behind", () => {
    for (const body of [email.subject, email.text, email.html]) {
      expect(body).not.toMatch(/\{\{|\}\}|\$\{|undefined|null/);
    }
  });
});

describe("buildKidWelcomeEmail", () => {
  const email = buildKidWelcomeEmail({
    kidDisplayName: "Avyan",
    kidUsername: "avyan",
    gradeLabel: "Grade 4",
  });

  it("names the kid in the subject", () => {
    expect(email.subject).toBe("🎉 Avyan is ready to play!");
  });

  it("carries the username, grade, all-skills note, and PIN reminder", () => {
    for (const fact of [
      "Username: avyan",
      "Grade 4",
      "All 18 skills",
      "4-digit PIN",
      "Parents dashboard → Kid logins",
    ]) {
      expect(email.text).toContain(fact);
    }
  });

  it("has exactly one call to action: the Open button", () => {
    expect(countOccurrences(email.html, `href="${APP_URL}"`)).toBe(1);
    expect(email.html).toContain("Open Learn & Play Champion");
    expect(countOccurrences(email.html, APP_URL)).toBe(1);
    expect(countOccurrences(email.text, APP_URL)).toBe(1);
  });

  it("escapes an HTML-hostile display name in HTML only", () => {
    const hostile = buildKidWelcomeEmail({
      kidDisplayName: "<b>X</b>",
      kidUsername: "kid<1>",
      gradeLabel: "Grade 2",
    });
    expect(hostile.html).not.toContain("<b>X</b>");
    expect(hostile.html).toContain("&lt;b&gt;X&lt;/b&gt;");
    expect(hostile.html).toContain("kid&lt;1&gt;");
    // The plain-text body (and the subject line) stay readable.
    expect(hostile.text).toContain("<b>X</b>");
    expect(hostile.subject).toBe("🎉 <b>X</b> is ready to play!");
  });

  it("leaves no placeholders behind", () => {
    for (const body of [email.subject, email.text, email.html]) {
      expect(body).not.toMatch(/\{\{|\}\}|\$\{|undefined/);
    }
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`a & <b> "c" 'd'`)).toBe(
      "a &amp; &lt;b&gt; &quot;c&quot; &#39;d&#39;",
    );
  });
});

describe("isNewParentAccount", () => {
  const now = new Date("2026-11-07T12:00:00.000Z");
  const daysAgo = (days: number, extraMs = 0) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000 - extraMs).toISOString();

  it("welcomes a just-registered account", () => {
    expect(isNewParentAccount(now.toISOString(), now)).toBe(true);
  });

  it("treats exactly the max age as still new", () => {
    expect(
      isNewParentAccount(daysAgo(PARENT_WELCOME_MAX_AGE_DAYS), now),
    ).toBe(true);
  });

  it("stops welcoming one hour past the max age", () => {
    expect(
      isNewParentAccount(
        daysAgo(PARENT_WELCOME_MAX_AGE_DAYS, 60 * 60 * 1000),
        now,
      ),
    ).toBe(false);
  });

  it("never welcomes an unparseable timestamp", () => {
    expect(isNewParentAccount("not-a-date", now)).toBe(false);
  });
});

describe("requestParentWelcomeEmail (client trigger)", () => {
  it("fires once for a grown-up session, and only once per page session", async () => {
    vi.resetModules();
    const { requestParentWelcomeEmail } = await import("./welcome");
    const invoke = vi.fn(async () => ({ data: {}, error: null }));
    const client = {
      functions: { invoke },
    } as unknown as SupabaseClient;
    requestParentWelcomeEmail(client, false);
    requestParentWelcomeEmail(client, false);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("welcome-email", { body: {} });
  });

  it("never fires for a kid session — and does not spend the one shot", async () => {
    vi.resetModules();
    const { requestParentWelcomeEmail } = await import("./welcome");
    const invoke = vi.fn(async () => ({ data: {}, error: null }));
    const client = {
      functions: { invoke },
    } as unknown as SupabaseClient;
    requestParentWelcomeEmail(client, true);
    expect(invoke).not.toHaveBeenCalled();
    requestParentWelcomeEmail(client, false);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("swallows invoke failures", async () => {
    vi.resetModules();
    const { requestParentWelcomeEmail } = await import("./welcome");
    const invoke = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = {
      functions: { invoke },
    } as unknown as SupabaseClient;
    expect(() => requestParentWelcomeEmail(client, false)).not.toThrow();
    // Let the rejected promise settle; the trigger must have attached a
    // catch, so nothing surfaces as an unhandled rejection.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
