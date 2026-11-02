import type { Progress } from "./game";
import BarChart from "./BarChart";
import {
  activityBars,
  subjectBars,
  totalChartedCorrect,
} from "./progress-charts";

/**
 * The two progress charts, shared by the kid's Rewards view and the
 * parent's per-kid progress panel: correct answers by subject
 * (English vs Math) and the child's top practiced activities.
 * Renders nothing when the save has no charted correct answers yet —
 * callers own the empty state.
 */
export default function ProgressCharts({
  progress,
  subjectTitle = "Correct answers by subject",
  activityTitle = "Top activities",
}: {
  progress: Progress;
  subjectTitle?: string;
  activityTitle?: string;
}) {
  if (totalChartedCorrect(progress) <= 0) return null;
  return (
    <div className="progress-charts">
      <BarChart title={subjectTitle} bars={subjectBars(progress)} unit="correct" />
      <BarChart title={activityTitle} bars={activityBars(progress)} unit="correct" />
    </div>
  );
}
