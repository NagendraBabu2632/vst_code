import './BarChart.css';
import '../tooltip.css';
import { useMemo, useRef, useCallback, type ReactElement } from "react";
import * as d3 from "d3";
import { useChartSize } from "../useChartSize";

const gridStroke = "hsl(220, 14%, 22%)";
const axisStroke = "hsl(215, 15%, 55%)";

/* ============================================================
 * Top 5 Electricity Consumers (horizontal bar)
 * ========================================================== */

const top5BarColors = [
  "hsl(35, 92%, 50%)",
  "hsl(35, 85%, 55%)",
  "hsl(35, 78%, 60%)",
  "hsl(35, 70%, 65%)",
  "hsl(35, 62%, 70%)",
];

interface Top5Row {
  rank: number;
  name: string;
  consumption: number;
  cost: number;
  line: string;
  status: string;
  contribution: number;
  costContribution: number;
  trend: number;
  trendPct: number;
}

interface Top5BarChartProps {
  data: Top5Row[];
  mode: "consumption" | "cost";
}

const TOP5_HEIGHT = 280;
const TOP5_MARGIN = { top: 10, right: 140, bottom: 28, left: 160 };

export const Top5BarChart = ({ data, mode }: Top5BarChartProps) => {
  const { ref, width } = useChartSize(700);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const innerW = Math.max(20, width - TOP5_MARGIN.left - TOP5_MARGIN.right);
  const innerH = TOP5_HEIGHT - TOP5_MARGIN.top - TOP5_MARGIN.bottom;

  const dataKey = mode === "consumption" ? "consumption" : "cost";
  const unitLabel = mode === "consumption" ? "kWh" : "₹";

  const y = useMemo(
    () => d3.scaleBand<string>().domain(data.map((d) => d.name)).range([0, innerH]).padding(0.25),
    [data, innerH]
  );
  const x = useMemo(
    () => d3.scaleLinear().domain([0, d3.max(data, (d) => d[dataKey]) ?? 1]).nice().range([0, innerW]),
    [data, dataKey, innerW]
  );

  const xTicks = x.ticks(5);
  const fmtVal = (v: number) => mode === "cost" ? `₹${v.toLocaleString()}` : `${v.toLocaleString()} kWh`;

  const showTip = useCallback((e: React.MouseEvent, d: Top5Row) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    const isUp = d.trendPct >= 0;
    tt.innerHTML =
      `<div class="d3-tt-name">${d.name}</div>` +
      `<div class="d3-tt-muted">Line: ${d.line}</div>` +
      `<div>Consumption: <strong>${d.consumption.toLocaleString()} kWh</strong></div>` +
      `<div>Cost: <strong>₹${d.cost.toLocaleString()}</strong></div>` +
      `<div>Contribution: <strong>${mode === "consumption" ? d.contribution : d.costContribution}%</strong></div>` +
      `<div>Trend: <span class="${isUp ? "d3-tt-up" : "d3-tt-down"}">${d.trendPct > 0 ? "+" : ""}${d.trendPct}%</span></div>`;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, [mode]);
  const hideTip = useCallback(() => tooltipRef.current?.classList.remove("is-visible"), []);

  return (
    <div ref={ref} className="d3-bar-wrap">
      <svg width={width} height={TOP5_HEIGHT}>
        <g transform={`translate(${TOP5_MARGIN.left},${TOP5_MARGIN.top})`}>
          {/* Vertical grid lines */}
          {xTicks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={innerH} stroke={gridStroke} strokeDasharray="3 3" />
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const by = y(d.name) ?? 0;
            const bh = Math.min(28, y.bandwidth());
            const bw = Math.max(0, x(d[dataKey]) || 0);
            return (
              <g key={d.name}>
                <rect
                  x={0} y={by + (y.bandwidth() - bh) / 2}
                  width={bw} height={bh}
                  fill={top5BarColors[i]} rx={4}
                  onMouseEnter={(e) => showTip(e, d)}
                  onMouseMove={(e) => showTip(e, d)}
                  onMouseLeave={hideTip}
                />
                <text x={bw + 6} y={by + y.bandwidth() / 2} dy={4} fontSize={11} fill={axisStroke} fontWeight={500}>
                  {fmtVal(d[dataKey])}
                </text>
              </g>
            );
          })}

          {/* Y axis (categories with rank pill) */}
          {data.map((d) => {
            const by = (y(d.name) ?? 0) + y.bandwidth() / 2;
            return (
              <g key={`yt-${d.name}`} transform={`translate(0,${by})`}>
                <text x={-8} dy={4} textAnchor="end" fill={axisStroke} fontSize={11}>{d.name}</text>
              </g>
            );
          })}

          {/* X axis */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={4} stroke={axisStroke} />
                <text y={16} textAnchor="middle" fill={axisStroke} fontSize={11}>
                  {mode === "cost" ? `₹${t.toLocaleString()}` : t.toLocaleString()}
                </text>
              </g>
            ))}
            <text x={innerW} y={26} textAnchor="end" fontSize={11} fill={axisStroke}>{unitLabel}</text>
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};

/* ============================================================
 * Asset-wise Energy (horizontal bar)
 * ========================================================== */

interface AssetRow { name: string; consumption: number; cost: number; }

interface AssetEnergyBarChartProps {
  data: AssetRow[];
  mode: "consumption" | "cost";
}

const ASSET_HEIGHT = 340;
const ASSET_MARGIN = { top: 10, right: 30, bottom: 28, left: 120 };

export const AssetEnergyBarChart = ({ data, mode }: AssetEnergyBarChartProps) => {
  const { ref, width } = useChartSize(700);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const innerW = Math.max(20, width - ASSET_MARGIN.left - ASSET_MARGIN.right);
  const innerH = ASSET_HEIGHT - ASSET_MARGIN.top - ASSET_MARGIN.bottom;

  const y = useMemo(
    () => d3.scaleBand<string>().domain(data.map((d) => d.name)).range([0, innerH]).padding(0.2),
    [data, innerH]
  );
  const x = useMemo(
    () => d3.scaleLinear().domain([0, d3.max(data, (d) => d[mode]) ?? 1]).nice().range([0, innerW]),
    [data, mode, innerW]
  );
  const xTicks = x.ticks(5);
  const muted = "var(--muted-foreground)";
  const border = "color-mix(in oklab, var(--border) 80%, transparent)";

  const showTip = useCallback((e: React.MouseEvent, d: AssetRow) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    const val = mode === "consumption" ? `${d.consumption} kWh` : `₹${d.cost.toLocaleString()}`;
    tt.innerHTML =
      `<div class="d3-tt-name">${d.name}</div>` +
      `<div>${mode === "consumption" ? "Consumption" : "Cost"}: <strong>${val}</strong></div>`;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, [mode]);
  const hideTip = useCallback(() => tooltipRef.current?.classList.remove("is-visible"), []);

  return (
    <div ref={ref} className="d3-bar-wrap">
      <svg width={width} height={ASSET_HEIGHT}>
        <defs>
          <linearGradient id="assetGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(195 90% 65%)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="hsl(310 75% 70%)" stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="assetGradientTop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(310 75% 70%)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="hsl(330 80% 70%)" stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <g transform={`translate(${ASSET_MARGIN.left},${ASSET_MARGIN.top})`}>
          {xTicks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={innerH} stroke={border} strokeDasharray="3 3" />
          ))}
          {data.map((d, i) => {
            const by = y(d.name) ?? 0;
            const bw = Math.max(0, x(d[mode]) || 0);
            return (
              <rect
                key={d.name}
                x={0} y={by} width={bw} height={y.bandwidth()}
                fill={i === 0 ? "url(#assetGradientTop)" : "url(#assetGradient)"}
                rx={6}
                onMouseEnter={(e) => showTip(e, d)}
                onMouseMove={(e) => showTip(e, d)}
                onMouseLeave={hideTip}
              />
            );
          })}
          {data.map((d) => (
            <text key={`l-${d.name}`} x={-8} y={(y(d.name) ?? 0) + y.bandwidth() / 2} dy={4} textAnchor="end" fontSize={11} fill={muted}>
              {d.name}
            </text>
          ))}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={muted} />
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={4} stroke={muted} />
                <text y={16} textAnchor="middle" fontSize={11} fill={muted}>{t}</text>
              </g>
            ))}
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};

/* ============================================================
 * SPC Histogram (vertical bars, frequency distribution)
 * ========================================================== */

interface HistogramBin { range: number; count: number; binStart: number; binEnd: number; }

interface SPCHistogramChartProps {
  data: HistogramBin[];
  lineColor: string;
  unit: string;
  lsl?: number;
  usl?: number;
  showLimits?: boolean;
  /** Kept for API compatibility; not rendered. */
  tooltip?: ReactElement;
}

const HIST_HEIGHT = 320;
const HIST_MARGIN = { top: 16, right: 20, bottom: 32, left: 40 };

export const SPCHistogramChart = ({ data, lineColor, unit, lsl, usl, showLimits = true }: SPCHistogramChartProps) => {
  const { ref, width } = useChartSize(700);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const innerW = Math.max(20, width - HIST_MARGIN.left - HIST_MARGIN.right);
  const innerH = HIST_HEIGHT - HIST_MARGIN.top - HIST_MARGIN.bottom;

  const x = useMemo(
    () => d3.scaleBand<string>().domain(data.map((d) => String(d.range))).range([0, innerW]).padding(0.1),
    [data, innerW]
  );
  const y = useMemo(
    () => d3.scaleLinear().domain([0, d3.max(data, (d) => d.count) ?? 1]).nice().range([innerH, 0]),
    [data, innerH]
  );
  const yTicks = y.ticks(5);
  const xTicks = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0);

  const showTip = useCallback((e: React.MouseEvent, d: HistogramBin) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    tt.innerHTML =
      `<div class="d3-tt-name">Range: ${d.binStart} – ${d.binEnd} ${unit}</div>` +
      `<div>Count: <strong>${d.count}</strong></div>`;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, [unit]);
  const hideTip = useCallback(() => tooltipRef.current?.classList.remove("is-visible"), []);

  return (
    <div ref={ref} className="d3-bar-wrap">
      <svg width={width} height={HIST_HEIGHT}>
        <g transform={`translate(${HIST_MARGIN.left},${HIST_MARGIN.top})`}>
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke={gridStroke} strokeDasharray="3 3" />
          ))}
          {data.map((d) => {
            const bx = x(String(d.range)) ?? 0;
            const bh = Math.max(0, innerH - y(d.count));
            return (
              <rect
                key={d.range}
                x={bx} y={y(d.count)} width={x.bandwidth()} height={bh}
                fill={lineColor} fillOpacity={0.8} rx={3}
                onMouseEnter={(e) => showTip(e, d)}
                onMouseMove={(e) => showTip(e, d)}
                onMouseLeave={hideTip}
              />
            );
          })}
          {/* Y axis */}
          <line y1={0} y2={innerH} stroke={axisStroke} />
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={-4} stroke={axisStroke} />
              <text x={-8} dy={4} textAnchor="end" fontSize={11} fill={axisStroke}>{t}</text>
            </g>
          ))}
          <text transform={`translate(-30,${innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize={10} fill={axisStroke}>Frequency</text>
          {/* X axis */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {xTicks.map((d) => {
              const bx = (x(String(d.range)) ?? 0) + x.bandwidth() / 2;
              return (
                <g key={d.range} transform={`translate(${bx},0)`}>
                  <line y2={4} stroke={axisStroke} />
                  <text y={16} textAnchor="middle" fontSize={10} fill={axisStroke}>{d.range}</text>
                </g>
              );
            })}
            <text x={innerW} y={28} textAnchor="end" fontSize={10} fill={axisStroke}>{unit}</text>
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};
