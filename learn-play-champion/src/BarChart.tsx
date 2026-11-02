import { barFraction, type ProgressBar } from "./progress-charts";

/**
 * A kid-readable horizontal bar chart: pure CSS bars, no dependencies.
 * Each row is real text (label + value) so screen readers announce the
 * numbers in order; only the colored fill is decorative (aria-hidden).
 * Bar lengths come from barFraction, scaled to the largest value.
 */
export default function BarChart({
  title,
  bars,
  unit,
}: {
  title: string;
  bars: ProgressBar[];
  /** Optional suffix after each value, e.g. "correct" or "points". */
  unit?: string;
}) {
  const max = bars.reduce((largest, bar) => Math.max(largest, bar.value), 0);
  return (
    <figure className="bar-chart">
      <figcaption>{title}</figcaption>
      <div className="bar-chart-rows">
        {bars.map((bar) => (
          <div className="bar-row" key={bar.id}>
            <span className="bar-row-label">{bar.label}</span>
            <span className="bar-track" aria-hidden="true">
              <span
                className="bar-fill"
                style={{
                  width: `${Math.round(barFraction(bar.value, max) * 100)}%`,
                  background: bar.color,
                }}
              />
            </span>
            <span className="bar-row-value">
              {bar.value.toLocaleString()}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}
