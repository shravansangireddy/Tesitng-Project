import type { LearningChart as ChartData } from "./content-schema";

export default function LearningChart({ chart }: { chart: ChartData }) {
  const isLine = chart.type === "line";
  return (
    <figure className="learning-chart">
      <figcaption>{chart.title}</figcaption>
      <p className="chart-key">
        {isLine
          ? `Line plot: each X represents one measurement. Lengths or amounts are in ${chart.unit}.`
          : `Bar graph (${chart.unit}): each filled block stands for a count of ${chart.scale}.`}
      </p>
      <div
        className={`chart-columns ${isLine ? "line-plot" : ""}`}
        style={{ gridTemplateColumns: `repeat(${chart.labels.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {chart.labels.map((label, index) => (
          <div className="chart-column" key={label}>
            <div className="chart-stack">
              {Array.from({ length: chart.counts[index] }, (_, mark) => (
                <span className={isLine ? "plot-symbol" : "bar-block"} key={mark}>
                  {isLine ? "X" : ""}
                </span>
              ))}
            </div>
            <span className="chart-label">{label}</span>
          </div>
        ))}
      </div>
      <details className="chart-table">
        <summary>Read data as a table</summary>
        <table>
          <caption>{chart.title} — text alternative</caption>
          <thead>
            <tr>
              <th scope="col">{isLine ? `Amount (${chart.unit})` : "Category"}</th>
              <th scope="col">{isLine ? "Number of measurements" : chart.unit}</th>
            </tr>
          </thead>
          <tbody>
            {chart.labels.map((label, index) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{chart.counts[index] * chart.scale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
