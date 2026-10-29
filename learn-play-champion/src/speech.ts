export interface RecognitionResultEvent {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
export type RecognitionConstructor = new () => Recognition;
export function recognitionConstructor(): RecognitionConstructor | undefined {
  const browser = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
export const isEarlyGrade = (grade: string) => ["prek", "k", "1", "2"].includes(grade);
export function spokenText(text: string): string {
  return text.replace(/(\d)\/(\d)/g, "$1 over $2")
    .replace(/×/g, " times ").replace(/÷/g, " divided by ")
    .replace(/[−-](?=\s*\d)/g, " minus ")
    .replace(/\+/g, " plus ").replace(/=/g, " equals ")
    .replace(/>/g, " greater than ").replace(/</g, " less than ");
}
export type VoiceAction = "read" | "story" | "hint" | "next" | "home" | "adventures" | "english" | "math" | "replay" | "bee";
const commands: Record<string, VoiceAction> = {
  "read": "read", "read question": "read", "repeat": "read",
  "repeat word": "read", "read word": "read",
  "read story": "story", "hint": "hint", "give me a hint": "hint",
  "next": "next", "next question": "next", "show results": "next",
  "home": "home", "go home": "home", "adventures": "adventures",
  "english": "english", "english forest": "english",
  "math": "math", "math mountain": "math", "play again": "replay",
  "spelling bee": "bee",
};
export const normalizedSpeech = (value: string) =>
  value.toLowerCase().trim().replace(/[.,!?;:]+$/g, "").replace(/\s+/g, " ");
const letterNames: Record<string, string> = {
  a: "a", ay: "a", b: "b", bee: "b", be: "b", c: "c", see: "c", sea: "c",
  d: "d", dee: "d", e: "e", ee: "e", f: "f", ef: "f", g: "g", gee: "g",
  h: "h", aitch: "h", i: "i", eye: "i", j: "j", jay: "j", k: "k", kay: "k",
  l: "l", el: "l", m: "m", em: "m", n: "n", en: "n", o: "o", oh: "o",
  p: "p", pee: "p", q: "q", cue: "q", queue: "q", r: "r", are: "r",
  s: "s", ess: "s", t: "t", tea: "t", tee: "t", u: "u", you: "u",
  v: "v", vee: "v", w: "w", x: "x", ex: "x", y: "y", why: "y",
  z: "z", zee: "z", zed: "z",
};
export function spokenLetters(transcript: string): string | null {
  const text = normalizedSpeech(transcript)
    .replace(/^(?:spell|letters?|my spelling is)\s+/, "")
    .replace(/double[ -]u/g, "w")
    .replace(/[-,.]/g, " ");
  const tokens = text.trim().split(/\s+/);
  if (!tokens.length || tokens.length > 40 || tokens.some((token) => !letterNames[token])) return null;
  return tokens.map((token) => letterNames[token]).join("");
}
export type VoiceIntent =
  | { kind: "command"; action: VoiceAction }
  | { kind: "answer"; value: string }
  | { kind: "error"; message: string };
export function voiceIntent(transcript: string, options?: string[], spelling = false): VoiceIntent {
  const text = normalizedSpeech(transcript);
  if (commands[text]) return { kind: "command", action: commands[text] };
  if (spelling) {
    const letters = spokenLetters(text);
    return letters
      ? { kind: "answer", value: letters }
      : { kind: "error", message: "Say separate letters, such as C, A, T, or use the keyboard. Saying a whole word does not spell it." };
  }
  if (!options) return { kind: "error", message: "Choose an adventure first, or say Home, Adventures, English, or Math." };
  const match = text.match(/^(?:option|choice|answer)\s+(\w+)$/);
  if (match) {
    const labels = ["one", "two", "three", "four", "five", "six"];
    const label = match[1];
    const letter = letterNames[label];
    const index = letter && /^[a-f]$/.test(letter) ? letter.charCodeAt(0) - 97
      : /^\d$/.test(label) ? Number(label) - 1 : labels.indexOf(label);
    if (options[index] !== undefined) return { kind: "answer", value: options[index] };
    return { kind: "error", message: "That option is not on this question. Say a displayed option letter." };
  }
  const matches = options.filter((option) => normalizedSpeech(option) === text);
  if (matches.length === 1) return { kind: "answer", value: matches[0] };
  return { kind: "error", message: "I could not choose one answer safely. Say an option letter, such as 'option A', or tap your choice." };
}
export function speechError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed": return "Microphone or speech-service access was denied. A grown-up can check browser permissions. Buttons and typing still work.";
    case "audio-capture": return "No microphone is available. Connect one or use buttons and typing.";
    case "no-speech": return "No speech was heard. Press Listen and try again, or use the buttons.";
    case "network": return "The browser speech service could not connect. Check the connection or use buttons and typing.";
    case "language-not-supported": return "This browser speech service does not support U.S. English. Use buttons and typing.";
    default: return `Speech recognition stopped (${code}). Try again or use buttons and typing.`;
  }
}
