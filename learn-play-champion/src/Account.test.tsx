// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { initialProgress, STORAGE_KEY } from "./game";

const mocks = vi.hoisted(() => ({
  configured: true,
  session: null as Session | null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  listener: null as ((event: string, session: Session | null) => void) | null,
}));
vi.mock("./supabase", () => {
  const client = {
    rpc: mocks.rpc,
    auth: {
      getSession: async () => ({ data: { session: mocks.session }, error: null }),
      onAuthStateChange: (listener: typeof mocks.listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithOtp: mocks.signIn,
      signOut: mocks.signOut,
    },
  };
  return {
  get configError() {
    return mocks.configured ? "" : "Account sign-in needs a Supabase project.";
  },
  get supabase() {
    return mocks.configured ? client : null;
  },
  };
});
vi.mock("./cloud", async (importOriginal) => {
  const original = await importOriginal<typeof import("./cloud")>();
  return {
    ...original,
    loadCloudProgress: mocks.load,
    saveCloudProgress: mocks.save,
  };
});
import Account from "./Account";
import { ProgressConflict } from "./cloud";
import * as learningContent from "./content";

let root: Root;
let container: HTMLDivElement;
async function click(button: Element | undefined | null) {
  if (!button) throw new Error("Missing test button");
  await act(async () => {
    (button as HTMLButtonElement).click();
  });
}
function button(text: string) {
  return [...container.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(text),
  );
}
async function mount() {
  await act(async () => root.render(<Account />));
}
async function chooseGrade(grade: string) {
  const select = container.querySelector<HTMLSelectElement>("#learning-grade")!;
  await act(async () => {
    select.value = grade;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function activityCard(title: string) {
  return [...container.querySelectorAll(".activity-card")].find(
    (card) => card.querySelector("h3")?.textContent === title,
  );
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.configured = true;
  mocks.session = null;
  mocks.listener = null;
  mocks.signIn.mockReset().mockResolvedValue({ error: null });
  mocks.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  mocks.load
    .mockReset()
    .mockResolvedValue({ progress: initialProgress, revision: 0 });
  mocks.save.mockReset().mockResolvedValue(1);
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
async function fillAdultForm() {
  const input = container.querySelector<HTMLInputElement>("#adult-email")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "parent@example.com");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click(container.querySelector('input[type="checkbox"]'));
}
const authenticated = () => {
  mocks.session = { user: { id: "adult-one" } } as Session;
};
async function chooseLoginGrade(value: string) {
  const select = container.querySelector<HTMLSelectElement>("#login-grade")!;
  await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); });
}

describe("grade preference during and after login", () => {
  it("preserves only the opaque donation return reference when reauthentication is needed", async () => {
    const donation = "11111111-1111-4111-8111-111111111111";
    history.replaceState(null, "", `/?donation_return=${donation}&token=untrusted&PayerID=untrusted`);
    await mount(); await fillAdultForm(); await click(button("Email me"));
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "parent@example.com",
      options: { emailRedirectTo: `${location.origin}/?donation_return=${donation}` },
    });
  });
  it("includes an explicit grade in the magic link and applies it to loaded account progress", async () => {
    await mount();
    await chooseLoginGrade("4");
    await fillAdultForm();
    await click(button("Email me"));
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "parent@example.com",
      options: { emailRedirectTo: `${location.origin}${location.pathname}?learning_grade=4` },
    });
    authenticated();
    await act(async () => mocks.listener?.("SIGNED_IN", mocks.session));
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("4");
    expect(mocks.save).toHaveBeenLastCalledWith(expect.anything(), "adult-one",
      expect.objectContaining({ selectedGrade: "4" }), 0);
    await click(button("Explore AI discovery"));
    expect(container.querySelector<HTMLSelectElement>(".ai-path select")!.value).toBe("4");
  });
  it("restores a grade from the emailed redirect on a fresh page and removes the consumed parameter", async () => {
    history.replaceState(null, "", `${location.pathname}?learning_grade=5&keep=yes`);
    mocks.load.mockResolvedValue({ progress: { ...initialProgress, selectedGrade: "2" }, revision: 3 });
    authenticated();
    await mount();
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("5");
    expect(location.search).toBe("?keep=yes");
    expect(mocks.save).toHaveBeenCalledWith(expect.anything(), "adult-one",
      expect.objectContaining({ selectedGrade: "5" }), 3);
    await click(button("Explore Coding Cove"));
    expect(container.querySelector<HTMLSelectElement>(".coding-selector select")!.value).toBe("5");
  });
  it("uses the account's saved grade when login has no explicit override", async () => {
    mocks.load.mockResolvedValue({ progress: { ...initialProgress, selectedGrade: "k" }, revision: 2 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialProgress, selectedGrade: "5" }));
    authenticated(); await mount();
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("k");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).selectedGrade).toBe("5");
  });
  it("saves dashboard grade changes to the account and restores them on a new login", async () => {
    authenticated(); await mount();
    await chooseGrade("3");
    expect(mocks.save).toHaveBeenLastCalledWith(expect.anything(), "adult-one",
      expect.objectContaining({ selectedGrade: "3" }), 0);
    const saved = mocks.save.mock.calls[mocks.save.mock.calls.length - 1][2];
    mocks.load.mockResolvedValue({ progress: saved, revision: 1 });
    await act(async () => root.render(<Account key="new-login" />));
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("3");
  });
  it("persists guest grade independently and honors a grade chosen on the entry page", async () => {
    await mount(); await chooseLoginGrade("prek"); await click(button("Play as a guest"));
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("prek");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).selectedGrade).toBe("prek");
    await chooseGrade("5");
    await act(async () => root.render(<Account key="reload-guest" />));
    await click(button("Play as a guest"));
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("5");
  });
  it("does not apply an explicit login choice when the email request fails", async () => {
    await mount(); await chooseLoginGrade("5"); await fillAdultForm();
    mocks.signIn.mockResolvedValue({ error: new Error("Send failed") });
    await click(button("Email me"));
    authenticated(); await act(async () => mocks.listener?.("SIGNED_IN", mocks.session));
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("1");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("keeps failed grade saves visible and supports retry through normal cloud recovery", async () => {
    history.replaceState(null, "", `${location.pathname}?learning_grade=4`);
    mocks.save.mockRejectedValueOnce(new Error("Grade save offline")).mockResolvedValueOnce(1);
    authenticated(); await mount();
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")!.value).toBe("4");
    expect(container.querySelector("dialog")?.textContent).toContain("Grade save offline");
    await click(button("Retry saving"));
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(container.querySelector("dialog")).toBeNull();
  });
});

describe("grown-up login screen", () => {
  it("shows login first and blocks requests until configured", async () => {
    mocks.configured = false;
    await mount();
    expect(container.textContent).toContain("Welcome to the island");
    expect(container.textContent).toContain("Connect Supabase");
    await fillAdultForm();
    expect(button("Email me")?.disabled).toBe(true);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("requires adult confirmation and submits a real email-link request", async () => {
    await mount();
    expect(button("Email me")?.disabled).toBe(true);
    await fillAdultForm();
    await click(button("Email me"));
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "parent@example.com",
      options: { emailRedirectTo: `${location.origin}${location.pathname}` },
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Check your grown-up inbox",
    );
  });
  it("does not pretend success when Supabase rejects the email request", async () => {
    mocks.signIn.mockResolvedValue({
      error: new Error("Email rate limit exceeded"),
    });
    await mount();
    await fillAdultForm();
    await click(button("Email me"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Email rate limit exceeded",
    );
    expect(container.textContent).not.toContain("Check your grown-up inbox");
  });
  it("preserves guest play with an obvious way back to sign-in", async () => {
    mocks.configured = false;
    await mount();
    await click(button("Play as a guest"));
    expect(container.textContent).toContain("Ready, set,");
    expect(container.textContent).toContain("Sign in");
    await click(button("Sign in"));
    expect(container.textContent).toContain("Welcome to the island");
  });
  it("renders an edited story from text content without interpreting HTML", async () => {
    const content = structuredClone(learningContent.getLearningContent());
    content.grades["1"].lessons.reading.questions[0].passage =
      "An edited story.\n<script>not executable</script>";
    content.grades["1"].lessons.reading.questions[0].prompt =
      "An edited story question?";
    vi.spyOn(learningContent, "getLearningContent").mockReturnValue(content);
    await mount();
    await click(button("Play as a guest"));
    await click(button("Adventures"));
    await click(container.querySelectorAll(".activity-card button")[3]);
    expect(container.querySelector(".passage")?.textContent).toContain(
      content.grades["1"].lessons.reading.questions[0].passage,
    );
    expect(container.querySelector(".quiz-card h2")?.textContent).toBe(
      "An edited story question?",
    );
    expect(container.querySelector(".passage script")).toBeNull();
  });
  it("uses an edited teammate answer index instead of hard-coding the first option", async () => {
    const content = structuredClone(learningContent.getLearningContent());
    content.teammate.answerIndex = 2;
    content.teammate.success = "A new helpful explanation!";
    vi.spyOn(learningContent, "getLearningContent").mockReturnValue(content);
    await mount();
    await click(button("Play as a guest"));
    await click(button("Team corner"));
    await click(button("Practice helping Pip"));
    await click(container.querySelectorAll(".help-options button")[0]);
    expect(container.querySelector(".help-success")).toBeNull();
    await click(container.querySelectorAll(".help-options button")[2]);
    expect(container.querySelector(".help-success")?.textContent).toBe(
      content.teammate.success,
    );
    expect(container.querySelector(".points-pill")?.textContent).toBe("25 pts");
  });
  it("switches kindergarten and Grade 5 content without mixing best scores", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...initialProgress,
        gradeBestRounds: { "k:arithmetic": 5 },
      }),
    );
    await mount();
    await click(button("Play as a guest"));
    const choose = async (grade: string) => {
      const select =
        container.querySelector<HTMLSelectElement>("#learning-grade")!;
      await act(async () => {
        select.value = grade;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };
    await choose("k");
    await click(button("Adventures"));
    await click(button("Math Mountain"));
    expect(container.querySelector(".activity-card h3")?.textContent).toBe(
      "Count & Add",
    );
    expect(container.querySelector(".skill-status")?.textContent).toContain(
      "Best: 5/5",
    );
    await choose("5");
    expect(container.querySelector(".activity-card h3")?.textContent).toBe(
      "Decimal Number Sprint",
    );
    expect(container.querySelector(".skill-status")?.textContent).toContain(
      "Best: 0/5",
    );
    await click(container.querySelector(".activity-card button"));
    expect(container.querySelector(".grade-round-label")?.textContent).toBe(
      "Grade 5",
    );
    expect(container.querySelector(".quiz-card h2")?.textContent).toBe(
      "3.75 + 2.6 = ?",
    );
  });
  it("does not accept an incorrectly capitalized multiple-choice answer", async () => {
    await mount();
    await click(button("Play as a guest"));
    await click(button("Adventures"));
    await click(container.querySelectorAll(".activity-card button")[4]);
    const wrong = [...container.querySelectorAll(".answer-option")].find(
      (b) => b.getAttribute("data-answer") === "we play outside.",
    );
    await click(wrong);
    expect(container.querySelector(".feedback.keep-growing")).not.toBeNull();
    expect(container.querySelector(".feedback.positive")).toBeNull();
  });
  it("shows current-grade authoritative sources, nonfiction, and unscored writing guidance", async () => {
    await mount();
    await click(button("Play as a guest"));
    await chooseGrade("5");
    const sourceLinks = container.querySelectorAll<HTMLAnchorElement>(".curriculum-guide a");
    expect(sourceLinks).toHaveLength(2);
    for (const link of sourceLinks) {
      expect(link.hostname).toBe("www2.cde.ca.gov");
      expect(new URL(link.href).searchParams.get("mingrade")).toBe("5");
      expect(link.rel).toBe("noreferrer");
    }
    await click(button("Adventures"));
    expect(container.querySelectorAll(".activity-card")).toHaveLength(7);
    const writing = activityCard("Develop a Supported Piece")!;
    expect(writing.textContent).toContain("W.5.1");
    expect(writing.textContent).toContain("Drafts and speech are not uploaded");
    await click(activityCard("Planning a Wildlife Crossing")?.querySelector("button"));
    expect(container.querySelector(".passage")?.textContent).toContain("Roads connect human communities");
    expect(container.querySelector(".lesson-tips")?.textContent).toContain("RI.5.1");
    expect(container.querySelector("#learning-grade")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")?.points || 0).toBe(0);
  });
  it("plays and saves a Grade 5 data round using an accessible line plot", async () => {
    await mount();
    await click(button("Play as a guest"));
    await chooseGrade("5");
    await click(button("Adventures"));
    await click(button("Math Mountain"));
    expect(container.querySelectorAll(".activity-card")).toHaveLength(9);
    await click(activityCard("Measure, Plot & Redistribute")?.querySelector("button"));
    expect(container.querySelectorAll(".plot-symbol")).toHaveLength(6);
    expect(container.querySelector(".learning-chart figcaption")?.textContent).toContain("six containers");
    expect(container.querySelectorAll(".chart-table tbody tr")).toHaveLength(4);
    const lesson = learningContent.getLearningContent().grades["5"].lessons.data;
    for (const [index, question] of lesson.questions.entries()) {
      expect(container.querySelector(".quiz-card h2")?.textContent).toBe(question.prompt);
      await click([...container.querySelectorAll(".answer-option")].find(
        (option) => option.getAttribute("data-answer") === question.answer,
      ));
      expect(container.querySelector(".feedback.positive")).not.toBeNull();
      await click(button(index === 4 ? "See my results" : "Next discovery"));
    }
    expect(container.querySelector(".results")).not.toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.gradeBestRounds["5:data"]).toBe(5);
    expect(saved.bestRounds.data).toBe(5);
    expect(saved.rounds).toBe(1);
    expect(saved.answered).toBe(5);
  });
  it("transitions into the account when auth confirms a session", async () => {
    await mount();
    authenticated();
    await act(async () => mocks.listener?.("SIGNED_IN", mocks.session));
    expect(container.textContent).toContain("Cloud saved");
    expect(mocks.load).toHaveBeenCalledWith(expect.anything(), "adult-one");
  });
});
describe("account progress lifecycle", () => {
  it("does not expose a guest save as another account's progress", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...initialProgress, points: 999 }),
    );
    authenticated();
    await mount();
    expect(container.querySelector(".points-pill")?.textContent).toBe("0 pts");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("999");
  });
  it("saves earned progress to the cloud without changing the guest save", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProgress));
    authenticated();
    await mount();
    await click(container.querySelector(".login-card"));
    expect(mocks.save).toHaveBeenCalledWith(
      expect.anything(),
      "adult-one",
      expect.objectContaining({ points: 20 }),
      0,
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).points).toBe(0);
    expect(container.textContent).toContain("Cloud saved");
  });
  it("does not show an empty dashboard when account loading fails", async () => {
    authenticated();
    mocks.load.mockRejectedValue(new Error("Database policy denied access"));
    await mount();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "policy denied",
    );
    expect(container.querySelector(".login-card")).toBeNull();
    expect(button("Try loading again")).toBeDefined();
  });
  it("shows failed saves and allows explicit retry", async () => {
    authenticated();
    mocks.save
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(1);
    await mount();
    await click(container.querySelector(".login-card"));
    expect(container.querySelector("dialog")?.textContent).toContain(
      "Network unavailable",
    );
    await click(button("Retry saving"));
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.textContent).toContain("Cloud saved");
  });
  it("clears the account view when a sign-out event arrives", async () => {
    authenticated();
    await mount();
    mocks.session = null;
    await act(async () => mocks.listener?.("SIGNED_OUT", null));
    expect(container.textContent).toContain("Welcome to the island");
    expect(container.querySelector(".points-pill")).toBeNull();
  });
  it("serializes rapid progress changes and prevents sign-out during a save", async () => {
    authenticated();
    let finishFirst!: (revision: number) => void;
    mocks.save
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(2);
    await mount();
    await click(container.querySelector(".login-card"));
    expect(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Sign out of grown-up account"]',
      )?.disabled,
    ).toBe(true);
    await click(container.querySelector(".profile-button"));
    await click(container.querySelectorAll(".avatar-option")[2]);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => finishFirst(1));
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[1][2]).toMatchObject({
      avatar: "cat",
      points: 20,
    });
    expect(mocks.save.mock.calls[1][3]).toBe(1);
    expect(container.textContent).toContain("Cloud saved");
  });
  it("requires explicit reload rather than retrying over a conflicting cloud save", async () => {
    authenticated();
    mocks.save.mockRejectedValueOnce(new ProgressConflict());
    await mount();
    await click(container.querySelector(".login-card"));
    expect(container.querySelector("dialog")?.textContent).toContain(
      "Another island update",
    );
    expect(button("Retry saving")).toBeUndefined();
    await click(button("Load latest cloud progress"));
    expect(mocks.load).toHaveBeenCalledTimes(2);
    expect(container.querySelector(".points-pill")?.textContent).toBe("0 pts");
    expect(container.querySelector("dialog")).toBeNull();
  });
  it("reports failed sign-out without claiming the account signed out", async () => {
    authenticated();
    mocks.signOut.mockResolvedValueOnce({ error: new Error("Offline") });
    await mount();
    await click(
      container.querySelector('[aria-label="Sign out of grown-up account"]'),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not sign out",
    );
    expect(container.querySelector(".points-pill")).not.toBeNull();
  });
  it("unmounts one adult's dashboard when the session switches accounts", async () => {
    authenticated();
    await mount();
    mocks.load.mockResolvedValueOnce({
      progress: { ...initialProgress, points: 75 },
      revision: 3,
    });
    mocks.session = { user: { id: "adult-two" } } as Session;
    await act(async () => mocks.listener?.("SIGNED_IN", mocks.session));
    expect(mocks.load).toHaveBeenLastCalledWith(expect.anything(), "adult-two");
    expect(container.querySelector(".points-pill")?.textContent).toBe("75 pts");
  });
});

describe("cloud learning data rights", () => {
  async function openPrivacy() {
    authenticated(); await mount();
    await click(button("Privacy & data"));
    await click(container.querySelector(".privacy-adult input"));
  }
  it("erases only through the own-account RPC and signs out after successful erasure", async () => {
    await openPrivacy();
    await click(button("Erase cloud learning"));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("erase_my_learning_data");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(container.textContent).toContain("Welcome to the island");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not claim deletion or sign out when the migration/request fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Missing erasure migration" } });
    await openPrivacy(); await click(button("Erase cloud learning"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Missing erasure migration");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(container.querySelector(".privacy-center")).not.toBeNull();
  });
  it("uses a blocking dialog during a pending erasure and restores the page on failure", async () => {
    let finish!: (value: { data: null; error: { message: string } }) => void;
    mocks.rpc.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await openPrivacy(); await click(button("Erase cloud learning"));
    expect(container.querySelector("dialog")?.textContent).toContain("Erasing cloud learning data");
    const cancel = new Event("cancel", { cancelable: true, bubbles: true });
    await act(async () => { container.querySelector("dialog")!.dispatchEvent(cancel); });
    expect(cancel.defaultPrevented).toBe(true);
    await act(async () => { finish({ data: null, error: { message: "Try again later" } }); });
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again later");
  });
  it("blocks further play and never re-saves erased progress if sign-out fails", async () => {
    mocks.signOut.mockResolvedValueOnce({ error: new Error("Offline sign-out") }).mockResolvedValueOnce({ error: null });
    await openPrivacy(); await click(button("Erase cloud learning"));
    expect(container.textContent).toContain("Learning is paused");
    expect(container.textContent).toContain("Offline sign-out");
    expect(container.querySelector(".app-shell")).toBeNull();
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(mocks.save).not.toHaveBeenCalled();
    await click(button("Sign out"));
    expect(container.textContent).toContain("Welcome to the island");
  });
});
