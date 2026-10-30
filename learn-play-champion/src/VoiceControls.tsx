import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { privacy } from "./privacy";
import {
  recognitionConstructor, speechError, spokenText, voiceIntent,
  type Recognition, type VoiceAction,
} from "./speech";

export interface VoiceContext {
  key: string;
  read: string;
  story?: string;
  word?: string;
  options?: string[];
  spelling?: boolean;
  canAnswer: boolean;
  canNext: boolean;
  canReplay: boolean;
  canHint: boolean;
  hint?: string;
  hintShown?: boolean;
  activities?: string[];
}
export interface VoiceHandle {
  stop: () => void;
}
interface VoiceControlsProps {
  context: VoiceContext;
  onAction: (action: VoiceAction) => void;
  onAnswer: (value: string) => void;
  onAssist: () => void;
  onActivity: (index: number) => void;
}
const VoiceControls = forwardRef<VoiceHandle, VoiceControlsProps>(function VoiceControls({
  context, onAction, onAnswer, onAssist, onActivity,
}, ref) {
  const [consent, setConsent] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedRead = useRef<string | null>(null);
  const current = useRef({ context, onAction, onAnswer, onAssist, onActivity, consent, candidate });
  current.current = { context, onAction, onAnswer, onAssist, onActivity, consent, candidate };
  const supportedRead = privacy.speechEnabled && typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
  const supportedListen = privacy.speechEnabled && window.isSecureContext && !!recognitionConstructor();
  const isBlocked = () => document.hidden ||
    !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');

  function stop() {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const active = recognition.current;
    recognition.current = null;
    if (active) {
      active.onstart = active.onresult = active.onerror = active.onend = null;
      try { active.abort(); }
      catch (failure) { console.error("Could not stop browser speech recognition:", failure); }
    }
    if (utterance.current) {
      utterance.current.onend = utterance.current.onerror = null;
      window.speechSynthesis?.cancel();
      utterance.current = null;
    }
  }
  function stopVisible() {
    stop();
    setListening(false);
    setSpeaking(false);
  }
  function speak(text: string) {
    if (isBlocked()) return;
    stopVisible();
    setError("");
    if (!supportedRead) {
      setError("Read-aloud is unavailable in this browser. A grown-up can read the visible text.");
      return;
    }
    current.current.onAssist();
    const token = generation.current;
    const speech = new SpeechSynthesisUtterance(spokenText(text));
    speech.lang = "en-US";
    speech.rate = 0.85;
    speech.onend = () => {
      if (token !== generation.current) return;
      utterance.current = null;
      setSpeaking(false);
    };
    speech.onerror = (event) => {
      if (token !== generation.current) return;
      utterance.current = null;
      setSpeaking(false);
      setError(`Read-aloud failed (${event.error}). Try again or ask a grown-up to read.`);
    };
    utterance.current = speech;
    setSpeaking(true);
    try {
      window.speechSynthesis.speak(speech);
    } catch (failure) {
      stopVisible();
      setError(`Read-aloud could not start: ${failure instanceof Error ? failure.message : String(failure)}`);
    }
  }
  function confirm() {
    if (isBlocked()) return;
    const latest = current.current;
    if (latest.candidate === null || !latest.context.canAnswer) return;
    const value = latest.candidate;
    stopVisible();
    setCandidate(null);
    latest.onAnswer(value);
  }
  function processTranscript(transcript: string) {
    if (isBlocked()) return;
    const latest = current.current;
    const text = transcript.trim().toLowerCase().replace(/[.!?]+$/, "");
    setMessage(`Heard: ${transcript}`);
    if (text === "confirm answer") {
      if (latest.candidate !== null) confirm();
      else setError("There is no answer to confirm yet.");
      return;
    }
    if (text === "cancel answer") { setCandidate(null); return; }
    if (text === "stop") { stopVisible(); setCandidate(null); return; }
    const activityMatch = text.match(/^start activity (one|two|three|four|five|six|seven|eight|nine|[1-9])$/);
    if (activityMatch) {
      const number = activityMatch[1];
      const index = /^\d$/.test(number) ? Number(number) - 1
        : ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"].indexOf(number);
      if (latest.context.activities?.[index]) latest.onActivity(index);
      else setError("Open Adventures and choose a learning world before starting a displayed activity.");
      return;
    }
    const intent = voiceIntent(transcript, latest.context.options,
      latest.context.canAnswer && latest.context.spelling);
    if (intent.kind === "error") { setError(intent.message); return; }
    if (intent.kind === "answer") {
      if (!latest.context.canAnswer) { setError("This question is finished. Say Next or use the next button."); return; }
      setCandidate(intent.value);
      setMessage(`Check your answer: ${intent.value}. Press Use this answer, or press Listen again and say Confirm answer.`);
      if (supportedRead) speak(`Proposed answer: ${
        latest.context.spelling ? intent.value.split("").join(", ") : intent.value
      }. Check it. Press Listen again and say confirm answer, or use the buttons.`);
      return;
    }
    const action = intent.action;
    if (action === "read") { speak(latest.context.word ?? latest.context.read); return; }
    if (action === "story") {
      if (latest.context.story) speak(latest.context.story);
      else setError("There is no story on this screen.");
      return;
    }
    if ((action === "next" && !latest.context.canNext) ||
      (action === "hint" && !latest.context.canHint) ||
      (action === "replay" && !latest.context.canReplay)) {
      setError("That command is not available on this screen.");
      return;
    }
    if (action === "hint" && latest.context.hint) {
      if (latest.context.hintShown) { speak(latest.context.hint); return; }
      requestedRead.current = latest.context.hint;
    }
    setCandidate(null);
    latest.onAction(action);
  }
  function listen() {
    if (!current.current.consent || !supportedListen || isBlocked()) return;
    stopVisible();
    setError("");
    setMessage("Starting microphone. Say one command or answer.");
    current.current.onAssist();
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    let active: Recognition;
    try { active = new Constructor(); }
    catch (failure) {
      setError(`Speech recognition could not start: ${failure instanceof Error ? failure.message : String(failure)}`);
      return;
    }
    const token = generation.current;
    const contextKey = current.current.context.key;
    const fresh = () => token === generation.current &&
      current.current.consent && current.current.context.key === contextKey;
    recognition.current = active;
    active.lang = "en-US";
    active.continuous = false;
    active.interimResults = false;
    active.maxAlternatives = 1;
    let heard = false;
    active.onstart = () => { if (fresh()) setMessage("Listening now. Say one command or answer."); };
    active.onresult = (event) => {
      if (!fresh()) return;
      const result = Array.from(event.results).find((item) => item.isFinal);
      if (!result) return;
      heard = true;
      const transcript = result[0].transcript;
      stopVisible();
      processTranscript(transcript);
    };
    active.onerror = (event) => {
      if (!fresh()) return;
      stopVisible();
      setError(speechError(event.error));
    };
    active.onend = () => {
      if (!fresh()) return;
      stopVisible();
      if (!heard) setMessage("Listening ended without an answer. Press Listen to try again.");
    };
    setListening(true);
    timer.current = setTimeout(() => {
      if (!fresh()) return;
      stopVisible();
      setMessage("Listening stopped after 15 seconds. Press Listen to try again.");
    }, 15000);
    try { active.start(); }
    catch (failure) {
      stopVisible();
      setError(`Speech recognition could not start: ${failure instanceof Error ? failure.message : String(failure)}`);
    }
  }
  useEffect(() => {
    stopVisible();
    setCandidate(null);
    setMessage("");
    setError("");
    if (requestedRead.current || autoRead) {
      const text = requestedRead.current ?? context.word ?? context.read;
      requestedRead.current = null;
      speak(text);
    }
    return stop;
    // The context key covers every screen/question/feedback change, not callback identity.
  }, [context.key, autoRead]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stopVisible();
        setCandidate(null);
        setMessage("Voice stopped while this page was hidden.");
      }
    };
    document.addEventListener("visibilitychange", hide);
    let hadDialog = false;
    const observer = new MutationObserver(() => {
      const hasDialog = !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
      if (hasDialog !== hadDialog) {
        hadDialog = hasDialog;
        setBlocked(hasDialog);
        if (hasDialog) {
          stopVisible();
          setCandidate(null);
          setMessage("Voice paused while a dialog needs attention.");
        }
      }
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["open", "role", "aria-modal"],
    });
    return () => {
      document.removeEventListener("visibilitychange", hide);
      observer.disconnect();
      stop();
    };
  }, []);
  useImperativeHandle(ref, () => ({
    stop: () => {
      stopVisible();
      setCandidate(null);
      setMessage("Voice stopped.");
    },
  }));

  return (
    <section className="voice-panel panel" aria-label="Optional voice helper">
      <h2>Listen &amp; speak</h2>
      <p>Optional voice help. Buttons and typing always work.</p>
      {!privacy.speechEnabled && <p role="status">Browser voice is disabled by the site's privacy settings.
        A grown-up must review provider processing and required authorization before the operator enables it.
        Use buttons, typing, or adult read-aloud instead.</p>}
      <div className="voice-actions">
        <button className="button secondary" disabled={!supportedRead || blocked}
          onClick={() => speak(context.word ?? context.read)}>
          {context.word ? "Hear the bee word" : "Read this aloud"}
        </button>
        {context.word && <button className="button secondary" disabled={!supportedRead || blocked}
          onClick={() => speak(context.read)}>Read the clue</button>}
        {context.story && <button className="button secondary" disabled={!supportedRead || blocked}
          onClick={() => speak(context.story!)}>Read story aloud</button>}
        <button className="button secondary" onClick={() => {
          stopVisible(); setCandidate(null); setMessage("Voice stopped.");
        }}>Stop voice</button>
      </div>
      {!supportedRead && <p role="status">Read-aloud is unavailable here. A grown-up can read the visible words.</p>}
      <label className="voice-setting">
        <input type="checkbox" checked={autoRead} disabled={!supportedRead}
          onChange={(event) => setAutoRead(event.target.checked)} />
        Read each new question and feedback aloud
      </label>
      <details>
        <summary>Grown-up microphone permission &amp; privacy</summary>
        <p>Speech recognition depends on this browser and may send audio to its provider
          for processing. Read-aloud may also use a browser-provided online voice.
          This app does not record, upload, or save audio or transcripts to its own
          storage or Supabase. Provider handling and retention depend on the browser;
          this is not a privacy or legal consent guarantee. Do not speak names or other
          personal information. A grown-up should review device and school policies first.</p>
        <label className="voice-setting">
          <input type="checkbox" checked={consent} disabled={!supportedListen}
            onChange={(event) => {
              stopVisible(); setCandidate(null);
              setConsent(event.target.checked); setMessage(""); setError("");
            }} />
          I am a grown-up and allow optional microphone use for this open learning page.
        </label>
      </details>
      {!supportedListen && <p role="status">Spoken commands are unavailable in this browser
        or connection. Use a speech-recognition-capable browser over HTTPS or localhost,
        or keep using buttons and typing.</p>}
      <div className="voice-actions">
        <button className="button primary" disabled={!consent || !supportedListen || listening || blocked}
          onClick={listen}>Listen for one command</button>
        {listening && <strong role="status">Microphone active or starting — stops after one response.</strong>}
        {speaking && <span role="status">Reading aloud…</span>}
      </div>
      <details className="voice-command-help">
        <summary>What can I say?</summary>
        <p>
        Say “Read question”, “Read story”, “Hint”, “Next”, “Home”, “Adventures”,
        “English”, “Math”, or “Play again” when available.
        {" "}In Adventures say “start activity one” through “start activity nine”.
        {" "}Say “spelling bee” to start a practice championship.
        {context.spelling
          ? " For spelling, say separate letters, for example C, A, T; not the whole word."
          : " For choices, say “option A” or the answer. Use the option letter if choices sound alike."}
        {" "}Check the proposed answer, then press Use this answer, or press Listen
        again and say “Confirm answer”. “Cancel answer” clears it.
        </p>
      </details>
      {candidate !== null && <div className="voice-candidate">
        <p>Proposed answer: <strong>{candidate}</strong></p>
        <button className="button primary" disabled={blocked} onClick={confirm}>Use this answer</button>
        <button className="button secondary" onClick={() => {
          setCandidate(null); setMessage("Answer cleared. Try again or use the buttons.");
        }}>Cancel answer</button>
      </div>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
});
export default VoiceControls;
