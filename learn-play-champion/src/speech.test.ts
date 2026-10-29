import { describe, expect, it } from "vitest";
import { speechError, spokenLetters, spokenText, voiceIntent, isEarlyGrade } from "./speech";

describe("safe spoken commands and answers", () => {
  it("limits ordinary voice support to Pre-K through Grade 2", () => {
    expect(["prek", "k", "1", "2", "3", "4", "5"].map(isEarlyGrade))
      .toEqual([true, true, true, true, false, false, false]);
  });
  it("uses explicit option labels without guessing answer content", () => {
    const options = ["12", "8", "3"];
    expect(voiceIntent("Option B.", options)).toEqual({ kind: "answer", value: "8" });
    expect(voiceIntent("option bee", options)).toEqual({ kind: "answer", value: "8" });
    expect(voiceIntent("choice two", options)).toEqual({ kind: "answer", value: "8" });
    expect(voiceIntent("answer 3", options)).toEqual({ kind: "answer", value: "3" });
    expect(voiceIntent("option F", options).kind).toBe("error");
    expect(voiceIntent("option nine", options).kind).toBe("error");
    expect(voiceIntent("twelve", options).kind).toBe("error");
    expect(voiceIntent("12", options)).toEqual({ kind: "answer", value: "12" });
  });
  it("never guesses between capitalization choices or similar phrases", () => {
    const options = ["We play.", "we play.", "They sleep."];
    expect(voiceIntent("we play", options).kind).toBe("error");
    expect(voiceIntent("option A", options)).toEqual({ kind: "answer", value: "We play." });
    expect(voiceIntent("they sleep.", options)).toEqual({ kind: "answer", value: "They sleep." });
    expect(voiceIntent("they slept", options).kind).toBe("error");
  });
  it("parses separate letters, spoken letter names, and a single Pre-K letter", () => {
    expect(spokenLetters("C, A, T.")).toBe("cat");
    expect(spokenLetters("C. A. T.")).toBe("cat");
    expect(spokenLetters("spell bee ay tee")).toBe("bat");
    expect(spokenLetters("letters double u ay vee ee")).toBe("wave");
    expect(spokenLetters("letter A")).toBe("a");
    expect(spokenLetters("cat")).toBeNull();
    expect(spokenLetters("my name is Jo")).toBeNull();
    expect(spokenLetters("")).toBeNull();
    expect(voiceIntent("C A T", undefined, true)).toEqual({ kind: "answer", value: "cat" });
    expect(voiceIntent("cat", undefined, true).kind).toBe("error");
  });
  it("only recognizes whitelisted navigation, not account or reward actions", () => {
    expect(voiceIntent("Go home!")).toEqual({ kind: "command", action: "home" });
    expect(voiceIntent("next question")).toEqual({ kind: "command", action: "next" });
    expect(voiceIntent("spelling bee")).toEqual({ kind: "command", action: "bee" });
    expect(voiceIntent("sign out").kind).toBe("error");
    expect(voiceIntent("claim daily gift").kind).toBe("error");
  });
  it("speaks common arithmetic and comparison notation", () => {
    expect(spokenText("3 + 2 = 5; 8 - 1; 3 × 4; 6 ÷ 2; 1/2 < 3/4"))
      .toContain("1 over 2  less than  3 over 4");
    expect(spokenText("4 × 3")).toBe("4  times  3");
  });
  it("provides explicit messages for permission, device, service and network errors", () => {
    expect(speechError("not-allowed")).toContain("denied");
    expect(speechError("audio-capture")).toContain("No microphone");
    expect(speechError("network")).toContain("could not connect");
    expect(speechError("no-speech")).toContain("No speech");
    expect(speechError("unknown-code")).toContain("unknown-code");
  });
});
