import { useEffect, useRef } from "react";
import "./tiny-habits.css";
import { gradeLabels, type GradeId } from "./content-schema";
import {
  MAX_TINY_HABITS,
  addTinyHabit,
  emptyTinyHabits,
  isTinyHabitGrade,
  lastSevenTinyHabitDays,
  pipEncouragement,
  pipLevelProgress,
  removeTinyHabit,
  tinyHabitDateString,
  tinyHabitPresetById,
  tinyHabitPresets,
  tinyHabitStreak,
  toggleTinyHabitCheckIn,
  totalTinyHabitCheckIns,
  type TinyHabitsProgress,
} from "./tiny-habits";

function dayLabel(date: string): { weekday: string; day: string } {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return {
    weekday: parsed.toLocaleDateString(undefined, { weekday: "short" }),
    day: String(day),
  };
}

export default function TinyHabits({ grade, state, onChange, onBack, today: todayOverride }: {
  grade: GradeId;
  state: TinyHabitsProgress | undefined;
  onChange: (next: TinyHabitsProgress) => void;
  onBack: () => void;
  /** Test hook; the app lets the component use the learner's local day. */
  today?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const eligible = isTinyHabitGrade(grade);

  useEffect(() => {
    if (eligible) heading.current?.focus();
  }, [eligible]);

  if (!eligible) return null;

  const today = todayOverride ?? tinyHabitDateString();
  const current = state ?? emptyTinyHabits();
  const total = totalTinyHabitCheckIns(current);
  const pip = pipLevelProgress(total);
  const week = lastSevenTinyHabitDays(today);
  const availablePresets = tinyHabitPresets.filter(
    (preset) => !current.habits.includes(preset.id),
  );

  return (
    <section className="tiny-habits" aria-label="Tiny Habits with Pip">
      <button className="text-button back" onClick={onBack}>Back to adventures</button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TINY HABITS · {gradeLabels[grade].toUpperCase()}</span>
          <h1 ref={heading} tabIndex={-1}>Tiny steps, every day.</h1>
          <p>
            Pick up to {MAX_TINY_HABITS} tiny habits, check in when you do one,
            and watch your streaks grow. Check-ins do not earn points — your
            streaks and Pip&apos;s growing leaf are the reward.
          </p>
        </div>
      </div>

      <div className="panel th-pip-panel">
        <div className="th-pip-character" aria-hidden="true">
          <span className="th-pip-ant">🐜</span>
          <span className="th-pip-leaf">{pip.current.leaf}</span>
        </div>
        <div className="th-pip-copy">
          <span className="eyebrow">PIP THE ANT</span>
          <h2>Level {pip.current.level}: {pip.current.name}</h2>
          <p className="th-pip-message">{pipEncouragement(current, today)}</p>
          <p className="th-pip-motto">Pip&apos;s motto: “Tiny steps, every day.”</p>
          <div className="th-level-progress">
            <progress
              aria-label={pip.next ? `Progress to Pip level ${pip.next.level}` : "Pip's highest level"}
              value={pip.next ? total - pip.current.minimum : 1}
              max={pip.next ? pip.next.minimum - pip.current.minimum : 1}
            />
            <span>
              {total} total check-in{total === 1 ? "" : "s"}
              {pip.next
                ? ` · ${pip.remainingToNext} more to become ${pip.next.name}`
                : " · Pip has reached the highest level!"}
            </span>
          </div>
        </div>
      </div>

      <div className="panel th-habits-panel">
        <div className="th-panel-head">
          <div>
            <span className="eyebrow">MY HABITS</span>
            <h2>{current.habits.length} of {MAX_TINY_HABITS} habits</h2>
          </div>
          <span className="th-today">{gradeLabels[grade]} · Today</span>
        </div>

        {current.habits.length ? (
          <ul className="th-habit-list">
            {current.habits.map((habitId) => {
              const preset = tinyHabitPresetById(habitId);
              const dates = current.checkIns[habitId] ?? [];
              const doneToday = dates.includes(today);
              const streak = tinyHabitStreak(dates, today);
              return (
                <li key={habitId} className="th-habit-card">
                  <div className="th-habit-main">
                    <span className="th-habit-emoji" aria-hidden="true">{preset.emoji}</span>
                    <div>
                      <h3>{preset.label}</h3>
                      <p>
                        <strong>{streak} day{streak === 1 ? "" : "s"}</strong> streak
                        {" "}· {dates.length} total check-in{dates.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="th-week-label">Last 7 days</span>
                    <ol className="th-week" aria-label={`Last seven days for ${preset.label}`}>
                      {week.map((date) => {
                        const checked = dates.includes(date);
                        const label = dayLabel(date);
                        return (
                          <li
                            key={date}
                            className={`${checked ? "is-checked" : ""} ${date === today ? "is-today" : ""}`}
                            aria-label={`${label.weekday} ${label.day}: ${checked ? "checked in" : "not checked in"}${date === today ? " (today)" : ""}`}
                            title={`${label.weekday} ${label.day}: ${checked ? "checked in" : "not checked in"}`}
                          >
                            <span>{label.weekday}</span>
                            <strong>{checked ? "✓" : label.day}</strong>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <div className="th-habit-actions">
                    <button
                      className={`button ${doneToday ? "secondary" : "primary"} th-check-in`}
                      aria-pressed={doneToday}
                      onClick={() => onChange(toggleTinyHabitCheckIn(current, habitId, today))}
                    >
                      {doneToday ? "✓ Done today — tap to undo" : "I did it today"}
                    </button>
                    <button
                      className="text-button th-remove"
                      onClick={() => {
                        if (window.confirm(`Remove “${preset.label}” and its check-ins?`)) {
                          onChange(removeTinyHabit(current, habitId));
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="th-empty">
            No habits yet. Choose one tiny thing below — Pip likes first steps
            that feel easy.
          </p>
        )}

        <div className="th-add-section">
          <h3>{current.habits.length ? "Add another tiny habit" : "Choose a tiny habit"}</h3>
          {current.habits.length >= MAX_TINY_HABITS ? (
            <p>Pip&apos;s basket is full: you are tracking {MAX_TINY_HABITS} habits. Remove one before adding another.</p>
          ) : (
            <div className="th-preset-grid">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  className="th-preset-button"
                  onClick={() => onChange(addTinyHabit(current, preset.id))}
                >
                  <span aria-hidden="true">{preset.emoji}</span>
                  <span>Add: {preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
