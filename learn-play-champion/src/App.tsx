import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Flame,
  Gift,
  GraduationCap,
  Home,
  Lightbulb,
  LockKeyhole,
  Map,
  Medal,
  Mountain,
  PartyPopper,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  activities,
  answerMatches,
  avatarUnlocked,
  badges,
  claimHelp,
  claimLogin,
  completeRound,
  completeCodingPuzzle,
  completeAILesson,
  initialProgress,
  localDate,
  makeRound,
  parseProgress,
  STORAGE_KEY,
  yesterday,
  type Activity,
  type ActivityId,
  type Attempt,
  type Avatar,
  type Progress,
  type Question,
  type RoundResult,
  type Subject,
} from "./game";
import { getLearningContent } from "./content";
import { gradeIds, gradeLabels, type GradeId } from "./content-schema";
import LessonTips from "./LessonTips";
import LearningChart from "./LearningChart";
import VoiceControls, { type VoiceContext, type VoiceHandle } from "./VoiceControls";
import { isEarlyGrade, type VoiceAction } from "./speech";
import CodingWorld from "./CodingWorld";
import { isCodingGrade } from "./coding";
import AIWorld from "./AIWorld";
import { themes } from "./themes";
import "./themes.css";
import PracticeRooms from "./PracticeRooms";
import type { SupabaseClient } from "@supabase/supabase-js";
import PrivacyCenter from "./PrivacyCenter";
import BookShelf from "./BookShelf";
import TeacherLibrary from "./TeacherLibrary";
import { supabase } from "./supabase";
import LearningPath from "./LearningPath";
import { finishPathCheck } from "./learning-path";
import QuestionShape from "./QuestionShape";

type View = "home" | "adventures" | "rewards" | "leaderboard" | "team" | "coding" | "ai" | "rooms" | "privacy" | "books" | "teacher-library" | "learning-path";
type Session = {
  championship: boolean;
  grade: GradeId;
  activity: Activity;
  questions: Question[];
  index: number;
  attempts: Attempt[];
  startedAt: number;
};
const avatarNames: Record<Avatar, string> = {
  owl: "Pip the Owl",
  fox: "Nova the Fox",
  cat: "Cleo the Cat",
  unicorn: "Luna the Unicorn",
};
const avatarEmoji: Record<Avatar, string> = {
  owl: "🦉",
  fox: "🦊",
  cat: "🐱",
  unicorn: "🦄",
};

function Mascot({
  animal = "owl",
  className = "",
}: {
  animal?: "owl" | "fox";
  className?: string;
}) {
  return animal === "owl" ? (
    <svg
      className={`mascot ${className}`}
      viewBox="0 0 220 230"
      role="img"
      aria-label="Pip the friendly owl"
    >
      <path d="M37 85 38 23 84 54Q110 42 139 54L184 23 183 94" fill="#8260cc" />
      <ellipse cx="110" cy="135" rx="82" ry="81" fill="#9978e1" />
      <ellipse cx="110" cy="147" rx="60" ry="62" fill="#c6aff4" />
      <path
        d="M34 113Q-1 135 28 184Q52 178 55 146M187 113Q220 136 193 184Q168 178 167 146"
        fill="#7953c2"
      />
      <ellipse cx="77" cy="100" rx="37" ry="42" fill="#fff6e3" />
      <ellipse cx="143" cy="100" rx="37" ry="42" fill="#fff6e3" />
      <ellipse cx="82" cy="104" rx="14" ry="19" fill="#302549" />
      <ellipse cx="138" cy="104" rx="14" ry="19" fill="#302549" />
      <circle cx="87" cy="97" r="5" fill="white" />
      <circle cx="143" cy="97" r="5" fill="white" />
      <path d="m99 124 11 19 12-19" fill="#ffbe54" />
      <ellipse cx="52" cy="127" rx="12" ry="7" fill="#efa7c4" />
      <ellipse cx="168" cy="127" rx="12" ry="7" fill="#efa7c4" />
      <path
        d="m91 160 6 8 6-8m8 15 6 8 6-8m6-23 6 8 6-8"
        stroke="#a78ada"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M78 210h24m18 0h24"
        stroke="#ffbe54"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      className={`mascot ${className}`}
      viewBox="0 0 220 230"
      role="img"
      aria-label="Nova the friendly fox"
    >
      <path d="M159 157Q224 133 204 84Q174 99 170 130" fill="#f3a24b" />
      <path d="M204 84Q210 107 204 119L187 104Z" fill="#fff3da" />
      <ellipse cx="106" cy="162" rx="52" ry="55" fill="#ed9847" />
      <ellipse cx="108" cy="171" rx="30" ry="39" fill="#fff0d6" />
      <path
        d="M40 95 36 23 88 60 136 59 183 23 175 103 110 155Z"
        fill="#f2a04b"
      />
      <path d="m48 48 9 44 24-23m82-21-26 21 24 22" fill="#bd663d" />
      <path d="M40 95Q80 82 110 127Q140 82 175 103L110 155Z" fill="#fff1d7" />
      <ellipse cx="77" cy="99" rx="8" ry="13" fill="#382a41" />
      <ellipse cx="143" cy="99" rx="8" ry="13" fill="#382a41" />
      <circle cx="80" cy="95" r="3" fill="white" />
      <circle cx="146" cy="95" r="3" fill="white" />
      <path d="M101 124q9-7 18 0l-9 10Z" fill="#382a41" />
      <path
        d="M110 134v7m-9 0q9 8 18 0"
        fill="none"
        stroke="#382a41"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M76 212h21m22 0h21"
        stroke="#bd663d"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>("button, input")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !dialog) return;
      const elements = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ),
      ];
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button
          className="icon-button dialog-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
function loadProgress(): { progress: Progress; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { progress: raw ? parseProgress(raw) : initialProgress, error: "" };
  } catch (error) {
    console.error("Unable to load champion progress:", error);
    return {
      progress: initialProgress,
      error:
        "Your saved progress could not be loaded. You can play with fresh progress; your next action will try to save it on this device.",
    };
  }
}
export default function App({
  cloudProgress,
  onProgressChange,
  accountControls,
  initialGrade,
  roomClient,
  cloudSaving,
  onEraseCloud,
}: {
  cloudProgress?: Progress;
  onProgressChange?: (progress: Progress) => void;
  accountControls?: ReactNode;
  initialGrade?: GradeId;
  roomClient?: SupabaseClient;
  cloudSaving?: boolean;
  onEraseCloud?: () => Promise<void>;
}) {
  const [loaded] = useState(() =>
    cloudProgress ? { progress: cloudProgress, error: "" } : loadProgress(),
  );
  const { teammate, grades } = getLearningContent();
  const [progress, setProgress] = useState(() => initialGrade
    ? { ...loaded.progress, selectedGrade: initialGrade } : loaded.progress);
  const [storageError, setStorageError] = useState(loaded.error);
  const initial = useRef(loaded.progress);
  const [view, setView] = useState<View>(() => new URLSearchParams(location.search).has("donation_return") ||
    new URLSearchParams(location.search).has("donation_cancel") ? "privacy" : "home");
  const [subject, setSubject] = useState<Subject>("english");
  const [grade, setGrade] = useState<GradeId>(initialGrade ?? loaded.progress.selectedGrade ?? "1");
  const gradePack = grades[grade];
  const gradeBest = (id: ActivityId) =>
    progress.gradeBestRounds?.[`${grade}:${id}`] || 0;
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Attempt | null>(null);
  const [hint, setHint] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpAnswer, setHelpAnswer] = useState("");
  const [chestOpen, setChestOpen] = useState(false);
  const [today, setToday] = useState(localDate());
  const [roundId, setRoundId] = useState(0);
  const voiceAssisted = useRef(false);
  const voiceControls = useRef<VoiceHandle>(null);
  const codingDirty = useRef(false);
  const contentDirty = useRef(false);
  const pathDirty = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const answerInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    if (progress === initial.current) return;
    if (onProgressChange) {
      onProgressChange(progress);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      setStorageError("");
    } catch (error) {
      console.error("Unable to save champion progress:", error);
      setStorageError(
        "Progress could not be saved on this device. Keep this page open to continue, and allow browser storage to save future progress.",
      );
    }
  }, [progress, onProgressChange]);
  useEffect(() => {
    heading.current?.focus();
  }, [view, session?.index, session?.activity.id, result]);
  const level = Math.floor(progress.points / 200) + 1;
  const practiceStreak =
    progress.lastPlayedDate === today || progress.lastPlayedDate === yesterday()
      ? progress.streak
      : 0;
  const teamGoal = Math.ceil((120 + progress.correct + 1) / 200) * 200;
  const earnedBadges = badges.filter((badge) => badge.earned(progress));
  const earnedChests = Math.floor(progress.rounds / 3);
  const availableChests = earnedChests - progress.chestCount;
  const currentQuestion = session?.questions[session.index];
  const sessionGuide = session
    ? grades[session.grade].lessons[session.activity.id].guide
    : undefined;
  const navigate = (next: View) => {
    voiceControls.current?.stop();
    if (view === "learning-path" && next === view) return true;
    if (view === "learning-path" && pathDirty.current &&
      !window.confirm("Leave your practice check? Unfinished answers will not be saved.")) return false;
    if (view === "privacy" && contentDirty.current &&
      !window.confirm("Leave the content studio? Unsaved edits will be lost. Saved server drafts are kept.")) return false;
    if (view === "coding" && next === "coding") return true;
    if (view === "coding" && codingDirty.current &&
      !window.confirm("Leave Coding Cove? Your block plan is temporary and will be cleared. Solved puzzles stay saved."))
      return false;
    if (
      session &&
      !window.confirm(
        "Leave this adventure? This unfinished round will not be saved.",
      )
    )
      return false;
    setSession(null);
    setResult(null);
    setView(next);
    setFeedback(null);
    setAnswer("");
    setHint(false);
    return true;
  };
  const start = (activity: Activity, championship = false) => {
    voiceAssisted.current = false;
    setRoundId((id) => id + 1);
    setSession({
      championship,
      grade,
      activity: {
        ...activity,
        title: championship ? "Spelling Bee Championship" : gradePack.lessons[activity.id].title,
        description: gradePack.lessons[activity.id].skill,
      },
      questions: makeRound(activity.id, Math.random, grade),
      index: 0,
      attempts: [],
      startedAt: performance.now(),
    });
    setResult(null);
    setFeedback(null);
    setAnswer("");
    setHint(false);
  };
  const submitAnswer = (value: string) => {
    if (!session || !currentQuestion || feedback || !value.trim()) return;
    const correct = currentQuestion.options
      ? value === currentQuestion.answer
      : answerMatches(value, currentQuestion.answer);
    setAnswer(value);
    setFeedback({
      correct,
      speed: correct && !hint && !voiceAssisted.current &&
        !session.championship && performance.now() - session.startedAt <= 8000,
    });
  };
  const nextQuestion = () => {
    if (!session || !feedback) return;
    const attempts = [...session.attempts, feedback];
    if (session.index === 4) {
      const completed = completeRound(
        progress,
        session.activity.id,
        attempts,
        new Date(),
        session.grade,
        session.championship,
      );
      setProgress(completed.progress);
      setResult(completed.result);
      setSession(null);
    } else {
      voiceAssisted.current = false;
      setSession({
        ...session,
        index: session.index + 1,
        attempts,
        startedAt: performance.now(),
      });
    }
    setFeedback(null);
    setAnswer("");
    setHint(false);
  };
  const visibleActivities = activities.filter((activity) => activity.subject === subject);
  const voiceEnabled = !["coding", "ai", "rooms", "privacy", "books", "teacher-library", "learning-path"].includes(view) && (isEarlyGrade(grade) || session?.championship || result?.championship) &&
    !avatarOpen && !helpOpen && !chestOpen;
  const readQuestion = currentQuestion
    ? `${currentQuestion.prompt}. ${currentQuestion.chart
        ? `${currentQuestion.chart.title}. ${currentQuestion.chart.labels.map((label, index) =>
            `${label}: ${currentQuestion.chart!.counts[index] * currentQuestion.chart!.scale}`).join(". ")}.`
        : ""} ${currentQuestion.options?.map((choice, index) =>
            `Option ${String.fromCharCode(65 + index)}. ${choice}.`).join(" ") ??
            "Spell using the keyboard or say separate letters."}`
    : "";
  const voiceContext: VoiceContext = {
    key: `${grade}:${view}:${subject}:${roundId}:${session?.index}:${feedback?.correct}:${hint}:${!!result}`,
    read: session && currentQuestion
      ? feedback
        ? `${feedback.correct ? "Well done." : "Let's learn together."} ${currentQuestion.explanation}. ${session.index === 4 ? "See my results" : "Next discovery"} is ready.`
        : `${readQuestion} ${hint ? `Hint: ${currentQuestion.hint}` : ""}`
      : result
        ? `${result.championship ? "Spelling bee practice" : "Adventure"} complete. ${result.correct} out of five correct. ${result.points} points earned. Say Play again, Home, or Adventures.`
        : `${gradeLabels[grade]}. ${view === "home"
            ? "Welcome to Champion Island. Say English, Math, Adventures, or spelling bee."
            : view === "adventures"
              ? `${subject === "english" ? "English Forest" : "Math Mountain"}. ${visibleActivities.map((a, i) => `Activity ${i + 1}: ${gradePack.lessons[a.id].title}`).join(". ")}. Say start activity and its number, or spelling bee.`
              : "Use the buttons to explore this page. You can say Home, Adventures, English, or Math."}`,
    ...(session?.championship && !feedback ? { word: `Your ${session.grade === "prek" ? "letter" : "word"} is ${currentQuestion?.answer}.` } : {}),
    story: currentQuestion?.passage,
    options: !feedback ? currentQuestion?.options : undefined,
    spelling: !!currentQuestion && !currentQuestion.options,
    canAnswer: !!session && !feedback,
    canNext: !!feedback,
    canReplay: !!result,
    canHint: !!session && !feedback,
    hint: currentQuestion?.hint,
    hintShown: hint,
    activities: !session && !result && view === "adventures"
      ? visibleActivities.map((a) => gradePack.lessons[a.id].title) : undefined,
  };
  const voiceAction = (action: VoiceAction) => {
    if (action === "hint") { voiceAssisted.current = true; setHint(true); }
    else if (action === "next") nextQuestion();
    else if (action === "replay" && result)
      start(activities.find((a) => a.id === result.activity)!, !!result.championship);
    else if (action === "bee") {
      if (navigate("adventures")) start(activities.find((a) => a.id === "spelling")!, true);
    } else if (action === "english" || action === "math") {
      if (navigate("adventures")) setSubject(action);
    } else if (action === "home" || action === "adventures") navigate(action);
  };
  const subjectCard = (which: Subject) => {
    const isEnglish = which === "english";
    const items = activities.filter((a) => a.subject === which);
    const mastered = items.filter((a) => gradeBest(a.id) >= 4).length;
    return (
      <button
        className={`world-card ${which}`}
        onClick={() => {
          setSubject(which);
          navigate("adventures");
        }}
      >
        <div className="world-copy">
          <span className="world-label">
            {isEnglish ? <BookOpen size={15} /> : <Mountain size={15} />}
            {isEnglish ? "ENGLISH" : "MATH"}
          </span>
          <h3>{isEnglish ? "English Forest" : "Math Mountain"}</h3>
          <p>
            {isEnglish
              ? "Big stories. Wonderful words."
              : "Little puzzles. Mighty discoveries."}
            <br />
            Your next adventure is waiting.
          </p>
          <span className="world-cta">
            Let’s explore <ArrowRight size={17} />
          </span>
        </div>
        <div className="world-art">
          <span className="art-spark one">✦</span>
          <span className="art-spark two">✧</span>
          <Mascot animal={isEnglish ? "owl" : "fox"} />
          <span className="ground" />
        </div>
        <div className="world-footer">
          <span>
            {gradeLabels[grade]} · {items.length} activities
          </span>
          <span>
            {mastered}/{items.length} skills shining <Star size={13} />
          </span>
        </div>
      </button>
    );
  };
  const title =
    view === "home"
      ? "My dashboard"
      : view === "adventures"
        ? "My adventures"
        : view === "rewards"
          ? "My treasure room"
          : view === "leaderboard"
            ? "Friendly leaderboard"
            : view === "coding" ? "Coding Cove" : view === "ai" ? "AI discovery" : view === "rooms" ? "Private rooms" : view === "privacy" ? "Privacy & data" : view === "books" ? "Picture books" : view === "teacher-library" ? "Teacher library" : view === "learning-path" ? "My learning path" : "Our team corner";
  return (
    <div className="app-shell" data-theme={progress.theme ?? "island"}>
      <a className="skip-link" href="#main">
        Skip to learning
      </a>
      <aside className="sidebar">
        <a
          href="#main"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            navigate("home");
          }}
          aria-label="Learn and Play Champion home"
        >
          <span className="brand-icon">
            <GraduationCap size={27} />
          </span>
          <span>
            Learn & Play<small>CHAMPION</small>
          </span>
        </a>
        <div className="island-label">YOUR LITTLE WORLD</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "home", label: "My dashboard", icon: Home },
              { id: "adventures", label: "Adventures", icon: Map },
              { id: "learning-path", label: "My learning path", icon: Target },
              { id: "books", label: "Picture books", icon: BookOpen },
              { id: "teacher-library", label: "Teacher library", icon: GraduationCap },
              { id: "coding", label: "Coding Cove · 3–5", icon: Sparkles },
              { id: "ai", label: "AI discovery · 3+", icon: Lightbulb },
              { id: "rooms", label: "Private rooms", icon: Users },
              { id: "rewards", label: "My rewards", icon: Gift },
              { id: "leaderboard", label: "Leaderboard", icon: Trophy },
              { id: "team", label: "Team corner", icon: Users },
              { id: "privacy", label: "Privacy & data", icon: LockKeyhole },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id && !session && !result ? "active" : ""}`}
              aria-current={
                view === item.id && !session && !result ? "page" : undefined
              }
              onClick={() => navigate(item.id)}
            >
              <item.icon size={21} />
              <span>{item.label}</span>
              {item.id === "rewards" && availableChests > 0 && (
                <span className="notification-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="encouragement">
            <span>🌈</span>
            <strong>
              A little practice.
              <br />A lot of possibility.
            </strong>
            <p>
              Every try helps your
              <br />
              brilliant brain grow.
            </p>
          </div>
          <span className="safe-label">
            <LockKeyhole size={13} /> A safe space to shine
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Champion Island <ChevronRight size={14} />
            <strong>
              {session ? "Adventure time" : result ? "Round complete" : title}
            </strong>
          </div>
          <div className="topbar-right">
            <div
              onClickCapture={(event) => {
                voiceControls.current?.stop();
                if (pathDirty.current && !window.confirm("Change accounts? Your unfinished practice check will not be saved.")) {
                  event.preventDefault(); event.stopPropagation(); return;
                }
                if (contentDirty.current && !window.confirm("Leave your content edits to change accounts? Unsaved edits will be lost.")) {
                  event.preventDefault(); event.stopPropagation(); return;
                }
                if (
                  !cloudProgress &&
                  (session || (view === "coding" && codingDirty.current)) &&
                  !window.confirm(
                    "Leave this unfinished adventure to sign in? This round or block plan will not be saved.",
                  )
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
            >
              {accountControls}
            </div>
            <span className="points-pill">
              <Star size={17} fill="currentColor" />
              {progress.points.toLocaleString()} <span>pts</span>
            </span>
            <button
              className="profile-button"
              onClick={() => setAvatarOpen(true)}
              aria-label="Customize your avatar"
            >
              <span>{avatarEmoji[progress.avatar]}</span>
              <div>
                Hey, Champion!<small>Level {level} explorer</small>
              </div>
              <ChevronRight size={15} />
            </button>
          </div>
        </header>
        <main id="main" className="content">
          {!session && !result && <fieldset className="theme-picker">
            <legend>Pick your happy colors</legend>
            <div className="theme-options">{themes.map((theme) =>
              <button key={theme.id} className="theme-option" aria-pressed={(progress.theme ?? "island") === theme.id}
                title={theme.description} onClick={() => setProgress((current) => ({ ...current, theme: theme.id }))}>
                <span className="theme-swatches" aria-hidden="true">{theme.colors.map((color) => <i key={color} style={{ background: color }} />)}</span>
                {theme.label}
              </button>)}</div>
            <p>Your theme is saved with your progress. All activities still work the same way.</p>
          </fieldset>}
          {voiceEnabled && (
            <VoiceControls
              ref={voiceControls}
              context={voiceContext}
              onAction={voiceAction}
              onAnswer={submitAnswer}
              onAssist={() => { voiceAssisted.current = true; }}
              onActivity={(index) => {
                if (voiceContext.activities?.[index]) start(visibleActivities[index]);
              }}
            />
          )}
          {storageError && (
            <div className="storage-warning" role="alert">
              <CircleHelp size={20} />
              <span>{storageError}</span>
            </div>
          )}
          {view === "learning-path" ? (
            <LearningPath key={grade} grade={grade} progress={progress}
              onDirty={(dirty) => { pathDirty.current = dirty; }}
              onComplete={(answers) => setProgress(current => finishPathCheck(current, grade, answers, localDate()))}
              onPractice={(id) => {
                if (navigate("adventures")) start(activities.find(activity => activity.id === id)!);
              }} />
          ) : view === "teacher-library" ? (
            <TeacherLibrary key={grade} grade={grade} client={roomClient ?? supabase} />
          ) : view === "books" ? (
            <BookShelf key={grade} grade={grade} onGradeChange={(next) => {
              setGrade(next);
              setProgress((current) => ({ ...current, selectedGrade: next }));
            }} />
          ) : view === "privacy" ? (
            <PrivacyCenter progress={progress} cloud={!!cloudProgress} paymentClient={roomClient}
              onContentDirty={(dirty) => { contentDirty.current = dirty; }}
              onErase={cloudProgress ? (!cloudSaving ? onEraseCloud : undefined) : async () => {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
              }} />
          ) : view === "rooms" ? (
            <PracticeRooms client={roomClient} saving={cloudSaving} />
          ) : view === "ai" ? (
            <AIWorld
              initialGrade={isCodingGrade(grade) ? grade : "3"}
              completed={progress.aiCompleted ?? []}
              onComplete={(id) => setProgress((current) => completeAILesson(current, id))}
              onBack={() => navigate("adventures")}
            />
          ) : view === "coding" ? (
            <CodingWorld
              initialGrade={isCodingGrade(grade) ? grade : "3"}
              completed={progress.codingCompleted ?? []}
              onComplete={(id) => setProgress((current) => completeCodingPuzzle(current, id))}
              onBack={() => navigate("adventures")}
              onDirty={(dirty) => { codingDirty.current = dirty; }}
            />
          ) : session && currentQuestion ? (
            <>
              <button
                className="text-button back"
                onClick={() => navigate("adventures")}
              >
                <ArrowLeft size={17} /> Back to adventures
              </button>
              <div className="quiz-heading">
                <span className="grade-round-label">
                  {gradeLabels[session.grade]}
                </span>
                <span className={`eyebrow ${session.activity.subject}`}>
                  {session.activity.subject === "english"
                    ? "ENGLISH FOREST"
                    : "MATH MOUNTAIN"}
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  {session.activity.title}
                </h1>
                <p>Take your time. Every try grows your brain.</p>
                {session.championship && <p>
                  Solo practice · Five {session.grade === "prek" ? "letters" : "words"} · No elimination.
                  Hear the word above, or ask a grown-up to read it.
                  Your best bee score is separate from ordinary spelling.
                </p>}
              </div>
              {sessionGuide && <LessonTips guide={sessionGuide} />}
              <section className="quiz-card">
                <div className="question-top">
                  <span>QUESTION {session.index + 1} OF 5</span>
                  <span>
                    <Star size={16} /> +10 per correct answer
                  </span>
                </div>
                <div
                  className="round-progress"
                  aria-label={`Question ${session.index + 1} of 5`}
                >
                  {session.questions.map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < session.index
                          ? session.attempts[i].correct
                            ? "correct"
                            : "attempted"
                          : i === session.index
                            ? "current"
                            : ""
                      }
                    />
                  ))}
                </div>
                {currentQuestion.passage && (
                  <blockquote className="passage">
                    <BookOpen size={24} />
                    <p>{currentQuestion.passage}</p>
                  </blockquote>
                )}
                {currentQuestion.chart && <LearningChart chart={currentQuestion.chart} />}
                {currentQuestion.shape && <QuestionShape shape={currentQuestion.shape} />}
                <h2>{session.championship
                  ? session.grade === "prek" ? "Listen to the letter, then try it." : "Listen to the bee word, then spell it."
                  : currentQuestion.prompt}</h2>
                {session.championship && (
                  <>
                    <p className="bee-clue">Clue: {currentQuestion.prompt}</p>
                    <details className="bee-adult-word">
                      <summary>Grown-up word card (if audio is unavailable)</summary>
                      <p>Read aloud: <strong>{currentQuestion.answer}</strong>.
                        This is practice, not a supervised or secure contest.</p>
                    </details>
                  </>
                )}
                {currentQuestion.options ? (
                  <div className="answer-grid">
                    {currentQuestion.options.map((option, i) => (
                      <button
                        key={option}
                        data-answer={option}
                        disabled={!!feedback}
                        className={`answer-option ${feedback && answer === option ? (feedback.correct ? "right-answer" : "wrong-answer") : ""} ${feedback && option === currentQuestion.answer ? "right-answer" : ""}`}
                        onClick={() => submitAnswer(option)}
                      >
                        <span className="option-letter">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="option-copy">
                          {option}
                          {isEarlyGrade(session.grade) && <small className="spoken-option">Say option {String.fromCharCode(65 + i)}</small>}
                        </span>
                        {feedback && option === currentQuestion.answer && (
                          <Check size={20} />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitAnswer(answer);
                    }}
                    className="spelling-form"
                  >
                    <label htmlFor="spelling-answer">Your spelling</label>
                    <input
                      ref={answerInput}
                      id="spelling-answer"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      disabled={!!feedback}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={40}
                      placeholder="Type your word here…"
                    />
                    {!feedback && (
                      <button
                        className="button primary"
                        disabled={!answer.trim()}
                      >
                        Check my word <Check size={18} />
                      </button>
                    )}
                  </form>
                )}
                {hint && !feedback && (
                  <div className="hint" role="status">
                    <Lightbulb size={20} />
                    {currentQuestion.hint}
                  </div>
                )}
                {feedback ? (
                  <div
                    className={`feedback ${feedback.correct ? "positive" : "keep-growing"}`}
                    role="status"
                  >
                    <strong>
                      {feedback.correct
                        ? "You’ve got it! Beautiful thinking."
                        : "Not quite yet. Let’s learn together."}
                      {feedback.speed && " +5 speedy stars!"}
                    </strong>
                    <p>{currentQuestion.explanation}</p>
                    <button className="button primary" onClick={nextQuestion}>
                      {session.index === 4
                        ? "See my results"
                        : "Next discovery"}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="quiz-bottom">
                    <button
                      className="text-button"
                      disabled={hint}
                      onClick={() => {
                        setHint(true);
                        answerInput.current?.focus();
                      }}
                    >
                      <Lightbulb size={18} />
                      {hint ? "Hint is showing" : "A little hint, please"}
                    </button>
                    <span>No rush. Hints are always free.</span>
                  </div>
                )}
              </section>
            </>
          ) : result ? (
            <section className="results panel">
              <div className="result-celebration">
                <PartyPopper size={50} />
              </div>
              <span className="eyebrow">{result.championship ? "SPELLING BEE PRACTICE COMPLETE" : "ADVENTURE COMPLETE"}</span>
              <h1 ref={heading} tabIndex={-1}>
                {result.championship ? (result.perfect ? "A practice bee champion!" : "Brave spelling, growing skills!")
                  : result.perfect
                  ? "A perfect little adventure!"
                  : "Look at you growing!"}
              </h1>
              <p>
                You practiced{" "}
                {result.championship ? "Spelling Bee Championship" : result.grade
                  ? grades[result.grade].lessons[result.activity].title
                  : activities.find((a) => a.id === result.activity)?.title}
                {result.grade && <> · {gradeLabels[result.grade]}</>}.<br />
                Every discovery is something to be proud of.
              </p>
              <div className="result-score">
                <strong>
                  {result.correct}
                  <small>/ 5</small>
                </strong>
                <span>correct answers</span>
              </div>
              <div className="score-breakdown">
                <div>
                  <span>Thoughtful answers</span>
                  <strong>+{result.correct * 10}</strong>
                </div>
                <div>
                  <span>Speed bonuses</span>
                  <strong>+{result.speedPoints}</strong>
                </div>
                {result.perfect && (
                  <div>
                    <span>Perfect round bonus</span>
                    <strong>+50</strong>
                  </div>
                )}
                {result.dailyBonus && (
                  <div>
                    <span>Daily challenge complete</span>
                    <strong>+100</strong>
                  </div>
                )}
                <div className="score-total">
                  <span>Points earned</span>
                  <strong>
                    +{result.points} <Star size={18} fill="currentColor" />
                  </strong>
                </div>
              </div>
              <p className="mastery-note">
                {result.championship
                  ? `Solo practice, not a live championship. Your best ${gradeLabels[result.grade!]} bee score is ${progress.beeBestRounds?.[result.grade!] ?? 0}/5. No elimination and no speed bonus.`
                  : "Skills grow with correct answers, not points. Get 4/5 in an activity to make that skill shine."}
              </p>
              <div className="result-actions">
                <button
                  className="button primary"
                  onClick={() =>
                    start(activities.find((a) => a.id === result.activity)!, !!result.championship)
                  }
                >
                  Play again
                  <ArrowRight size={18} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => navigate("home")}
                >
                  Back to my island
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {view === "home"
                      ? "LET’S MAKE TODAY A LITTLE BRIGHTER"
                      : "LEARN A LITTLE. SHINE A LOT."}
                  </span>
                  <h1 ref={heading} tabIndex={-1}>
                    {view === "home" ? (
                      <>
                        Ready, set, <span>discover!</span>{" "}
                        <span className="wave">👋</span>
                      </>
                    ) : (
                      title
                    )}
                  </h1>
                  <p>
                    {view === "home"
                      ? "Big adventures start with little steps. What will you learn today?"
                      : view === "adventures"
                        ? "Choose your path. There’s a new discovery around every corner."
                        : view === "rewards"
                          ? "A collection of your effort, curiosity, and wonderful little wins."
                          : view === "leaderboard"
                            ? "Celebrate your practice. Cheer on every kind of progress."
                            : "Brilliant things happen when we learn together."}
                  </p>
                </div>
                {view === "home" && (
                  <div className="streak-pill">
                    <Flame size={21} />
                    {practiceStreak} day{practiceStreak !== 1 ? "s" : ""}
                    <small>practice streak</small>
                  </div>
                )}
              </div>
              {(view === "home" || view === "adventures") && (
                <section
                  className="grade-library panel"
                  aria-label="Grade learning library"
                >
                  <div className="grade-library-top">
                    <div>
                      <span className="eyebrow">YOUR PRE-K–5 PRACTICE LIBRARY</span>
                      <h2>A little learning at your level.</h2>
                    </div>
                    <div className="grade-picker">
                      <label htmlFor="learning-grade">Choose your grade</label>
                      <select
                        id="learning-grade"
                        value={grade}
                        onChange={(event) => {
                          const next = gradeIds.find(
                            (id) => id === event.target.value,
                          );
                          if (next) {
                            setGrade(next);
                            setProgress((current) => ({ ...current, selectedGrade: next }));
                          }
                        }}
                      >
                        {gradeIds.map((id) => (
                          <option value={id} key={id}>
                            {gradeLabels[id]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p>{gradePack.overview}</p>
                  <small>
                    80 questions · 16 activities · 1 story and 1 nonfiction text per grade.{" "}
                    {grade === "prek"
                      ? "Adult-supported early exploration; no formal Pre-K standards alignment claimed."
                      : "Original practice informed by U.S. standards, not a complete curriculum."}{" "}
                    {isEarlyGrade(grade) && "Use Listen & speak for optional voice help."}{" "}
                    Best scores below are for {gradeLabels[grade]}; points and
                    badges celebrate all grades.
                  </small>
                  <details className="curriculum-guide">
                    <summary>Grown-up guide: U.S. standards &amp; coverage</summary>
                    {grade === "prek" && <p>
                      Pre-K has simpler original letter, listening, counting, sorting,
                      and shape exploration with a grown-up. Common Core begins at
                      Kindergarten, not Pre-K. The references below describe K–5 only.
                      No Pre-K standards certification or reading independence is claimed.
                    </p>}
                    <p>
                      There is no single U.S. curriculum. This library uses selected
                      Common Core English and Math targets, checked against the
                      California Department of Education standards on October 29, 2026.
                      State requirements and classroom sequences vary; this is not
                      state approval or certification.
                    </p>
                    <p>
                      The original activities practice word study, literature,
                      language, operations, patterns, problems, and geometry.
                      Six added activities at each grade offer nonfiction, writing
                      preparation, place value, parts and fractions, measurement,
                      and data, with teaching tips and selected standard codes.
                      Kindergarten starts with number parts, not formal fractions.
                    </p>
                    <p>
                      Writing and discussion need the paper-and-conversation tasks
                      in “Learn &amp; try together” plus adult feedback. Quiz scores
                      do not assess composition, oral fluency, listening, or full
                      standards mastery. Use additional books, manipulatives,
                      instruction, and assessment for a full-year program.
                    </p>
                    {grade !== "prek" && <p>
                      Official references for {gradeLabels[grade]}:{" "}
                      <a
                        href={`https://www2.cde.ca.gov/cacs/ela?mingrade=${grade === "k" ? 0 : grade}&maxgrade=${grade === "k" ? 0 : grade}&perpage=100`}
                        target="_blank"
                        rel="noreferrer"
                      >English language arts</a>{" · "}
                      <a
                        href={`https://www2.cde.ca.gov/cacs/math?mingrade=${grade === "k" ? 0 : grade}&maxgrade=${grade === "k" ? 0 : grade}&perpage=100`}
                        target="_blank"
                        rel="noreferrer"
                      >Mathematics</a>.
                      {" "}Links open an external state education site for grown-ups.
                      All app questions and passages are original, not copied textbooks.
                    </p>}
                  </details>
                </section>
              )}
              {(view === "home" || view === "adventures") && (
                <section className="books-banner panel" aria-label="Picture books">
                  <span className="eyebrow">READ, LOOK &amp; WONDER · PRE-K–5</span>
                  <h2>A small book. A big adventure.</h2>
                  <p>Open two original illustrated mini-books for {gradeLabels[grade]}.
                    Turn the pages, enjoy colorful pictures, and try a friendly reading question.
                    Read with a grown-up or explore at your own pace.</p>
                  <button className="button primary" onClick={() => navigate("books")}>Explore picture books</button>
                </section>
              )}
              {(view === "home" || view === "adventures") && (
                <section className="teacher-content-banner panel" aria-label="Teacher-added learning">
                  <span className="eyebrow">GROWN-UP REVIEWED · {gradeLabels[grade]}</span>
                  <h2>More learning from your teachers.</h2>
                  <p>Explore extra passages and practice questions approved by this site's content administrators.
                    Teacher drafts stay private until reviewed.</p>
                  <button className="button primary" onClick={() => navigate("teacher-library")}>Explore teacher library</button>
                </section>
              )}
              {(view === "home" || view === "adventures") && (
                <section className="room-banner panel" aria-label="Private room competition">
                  <span className="eyebrow">BETTER TOGETHER · PRIVATE WEEKLY PRACTICE</span>
                  <h2>A little friendly competition.</h2>
                  <p>Join classmates or friends through a grown-up's private invite.
                    Generated nicknames, weekly room points, no chat. Real sign-in and database setup required.</p>
                  <button className="button primary" onClick={() => navigate("rooms")}>Explore private rooms</button>
                </section>
              )}
              {(view === "home" || view === "adventures") && (
                <section className="ai-banner panel" aria-label="AI discovery">
                  <span className="eyebrow">AI DISCOVERY · GRADE 3 AND UP</span>
                  <h2>What is a model? Let’s find out together.</h2>
                  <p>Learn patterns, examples, training, models, and predictions in simple words.
                    Teach a tiny shape model, check its mistakes, and explore safe, thoughtful AI use.
                    {" "}{progress.aiCompleted?.length ?? 0}/6 lessons completed.</p>
                  <button className="button primary" onClick={() => navigate("ai")}>Explore AI discovery</button>
                </section>
              )}
              {(view === "home" || view === "adventures") && (
                <section className="coding-banner panel" aria-label="Coding Cove">
                  <span className="eyebrow">NEW · CODING FOR GRADES 3–5</span>
                  <h2>Give a robot a brilliant little plan.</h2>
                  <p>18 interactive puzzles: sequences, turns, debugging, loops, conditions,
                    and reusable functions. Start simple and combine your coding superpowers.
                    {" "}{progress.codingCompleted?.length ?? 0}/18 solved.</p>
                  <button className="button primary" onClick={() => navigate("coding")}>Explore Coding Cove</button>
                </section>
              )}
              {(view === "home" || view === "adventures") && (
                <section className="bee-banner panel" aria-label="Spelling bee championship practice">
                  <Trophy size={30} />
                  <div>
                    <h2>Spelling Bee Championship</h2>
                    <p>{gradeLabels[grade]} · Solo practice · Five {grade === "prek" ? "letters" : "words"} · No elimination.
                      {" "}Hear each word, then type or say its letters.
                      {grade === "prek" && " Pre-K explores five single letters with a grown-up."}
                      {" "}Uses this grade's spelling bank; not a live contest.</p>
                    <p>Best bee score: {progress.beeBestRounds?.[grade] ?? 0}/5.
                      {" "}+10 per correct, +50 for five correct, usual daily completion reward;
                      no speed bonus. Bee scores are separate from regular spelling scores.</p>
                    <button className="button primary"
                      onClick={() => start(activities.find((a) => a.id === "spelling")!, true)}>
                      Start spelling bee
                    </button>
                  </div>
                </section>
              )}
              {view === "home" && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="hero-tag">
                        <Sparkles size={14} /> A WORLD OF WONDER AWAITS
                      </span>
                      <h2>
                        Small steps.
                        <br />
                        Super-sized <span>you.</span>
                      </h2>
                      <p>
                        Explore, play, and grow your superpowers.
                        <br />
                        Your Champion Island adventure starts here.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => {
                          setSubject("english");
                          navigate("adventures");
                        }}
                      >
                        Let’s play & learn <ArrowRight size={18} />
                      </button>
                      <span className="hero-footnote">
                        <span className="tiny-avatars">🦉 🦊</span> Pip & Nova
                        are cheering you on!
                      </span>
                    </div>
                    <div className="hero-illustration" aria-hidden="true">
                      <div className="sun" />
                      <span className="cloud cloud-one" />
                      <span className="cloud cloud-two" />
                      <span className="hero-star star-one">✦</span>
                      <span className="hero-star star-two">✦</span>
                      <span className="floating-symbol symbol-one">A+</span>
                      <span className="floating-symbol symbol-two">2+3</span>
                      <div className="hill back-hill" />
                      <div className="hill front-hill" />
                      <div className="island-base" />
                      <div className="tree tree-one" />
                      <div className="tree tree-two" />
                      <Mascot className="hero-owl" />
                      <Mascot animal="fox" className="hero-fox" />
                      <span className="flower flower-one">✿</span>
                      <span className="flower flower-two">✿</span>
                      <span className="welcome-sign">CHAMPION ISLAND</span>
                    </div>
                  </section>
                  <section
                    className="home-photo-showcase"
                    aria-labelledby="home-photo-heading"
                  >
                    <div className="section-heading">
                      <h2 id="home-photo-heading">
                        Learning looks like this <span>📸</span>
                      </h2>
                      <span>Tap a picture to keep exploring</span>
                    </div>
                    <div className="home-photo-grid">
                      <button
                        type="button"
                        className="home-photo-card"
                        onClick={() => navigate("books")}
                      >
                        <img
                          src="/images/kids-creating.webp"
                          srcSet="/images/kids-creating-small.webp 600w, /images/kids-creating.webp 1200w"
                          sizes="(max-width: 700px) calc(100vw - 40px), 520px"
                          width="1200"
                          height="800"
                          alt="Children leaning over an open illustrated book, pointing and working together"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="home-photo-caption">
                          <small>PICTURE BOOKS</small>
                          <strong>Read, point, and wonder</strong>
                          <em>Open the bookshelf →</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="home-photo-card"
                        onClick={() => navigate("adventures")}
                      >
                        <img
                          src="/images/map-adventure.webp"
                          srcSet="/images/map-adventure-small.webp 600w, /images/map-adventure.webp 1200w"
                          sizes="(max-width: 700px) calc(100vw - 40px), 520px"
                          width="1200"
                          height="800"
                          alt="A child seen from behind exploring an outdoor landscape with a paper map"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="home-photo-caption">
                          <small>ADVENTURE MAP</small>
                          <strong>Follow a clue, find a discovery</strong>
                          <em>Start an adventure →</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="home-photo-card"
                        onClick={() => navigate("learning-path")}
                      >
                        <img
                          src="/images/kids-homework.webp"
                          srcSet="/images/kids-homework-small.webp 600w, /images/kids-homework.webp 1200w"
                          sizes="(max-width: 700px) calc(100vw - 40px), 520px"
                          width="1200"
                          height="800"
                          alt="A young boy with glasses writing in a notebook at a desk, with an open book and a stack of books beside him"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="home-photo-caption">
                          <small>MY LEARNING PATH</small>
                          <strong>Write it, solve it, shine</strong>
                          <em>See my next steps →</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="home-photo-card"
                        onClick={() => navigate("coding")}
                      >
                        <img
                          src="/images/kids-coding.webp"
                          srcSet="/images/kids-coding-small.webp 600w, /images/kids-coding.webp 1200w"
                          sizes="(max-width: 700px) calc(100vw - 40px), 520px"
                          width="1200"
                          height="800"
                          alt="A young boy typing on a laptop at a desk at home, with a notebook beside him"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="home-photo-caption">
                          <small>CODING COVE</small>
                          <strong>Tap, code, create</strong>
                          <em>Visit Coding Cove →</em>
                        </span>
                      </button>
                    </div>
                    <p className="home-photo-credit">
                      Photos:{" "}
                      <a
                        href="https://unsplash.com/photos/boys-writing-on-book-zRwXf6PizEo"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Andrew Ebrahim
                      </a>
                      ,{" "}
                      <a
                        href="https://unsplash.com/photos/child-looking-at-map-kZO9xqmO_TA"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Annie Spratt
                      </a>
                      , and{" "}
                      <a
                        href="https://unsplash.com/photos/young-boy-with-glasses-writing-in-a-notebook-at-desk-xZJK3Dp65OU"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Vitaly Gariev
                      </a>{" "}
                      / Unsplash. Illustrative stock photos, not app users.
                    </p>
                  </section>
                  <section
                    className="stats-grid"
                    aria-label="Your learning at a glance"
                  >
                    <div className="stat">
                      <span className="stat-icon yellow">
                        <Star size={23} />
                      </span>
                      <div>
                        <strong>
                          {progress.points.toLocaleString()}
                          <small>points</small>
                        </strong>
                        <p>Every effort counts</p>
                      </div>
                    </div>
                    <div className="stat">
                      <span className="stat-icon purple">
                        <Medal size={23} />
                      </span>
                      <div>
                        <strong>
                          {earnedBadges.length}
                          <small>badges earned</small>
                        </strong>
                        <p>Little wins, big smiles</p>
                      </div>
                    </div>
                    <div className="stat">
                      <span className="stat-icon mint">
                        <Target size={23} />
                      </span>
                      <div>
                        <strong>
                          {progress.rounds}
                          <small>adventures</small>
                        </strong>
                        <p>Look how far you’ve come</p>
                      </div>
                    </div>
                  </section>
                  <div className="dashboard-columns">
                    <div className="dashboard-primary">
                      <div className="section-heading">
                        <h2>
                          Choose your adventure <span>✨</span>
                        </h2>
                        <span>Two worlds. Endless possibilities.</span>
                      </div>
                      <div className="world-grid">
                        {subjectCard("english")}
                        {subjectCard("math")}
                      </div>
                      <section className="team-strip">
                        <span className="team-strip-icon">
                          <Users size={26} />
                        </span>
                        <div>
                          <span className="eyebrow">BETTER TOGETHER</span>
                          <h3>Small team. Big dreams.</h3>
                          <p>Practice, encourage, and help your team grow.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("team")}
                        >
                          Meet the team
                          <ArrowRight size={17} />
                        </button>
                      </section>
                    </div>
                    <aside className="dashboard-secondary">
                      <section className="daily-card">
                        <div className="section-heading">
                          <span className="daily-icon">
                            <Zap size={21} fill="currentColor" />
                          </span>
                          <span className="mini-pill">DAILY MISSION</span>
                        </div>
                        <h3>
                          A little challenge.
                          <br />A bright new win.
                        </h3>
                        <p>
                          Finish any five-question adventure today. Trying is
                          what counts!
                        </p>
                        <div className="daily-prize">
                          <Star size={18} fill="currentColor" /> +100 bonus
                          points
                        </div>
                        <button
                          className={`button ${progress.missionDate === today ? "completed-button" : "dark"}`}
                          disabled={progress.missionDate === today}
                          onClick={() =>
                            start(
                              activities.find((a) => a.id === "arithmetic")!,
                            )
                          }
                        >
                          {progress.missionDate === today ? (
                            <>
                              <Check size={17} /> Mission complete
                            </>
                          ) : (
                            <>
                              Take the challenge
                              <ArrowRight size={17} />
                            </>
                          )}
                        </button>
                      </section>
                      <button
                        className="login-card"
                        disabled={progress.loginDate === today}
                        onClick={() => setProgress((p) => claimLogin(p))}
                      >
                        <span className="login-gift">🎁</span>
                        <span>
                          <strong>
                            {progress.loginDate === today
                              ? "Today’s gift is yours!"
                              : "A little hello gift!"}
                          </strong>
                          <small>
                            {progress.loginDate === today
                              ? "Come back tomorrow for +20."
                              : "Claim your daily +20 points"}
                          </small>
                        </span>
                        {progress.loginDate === today ? (
                          <Check size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    </aside>
                  </div>
                  <section className="bottom-note">
                    <span>💜</span> You don’t have to be perfect to be a
                    champion. Just keep trying.
                  </section>
                </>
              )}
              {view === "adventures" && (
                <>
                  <div
                    className="subject-tabs"
                    role="group"
                    aria-label="Choose a learning world"
                  >
                    <button
                      aria-pressed={subject === "english"}
                      className={subject === "english" ? "selected" : ""}
                      onClick={() => setSubject("english")}
                    >
                      <BookOpen size={20} />
                      English Forest
                    </button>
                    <button
                      aria-pressed={subject === "math"}
                      className={subject === "math" ? "selected math-tab" : ""}
                      onClick={() => setSubject("math")}
                    >
                      <Mountain size={20} />
                      Math Mountain
                    </button>
                  </div>
                  <div className={`adventure-banner ${subject}`}>
                    <Mascot animal={subject === "english" ? "owl" : "fox"} />
                    <div>
                      <h2>
                        {subject === "english"
                          ? "Words are a wonderful adventure."
                          : "You’ve got a mind for discovery."}
                      </h2>
                      <p>
                        {subject === "english"
                          ? "Join Pip for stories, spelling, and a little word magic."
                          : "Join Nova for numbers, patterns, and playful puzzles."}
                      </p>
                      <span>
                        5 questions per round · Free hints · No time limits
                      </span>
                    </div>
                  </div>
                  <div className="activity-grid">
                    {activities
                      .filter((a) => a.subject === subject)
                      .map((activity, index) => {
                        const lesson = gradePack.lessons[activity.id];
                        return (
                        <section
                          className="activity-card panel"
                          key={activity.id}
                        >
                          <span className={`activity-symbol ${subject}`}>
                            {activity.symbol}
                          </span>
                          <h3>{lesson.title}</h3>
                          {isEarlyGrade(grade) && <small>Voice shortcut: start activity {index + 1}</small>}
                          <p>{lesson.skill}</p>
                          {lesson.guide && (
                            <LessonTips guide={lesson.guide} />
                          )}
                          <div className="skill-status">
                            <span>
                              {gradeBest(activity.id) >= 4
                                ? "✨ Skill shining"
                                : progress.gradeBestRounds?.[
                                      `${grade}:${activity.id}`
                                    ] !== undefined
                                  ? "🌱 Skill growing"
                                  : "A new discovery"}
                            </span>
                            <span>Best: {gradeBest(activity.id)}/5</span>
                          </div>
                          <button
                            className="button secondary"
                            onClick={() => start(activity)}
                          >
                            Let’s play
                            <ArrowRight size={17} />
                          </button>
                        </section>
                        );
                      })}
                  </div>
                  <div className="info-note">
                    <Lightbulb size={21} />
                    <p>
                      <strong>A score is just a snapshot.</strong> Earn 10
                      points per correct answer, +5 for a correct answer within
                      8 seconds without a hint, and +50 for a perfect round.
                      There’s no timer to beat and no penalty for taking your
                      time.
                    </p>
                  </div>
                </>
              )}
              {view === "rewards" && (
                <>
                  <div className="reward-top">
                    <section className="level-card panel">
                      <span className="big-medal">🏅</span>
                      <div>
                        <span className="eyebrow">LOOK AT YOU GROW</span>
                        <h2>Level {level} explorer</h2>
                        <p>
                          {200 - (progress.points % 200)} more points until your
                          next level.
                        </p>
                        <progress
                          value={progress.points % 200}
                          max={200}
                          aria-label="Points toward next level"
                        />
                        <small>
                          Levels celebrate practice. Skill mastery is tracked
                          separately.
                        </small>
                      </div>
                    </section>
                    <section className="chest-card panel">
                      <span className="chest">🧰</span>
                      <div>
                        <h2>A pocketful of wonder</h2>
                        <p>
                          {availableChests > 0
                            ? `${availableChests} treasure chest${availableChests > 1 ? "s" : ""} ready to open!`
                            : `Finish ${3 - (progress.rounds % 3)} more adventures to unlock a chest.`}
                        </p>
                        <button
                          className="button primary"
                          disabled={availableChests <= 0}
                          onClick={() => {
                            setProgress((p) => ({
                              ...p,
                              chestCount: p.chestCount + 1,
                            }));
                            setChestOpen(true);
                          }}
                        >
                          Open a surprise
                          <Gift size={18} />
                        </button>
                        <p className="mastery-note">
                          {progress.chestCount} keepsake
                          {progress.chestCount === 1 ? "" : "s"} in your
                          collection.
                        </p>
                      </div>
                    </section>
                  </div>
                  <div className="section-heading">
                    <h2>Your badge collection</h2>
                    <span>
                      {earnedBadges.length} of {badges.length} little
                      celebrations
                    </span>
                  </div>
                  <div className="badge-grid">
                    {badges.map((badge) => (
                      <section
                        key={badge.name}
                        className={`badge-card panel ${badge.earned(progress) ? "earned" : "locked"}`}
                      >
                        <span className="badge-art">{badge.symbol}</span>
                        <h3>{badge.name}</h3>
                        <p>{badge.description}</p>
                        <span className="badge-status">
                          {badge.earned(progress) ? (
                            <>
                              <Check size={14} /> You earned it!
                            </>
                          ) : (
                            <>
                              <LockKeyhole size={13} /> Keep exploring
                            </>
                          )}
                        </span>
                      </section>
                    ))}
                  </div>
                  <section className="avatar-strip panel">
                    <span className="avatar-big">
                      {avatarEmoji[progress.avatar]}
                    </span>
                    <div>
                      <h2>Your adventure, your style</h2>
                      <p>Pick a pal to explore Champion Island with you.</p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => setAvatarOpen(true)}
                    >
                      Choose my avatar
                      <ArrowRight size={17} />
                    </button>
                  </section>
                </>
              )}
              {view === "leaderboard" && <Competition progress={progress} />}
              {view === "team" && (
                <>
                  <div className="demo-notice">
                    <Users size={20} />
                    <p>
                      <strong>A make-believe team, real practice.</strong>{" "}
                      Teammates and their contributions are demo data. Your
                      contributions come from your saved learning on this
                      device. No live multiplayer or messaging.
                    </p>
                  </div>
                  <section className="team-hero panel">
                    <span className="team-crest">🚀</span>
                    <span className="eyebrow">THE CURIOUS COMETS</span>
                    <h2>Let’s reach for the stars. Together.</h2>
                    <p>
                      Our practice goal: collect {teamGoal} correct answers as a
                      team.
                    </p>
                    <div className="team-progress">
                      <progress
                        value={120 + progress.correct}
                        max={teamGoal}
                        aria-label="Demo team goal progress"
                      />
                      <strong>
                        {120 + progress.correct} total discoveries
                      </strong>
                    </div>
                    <small>
                      Demo teammates: 120 correct answers · Your real
                      contribution: {progress.correct}
                    </small>
                  </section>
                  <div className="team-grid">
                    <section className="panel teammate-panel">
                      <h2>A little encouragement goes far</h2>
                      <p>
                        Pip is practicing addition. Help explain a problem and
                        earn +25 kindness points, once a day.
                      </p>
                      <blockquote>{teammate.preview}</blockquote>
                      <button
                        className="button primary"
                        disabled={progress.helpDate === today}
                        onClick={() => {
                          setHelpAnswer("");
                          setHelpOpen(true);
                        }}
                      >
                        {progress.helpDate === today
                          ? "You helped today. Thank you!"
                          : "Practice helping Pip"}
                        <Users size={18} />
                      </button>
                    </section>
                    <section className="panel teammate-panel">
                      <h2>Our team promise</h2>
                      <div className="promise">
                        <span>💬</span>
                        <p>We use kind words and cheer for effort.</p>
                      </div>
                      <div className="promise">
                        <span>🌱</span>
                        <p>We learn from mistakes. They help us grow.</p>
                      </div>
                      <div className="promise">
                        <span>🤝</span>
                        <p>We help each other. Everyone belongs.</p>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="footer">
            <span>Made for curious minds & kind hearts.</span>
            <a href="/learn/">For grown-ups: learning guides</a>
            <span>
              <LockKeyhole size={12} />{" "}
              {cloudProgress
                ? "Private account progress"
                : "Private on this device"}{" "}
              · No ads. Just adventure.
            </span>
          </footer>
        </main>
      </div>
      {avatarOpen && (
        <Dialog
          title="Pick your adventure pal"
          onClose={() => setAvatarOpen(false)}
        >
          <p className="dialog-description">
            A little personality for your learning journey. Unlock new pals with
            points you earn, never money.
          </p>
          <div className="avatar-options">
            {(Object.keys(avatarNames) as Avatar[]).map((avatar) => (
              <button
                className={`avatar-option ${progress.avatar === avatar ? "selected" : ""}`}
                key={avatar}
                disabled={!avatarUnlocked(avatar, progress.points)}
                onClick={() => setProgress((p) => ({ ...p, avatar }))}
                aria-pressed={progress.avatar === avatar}
              >
                <span>{avatarEmoji[avatar]}</span>
                <strong>{avatarNames[avatar]}</strong>
                <small>
                  {avatarUnlocked(avatar, progress.points)
                    ? progress.avatar === avatar
                      ? "Your adventure pal ✓"
                      : "Choose this pal"
                    : `Unlock at ${avatar === "fox" ? 100 : 250} points`}
                </small>
              </button>
            ))}
          </div>
          <button
            className="button primary full-width"
            onClick={() => setAvatarOpen(false)}
          >
            Ready for adventure
            <ArrowRight size={18} />
          </button>
        </Dialog>
      )}
      {helpOpen && (
        <Dialog
          title="A helping hand for Pip"
          onClose={() => setHelpOpen(false)}
        >
          <div className="help-pip">
            <Mascot />
            <p>{teammate.quote}</p>
          </div>
          <p>{teammate.prompt}</p>
          <div className="help-options">
            {teammate.options.map((option, i) => (
              <button
                key={option}
                className="answer-option"
                disabled={helpAnswer === String(teammate.answerIndex)}
                onClick={() => {
                  setHelpAnswer(String(i));
                  if (i === teammate.answerIndex)
                    setProgress((p) => claimHelp(p));
                }}
              >
                {option}
              </button>
            ))}
          </div>
          {helpAnswer && (
            <p
              className={
                helpAnswer === String(teammate.answerIndex)
                  ? "help-success"
                  : "hint"
              }
              role="status"
            >
              {helpAnswer === String(teammate.answerIndex)
                ? teammate.success
                : teammate.retry}
            </p>
          )}
        </Dialog>
      )}
      {chestOpen && (
        <Dialog
          title="A little treasure, just for you!"
          onClose={() => setChestOpen(false)}
        >
          <div className="treasure-reveal">💎 ✨ 🪸</div>
          <h3 className="center">
            You found a{" "}
            {
              ["moonstone", "sunshine crystal", "rainbow shell"][
                (progress.chestCount - 1) % 3
              ]
            }
            !
          </h3>
          <p className="dialog-description">
            Your treasure collection now has {progress.chestCount} keepsake
            {progress.chestCount === 1 ? "" : "s"}. This is a celebration of
            showing up and trying. No purchases, no chance-based point prizes.
          </p>
          <button
            className="button primary full-width"
            onClick={() => setChestOpen(false)}
          >
            Keep shining
            <Star size={18} />
          </button>
        </Dialog>
      )}
    </div>
  );
}
function Competition({ progress }: { progress: Progress }) {
  const [scope, setScope] = useState<"class" | "friends">("class");
  const demos =
    scope === "class"
      ? [
          { name: "Sunny Sprout", avatar: "🐼", score: 460 },
          { name: "Brave Bunny", avatar: "🐰", score: 325 },
          { name: "Happy Hedgehog", avatar: "🦔", score: 180 },
          { name: "Clever Koala", avatar: "🐨", score: 95 },
        ]
      : [
          { name: "Brave Bunny", avatar: "🐰", score: 325 },
          { name: "Clever Koala", avatar: "🐨", score: 95 },
        ];
  const rows = [
    ...demos.map((d) => ({ ...d, you: false })),
    {
      name: "You, Champion!",
      avatar: avatarEmoji[progress.avatar],
      score: progress.points,
      you: true,
    },
  ].sort((a, b) => b.score - a.score);
  return (
    <>
      <div className="demo-notice">
        <CircleHelp size={20} />
        <p>
          <strong>Practice leaderboard · Demo, not live.</strong> Friends and
          classmates below are fictional. Their sample weekly scores are fixed;
          your row shows your real all-time points. No public child profiles.
        </p>
      </div>
      <div className="leaderboard-layout">
        <section className="panel leaderboard-panel">
          <div className="section-heading">
            <h2>
              <Trophy size={23} /> A friendly little cheer
            </h2>
            <span className="mini-pill">DEMO WEEK</span>
          </div>
          <div
            className="subject-tabs compact"
            role="group"
            aria-label="Demo leaderboard group"
          >
            <button
              className={scope === "class" ? "selected" : ""}
              aria-pressed={scope === "class"}
              onClick={() => setScope("class")}
            >
              Class explorers
            </button>
            <button
              className={scope === "friends" ? "selected" : ""}
              aria-pressed={scope === "friends"}
              onClick={() => setScope("friends")}
            >
              Adventure friends
            </button>
          </div>
          <ol className="leaderboard-list">
            {rows.map((row, i) => (
              <li className={row.you ? "your-row" : ""} key={row.name}>
                <span className="rank">{i === 0 ? "🏆" : i + 1}</span>
                <span className="leader-avatar">{row.avatar}</span>
                <div>
                  <strong>{row.name}</strong>
                  <small>
                    {row.you
                      ? "Your real progress · All time"
                      : "Fictional explorer · Demo week"}
                  </small>
                </div>
                <span className="leader-score">
                  {row.score}
                  <Star size={14} fill="currentColor" />
                </span>
              </li>
            ))}
          </ol>
          <p className="mastery-note">
            No prizes for rank here. Your +100 daily challenge reward comes from
            finishing a round, not beating another learner.
          </p>
        </section>
        <aside className="panel celebrate-panel">
          <span className="big-medal">🌟</span>
          <h2>More than a number.</h2>
          <p>
            Being a champion means trying something new, being kind, and getting
            a little better every day.
          </p>
          <div className="personal-win">
            <Check size={18} />
            {progress.correct} discoveries made
          </div>
          <div className="personal-win">
            <Check size={18} />
            {progress.rounds} adventures finished
          </div>
          <div className="personal-win">
            <Check size={18} />
            {badges.filter((b) => b.earned(progress)).length} badges to be proud
            of
          </div>
        </aside>
      </div>
    </>
  );
}
