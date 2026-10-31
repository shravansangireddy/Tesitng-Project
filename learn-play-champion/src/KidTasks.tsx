import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityId } from "./game";
import {
  activityTitle,
  fetchKidTasks,
  setKidTaskDone,
  type KidTask,
} from "./kid-tasks";

/**
 * The signed-in kid's job list, shown at the top of their home screen.
 * A task with an activity jumps straight into that adventure; the kid taps
 * "Done ✓" when the job is finished. Renders nothing when there are no
 * tasks, so kids without assignments see the usual home screen.
 */
export default function KidTasks({
  client,
  kidUserId,
  onStartActivity,
}: {
  client: SupabaseClient;
  kidUserId: string;
  onStartActivity: (activityId: ActivityId) => void;
}) {
  const [tasks, setTasks] = useState<KidTask[] | null>(null);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchKidTasks(client, kidUserId);
        if (active) setTasks(rows);
      } catch {
        if (active) setTasks([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [client, kidUserId]);

  if (!tasks || tasks.length === 0) return null;
  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);

  const markDone = async (task: KidTask) => {
    setBusyId(task.id);
    try {
      await setKidTaskDone(client, task.id, true);
      setTasks((current) =>
        (current ?? []).map((item) =>
          item.id === task.id
            ? { ...item, done: true, completedAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      // Leave the task open; the kid can tap again.
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="kid-tasks" aria-label="Your tasks">
      <h2>📋 Your tasks</h2>
      {open.length === 0 ? (
        <p className="kid-tasks-all-done">
          All done — great job! 🎉 New tasks from your grown-up will appear
          here.
        </p>
      ) : (
        <ul className="kid-tasks-list">
          {open.map((task) => (
            <li key={task.id} className="kid-task">
              <span className="kid-task-title">
                {task.title}
                {task.activityId && (
                  <span className="kid-task-activity">
                    {" "}
                    · {activityTitle(task.activityId)}
                  </span>
                )}
              </span>
              <span className="kid-task-actions">
                {task.activityId && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => onStartActivity(task.activityId!)}
                  >
                    Start ▶
                  </button>
                )}
                <button
                  type="button"
                  className="button secondary"
                  disabled={busyId === task.id}
                  onClick={() => void markDone(task)}
                >
                  {busyId === task.id ? "Saving…" : "Done ✓"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <ul className="kid-tasks-list kid-tasks-done">
          {done.map((task) => (
            <li key={task.id} className="kid-task is-done">
              <span className="kid-task-title">✅ {task.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
