import { describe, expect, it } from "vitest";
import {
  APP_URL,
  buildParentReminderEmail,
} from "../supabase/functions/_shared/reminder.ts";

/**
 * The reminder email builder lives in the Edge Functions' shared
 * module (supabase/functions/_shared/reminder.ts); the parent-reminder
 * function trusts it for the copy — so the copy is pinned here: the
 * exact subject and button, the brand facts, exactly ONE call to
 * action, and no name placeholder anywhere (no parent name is known
 * to the sender). All copy is the app's own, written for this email.
 */

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("buildParentReminderEmail", () => {
  const email = buildParentReminderEmail();

  it("uses the pinned subject", () => {
    expect(email.subject).toBe("Your child's free practice is waiting 🎉");
  });

  it("carries the brand facts", () => {
    for (const fact of [
      "free Learn & Play Champion account",
      "about a minute",
      "Parents dashboard → Kid logins",
      "all 19 skills",
      "watch their progress grow",
      "Building bright minds for future generations",
    ]) {
      expect(email.text).toContain(fact);
      expect(email.html).toContain(fact.replace(/&/g, "&amp;"));
    }
  });

  it("has exactly one call to action: the Add your kid's login button", () => {
    expect(countOccurrences(email.html, `href="${APP_URL}"`)).toBe(1);
    expect(email.html).toContain("Add your kid's login");
    // The app URL appears nowhere else in the HTML, and exactly once
    // in the text (as the bare URL where the button sits in HTML).
    expect(countOccurrences(email.html, APP_URL)).toBe(1);
    expect(countOccurrences(email.text, APP_URL)).toBe(1);
  });

  it("greets without a name placeholder — no parent name is known", () => {
    for (const body of [email.subject, email.text, email.html]) {
      expect(body).not.toMatch(/\{\{|\}\}|\$\{|undefined|Dear |\[name\]|<name>/i);
    }
    expect(email.text).toContain("Hello from Learn & Play Champion!");
  });

  it("escapes the brand's ampersands in HTML only", () => {
    expect(email.html).toContain("Learn &amp; Play Champion");
    expect(email.html).not.toContain("Learn & Play Champion");
    expect(email.text).toContain("Learn & Play Champion");
  });

  it("is identical for every recipient (no per-parent input)", () => {
    expect(buildParentReminderEmail()).toEqual(email);
  });
});
