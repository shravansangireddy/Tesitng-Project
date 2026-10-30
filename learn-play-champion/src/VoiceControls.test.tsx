// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VoiceControls, { type VoiceContext } from "./VoiceControls";
import type { Recognition, RecognitionResultEvent } from "./speech";
import App from "./App";
import { getLearningContent } from "./content";
import { STORAGE_KEY } from "./game";
vi.mock("./privacy", () => ({
  privacy: { speechEnabled: true },
}));

class MockRecognition implements Recognition {
  static instances: MockRecognition[] = [];
  lang = "";
  continuous = true;
  interimResults = true;
  maxAlternatives = 0;
  onstart: Recognition["onstart"] = null;
  onresult: Recognition["onresult"] = null;
  onerror: Recognition["onerror"] = null;
  onend: Recognition["onend"] = null;
  start = vi.fn(() => this.onstart?.());
  abort = vi.fn();
  constructor() { MockRecognition.instances.push(this); }
}
class MockUtterance {
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
const speak = vi.fn();
const cancel = vi.fn();
const last = <T,>(items: T[]): T => items[items.length - 1];
const onAction = vi.fn(), onAnswer = vi.fn(), onAssist = vi.fn(), onActivity = vi.fn();
let container: HTMLDivElement, root: Root;
let context: VoiceContext;
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function render(next: VoiceContext = context) {
  context = next;
  await act(async () => root.render(<VoiceControls context={context}
    onAction={onAction} onAnswer={onAnswer} onAssist={onAssist} onActivity={onActivity} />));
}
async function allowMic() {
  await click(container.querySelector<HTMLInputElement>('.voice-panel details input')!);
}
const event = (text: string, final = true): RecognitionResultEvent => ({
  results: [{ isFinal: final, 0: { transcript: text } }],
});
async function say(text: string) {
  await click(button("Listen for one command"));
  const active = last(MockRecognition.instances);
  await act(async () => active.onresult?.(event(text)));
  return active;
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("SpeechRecognition", MockRecognition);
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  MockRecognition.instances = [];
  vi.clearAllMocks();
  context = {
    key: "first", read: "Which number? Option A. 2. Option B. 3.",
    options: ["2", "3"], canAnswer: true, canNext: false,
    canReplay: false, canHint: true, hint: "Count one more.",
  };
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("optional voice lifecycle", () => {
  it("never starts speech or microphone automatically and requires a grown-up opt-in", async () => {
    await render();
    expect(button("Listen for one command").disabled).toBe(true);
    expect(MockRecognition.instances).toHaveLength(0);
    expect(speak).not.toHaveBeenCalled();
    await allowMic();
    expect(MockRecognition.instances).toHaveLength(0);
    expect(button("Listen for one command").disabled).toBe(false);
    expect(container.textContent).toContain("may send audio to its provider");
  });
  it("uses one-shot final recognition and confirms before submitting", async () => {
    await render();
    await allowMic();
    const active = await say("option B");
    expect(active.continuous).toBe(false);
    expect(active.interimResults).toBe(false);
    expect(active.lang).toBe("en-US");
    expect(active.abort).toHaveBeenCalled();
    expect(onAnswer).not.toHaveBeenCalled();
    expect(container.querySelector(".voice-candidate")?.textContent).toContain("3");
    expect(last(speak.mock.calls)[0].text).toContain("Proposed answer: 3");
    await say("confirm answer");
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("3");
    expect(container.querySelector(".voice-candidate")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("ignores interim results and does not infer a choice from an ambiguous answer", async () => {
    await render({ ...context, options: ["We play.", "we play."] });
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    await act(async () => active.onresult?.(event("option A", false)));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(container.querySelector(".voice-candidate")).toBeNull();
    await act(async () => active.onresult?.(event("we play")));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("could not choose");
  });
  it("rejects a whole spoken word for spelling but accepts separate letters", async () => {
    await render({ ...context, spelling: true, options: undefined });
    await allowMic();
    await say("cat");
    expect(container.querySelector(".voice-candidate")).toBeNull();
    await say("C A T");
    expect(container.querySelector(".voice-candidate")?.textContent).toContain("cat");
    await click(button("Use this answer"));
    expect(onAnswer).toHaveBeenCalledWith("cat");
  });
  it("rejects stale results after a question or feedback changes", async () => {
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    const delayed = active.onresult!;
    await render({ ...context, key: "second", options: ["4", "5"] });
    await act(async () => delayed(event("option A")));
    expect(active.abort).toHaveBeenCalled();
    expect(container.querySelector(".voice-candidate")).toBeNull();
    expect(onAnswer).not.toHaveBeenCalled();
  });
  it("stops and rejects delayed callbacks after opt-out or Stop voice", async () => {
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    const delayed = active.onresult!;
    await allowMic();
    await act(async () => delayed(event("option A")));
    expect(button("Listen for one command").disabled).toBe(true);
    expect(onAnswer).not.toHaveBeenCalled();
    await allowMic();
    await say("option A");
    await click(button("Stop voice"));
    expect(container.querySelector(".voice-candidate")).toBeNull();
  });
  it("cleans up microphone and synthesis when unmounted", async () => {
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    await act(async () => root.render(<p>Gone</p>));
    expect(active.abort).toHaveBeenCalled();
    expect(active.onresult).toBeNull();
    await render();
    await click(button("Read this aloud"));
    await act(async () => root.render(<p>Gone again</p>));
    expect(cancel).toHaveBeenCalled();
  });
  it.each(["not-allowed", "audio-capture", "network", "no-speech"])("surfaces %s and permits another attempt", async (code) => {
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    await act(async () => active.onerror?.({ error: code }));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(button("Listen for one command").disabled).toBe(false);
    expect(active.abort).toHaveBeenCalled();
  });
  it("stops listening after a bounded timeout", async () => {
    vi.useFakeTimers();
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    await act(async () => vi.advanceTimersByTime(15000));
    expect(active.abort).toHaveBeenCalled();
    expect(container.textContent).toContain("15 seconds");
    expect(button("Listen for one command").disabled).toBe(false);
  });
  it("stops and rejects delayed results while a recovery dialog is open", async () => {
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    const delayed = active.onresult!;
    const dialog = document.createElement("dialog");
    await act(async () => { dialog.open = true; document.body.append(dialog); });
    try {
      expect(active.abort).toHaveBeenCalled();
      expect(button("Listen for one command").disabled).toBe(true);
      await act(async () => delayed(event("home")));
      expect(onAction).not.toHaveBeenCalled();
    } finally { await act(async () => dialog.remove()); }
  });
  it("stops when the page is hidden and does not resume the microphone", async () => {
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(active.abort).toHaveBeenCalled();
    expect(container.textContent).toContain("page was hidden");
    expect(MockRecognition.instances).toHaveLength(1);
  });
  it("surfaces synchronous recognition failures and read-aloud errors", async () => {
    await render();
    await allowMic();
    vi.stubGlobal("SpeechRecognition", class {
      constructor() { throw new Error("No service"); }
    });
    await render();
    await click(button("Listen for one command"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("No service");
    await click(button("Read this aloud"));
    const utterance = last(speak.mock.calls)[0] as MockUtterance;
    await act(async () => utterance.onerror?.({ error: "synthesis-unavailable" }));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("synthesis-unavailable");
  });
  it("reports unsupported speech APIs without blocking ordinary controls", async () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    vi.stubGlobal("speechSynthesis", undefined);
    await render();
    expect(button("Read this aloud").disabled).toBe(true);
    expect(button("Listen for one command").disabled).toBe(true);
    expect(container.textContent).toContain("Spoken commands are unavailable");
  });
  it("rejects microphone use in an insecure context", async () => {
    vi.stubGlobal("isSecureContext", false);
    await render();
    expect(button("Listen for one command").disabled).toBe(true);
  });
  it("supports prefixed recognition and reports a synchronous start failure", async () => {
    class BrokenStart extends MockRecognition {
      start = vi.fn(() => { throw new Error("Microphone busy"); });
    }
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", BrokenStart);
    await render();
    await allowMic();
    await click(button("Listen for one command"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Microphone busy");
    expect(button("Listen for one command").disabled).toBe(false);
    expect(last(MockRecognition.instances).abort).toHaveBeenCalled();
  });
  it("reads a passage, stops output before listening, and auto-reads only after opt-in", async () => {
    await render({ ...context, story: "Jo rolls a ball." });
    await click(button("Read story aloud"));
    expect(last(speak.mock.calls)[0].text).toBe("Jo rolls a ball.");
    await allowMic();
    await click(button("Listen for one command"));
    expect(cancel).toHaveBeenCalled();
    await click(button("Stop voice"));
    await click(container.querySelector<HTMLInputElement>(".voice-setting input")!);
    expect(last(speak.mock.calls)[0].text).toBe(context.read);
    await render({ ...context, key: "next", read: "Next prompt." });
    expect(last(speak.mock.calls)[0].text).toBe("Next prompt.");
  });
  it("only advances after feedback and starts only a displayed activity", async () => {
    await render({ ...context, activities: ["Count", "Shapes"] });
    await allowMic();
    await say("next");
    expect(onAction).not.toHaveBeenCalled();
    await say("start activity two");
    expect(onActivity).toHaveBeenCalledWith(1);
    await say("start activity nine");
    expect(onActivity).toHaveBeenCalledTimes(1);
    await render({ ...context, key: "feedback", canAnswer: false, canNext: true });
    await say("next");
    expect(onAction).toHaveBeenCalledWith("next");
  });
});

async function chooseGrade(grade: string) {
  const select = container.querySelector<HTMLSelectElement>("#learning-grade")!;
  await act(async () => { select.value = grade; select.dispatchEvent(new Event("change", { bubbles: true })); });
}
async function typeAnswer(value: string) {
  const input = container.querySelector<HTMLInputElement>("#spelling-answer")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
describe("voice and spelling bee in the actual app", () => {
  it("stops voice before native navigation confirmation even when leaving is canceled", async () => {
    await act(async () => root.render(<App />));
    await click(button("Start spelling bee"));
    await allowMic();
    await click(button("Listen for one command"));
    const active = last(MockRecognition.instances);
    const delayed = active.onresult!;
    const confirm = vi.spyOn(window, "confirm").mockImplementation(() => {
      expect(active.abort).toHaveBeenCalled();
      return false;
    });
    await click(button("Adventures"));
    expect(confirm).toHaveBeenCalledOnce();
    expect(container.querySelector(".quiz-heading")?.textContent).toContain("Spelling Bee Championship");
    await act(async () => delayed(event("C A T")));
    expect(container.querySelector(".voice-candidate")).toBeNull();
    await click(button("Hear the bee word"));
    cancel.mockClear();
    confirm.mockImplementation(() => {
      expect(cancel).toHaveBeenCalled();
      return false;
    });
    await click(button("Adventures"));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(container.textContent).not.toContain("Reading aloud…");
  });
  it("adds Pre-K with simpler content, no fake standards, and a separate score", async () => {
    await act(async () => root.render(<App />));
    await chooseGrade("prek");
    expect(container.querySelector(".grade-library")?.textContent).toContain("no formal Pre-K");
    expect(container.querySelector(".curriculum-guide a")).toBeNull();
    await click(button("Adventures"));
    await click(container.querySelector<HTMLButtonElement>(".activity-card button")!);
    expect(container.querySelector(".quiz-card h2")?.textContent).toBe("Which letter matches A?");
    await allowMic();
    await say("option A");
    expect(container.querySelector(".feedback")).toBeNull();
    const value = container.querySelector(".voice-candidate strong")!.textContent!;
    await click(button("Use this answer"));
    expect(container.querySelector(".feedback")?.textContent).not.toContain("speedy");
    expect(value).toBeTruthy();
  });
  it("reads hints on command even when automatic reading is off", async () => {
    await act(async () => root.render(<App />));
    await click(button("Adventures"));
    await click(container.querySelector<HTMLButtonElement>(".activity-card button")!);
    await allowMic();
    await say("hint");
    expect(container.querySelector(".hint")).not.toBeNull();
    expect(last(speak.mock.calls)[0].text).toBe(container.querySelector(".hint")!.textContent);
  });
  it("keeps all five bee questions after mistakes and saves a distinct result", async () => {
    await act(async () => root.render(<App />));
    await chooseGrade("2");
    await click(button("Start spelling bee"));
    const words = getLearningContent().grades["2"].lessons.spelling.questions;
    for (const [index, word] of words.entries()) {
      await click(button("Hear the bee word"));
      expect(last(speak.mock.calls)[0].text).toBe(`Your word is ${word.answer}.`);
      await typeAnswer(index < 2 ? "mistake" : word.answer);
      await click(button("Check my word"));
      await click(button(index === 4 ? "See my results" : "Next discovery"));
    }
    expect(container.querySelector(".results")?.textContent).toContain("3/ 5");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.beeBestRounds["2"]).toBe(3);
    expect(saved.gradeBestRounds?.["2:spelling"]).toBeUndefined();
    expect(saved.bestRounds.spelling).toBeUndefined();
    expect(saved.rounds).toBe(1);
    expect(saved.points).toBe(130);
    expect(saved.answered).toBe(5);
    await click(button("Play again"));
    expect(container.querySelector(".quiz-heading")?.textContent).toContain("Spelling Bee Championship");
  });
  it("shows regular voice support only through Grade 2 but bee audio at higher grades", async () => {
    await act(async () => root.render(<App />));
    await chooseGrade("3");
    expect(container.querySelector(".voice-panel")).toBeNull();
    await click(button("Start spelling bee"));
    expect(container.querySelector(".voice-panel")).not.toBeNull();
    await click(button("Hear the bee word"));
    expect(speak).toHaveBeenCalled();
  });
});
