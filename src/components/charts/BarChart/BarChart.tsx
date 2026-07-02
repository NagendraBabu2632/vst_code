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
 * Moisture Sensors Bar Chart (vertical bars + LSL/USL/Target)
 * ========================================================== */

export interface MoistureSensorItem {
  location: string;
  line: string;
  tagName: string;
  avgMoisture: number | null;
}

interface MoistureBarChartProps {
  data: MoistureSensorItem[];
  lsl?: number;
  target?: number;
  usl?: number;
}

const MOIST_HEIGHT = 118;
const MOIST_MARGIN = { top: 6, right: 46, bottom: 30, left: 28 };

const MOISTURE_BAR_FILL = "hsl(200, 98%, 39%)";

export const MoistureBarChart = ({
  data,
  lsl = 11.5,
  target = 12.5,
  usl = 13.5,
}: MoistureBarChartProps) => {
  const { ref, width } = useChartSize(700);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const innerW = Math.max(20, width - MOIST_MARGIN.left - MOIST_MARGIN.right);
  const innerH = MOIST_HEIGHT - MOIST_MARGIN.top - MOIST_MARGIN.bottom;

  const locations = useMemo(() => data.map((d) => d.location), [data]);

  const maxVal = useMemo(() => {
    const vals = data.filter((d) => d.avgMoisture !== null).map((d) => d.avgMoisture as number);
    return Math.max(usl + 2, ...vals, 0.1);
  }, [data, usl]);

  const x = useMemo(
    () => d3.scaleBand<string>().domain(locations).range([0, innerW]).padding(0.3),
    [locations, innerW]
  );

  const y = useMemo(
    () => d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]),
    [maxVal, innerH]
  );

  const yTicks = y.ticks(3);

  const showTip = useCallback((e: React.MouseEvent, d: MoistureSensorItem) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    tt.innerHTML =
      `<div class="d3-tt-name">${d.location}</div>` +
      `<div class="d3-tt-muted">Line: ${d.line}</div>` +
      `<div class="d3-tt-muted">${d.tagName}</div>` +
      `<div>Moisture: <strong>${d.avgMoisture !== null ? `${(d.avgMoisture as number).toFixed(2)}%` : "No Data"}</strong></div>`;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, []);
  const hideTip = useCallback(() => tooltipRef.current?.classList.remove("is-visible"), []);

  return (
    <div ref={ref} className="d3-bar-wrap">
      <svg width={width} height={MOIST_HEIGHT}>
        <g transform={`translate(${MOIST_MARGIN.left},${MOIST_MARGIN.top})`}>
          {/* Horizontal grid */}
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)}
              stroke={gridStroke} strokeDasharray="3 3" />
          ))}

          {/* Bars — values shown only in tooltip */}
          {data.map((d) => {
            const bx   = x(d.location) ?? 0;
            const bw   = x.bandwidth();
            const val  = d.avgMoisture ?? 0;
            const by   = y(val);
            const bh   = Math.max(0, innerH - by);
            return (
              <rect
                key={d.location}
                x={bx} y={by} width={bw} height={bh}
                fill={MOISTURE_BAR_FILL} fillOpacity={d.avgMoisture === null ? 0.25 : 0.88} rx={3}
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
              <line x1={-3} stroke={axisStroke} />
              <text x={-5} dy={3} textAnchor="end" fontSize={9} fill={axisStroke}>{t}</text>
            </g>
          ))}

          {/* X axis — rotated labels */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {data.map((d) => {
              const cx = (x(d.location) ?? 0) + x.bandwidth() / 2;
              const [firstWord, ...restWords] = d.location.split(" ");
              const secondLine = restWords.join(" ");
              return (
                <g key={d.location} transform={`translate(${cx},0)`}>
                  <line y2={3} stroke={axisStroke} />
                  <text textAnchor="middle" fontSize={9} fill={axisStroke}>
                    <tspan x={0} y={11}>{firstWord}</tspan>
                    {secondLine && <tspan x={0} y={21}>{secondLine}</tspan>}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};

/* ============================================================
 * Humidity / Temperature Bar Chart — 2 vertical bars: PMD | SMD
 * ========================================================== */

export interface HumidityData {
  pmd: number;
  smd: number;
  total: number;
}

interface PmdSmdBarChartProps {
  data?: HumidityData;
  colors: [string, string];
  unitLabel: string;
}

const HUM_HEIGHT = 120;
const HUM_MARGIN = { top: 22, right: 6, bottom: 26, left: 30 };

const humLabels = ["PMD", "SMD"] as const;

const PmdSmdBarChart = ({ data, colors, unitLabel }: PmdSmdBarChartProps) => {
  const { ref, width } = useChartSize(300);

  // API may return null despite the TypeScript type saying number
  const values = useMemo<[number | null, number | null]>(
    () => data ? [data.pmd ?? null, data.smd ?? null] : [null, null],
    [data]
  );

  const innerW = Math.max(20, width - HUM_MARGIN.left - HUM_MARGIN.right);
  const innerH = HUM_HEIGHT - HUM_MARGIN.top - HUM_MARGIN.bottom;

  const x = useMemo(
    () => d3.scaleBand<string>().domain([...humLabels]).range([0, innerW]).padding(0.3),
    [innerW]
  );

  const yDomain = useMemo(() => {
    const valid = values.filter((v): v is number => v != null);
    if (!valid.length) return [0, 100] as [number, number];
    const lo = Math.min(...valid);
    const hi = Math.max(...valid);
    const spread = Math.max(hi - lo, 0.5);
    return [Math.max(0, lo - spread * 2.5), hi + spread] as [number, number];
  }, [values]);

  const y = useMemo(
    () => d3.scaleLinear().domain(yDomain).nice().range([innerH, 0]),
    [yDomain, innerH]
  );

  const yTicks = y.ticks(3);

  return (
    <div ref={ref} className="d3-bar-wrap">
      <svg width={width} height={HUM_HEIGHT}>
        <g transform={`translate(${HUM_MARGIN.left},${HUM_MARGIN.top})`}>

          {/* Horizontal grid lines */}
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)}
              stroke={gridStroke} strokeDasharray="3 3" />
          ))}

          {/* Bars + value labels */}
          {humLabels.map((label, i) => {
            const bx      = x(label) ?? 0;
            const bw      = x.bandwidth();
            const val     = values[i];
            const safeVal = val ?? 0;
            const by      = y(safeVal);
            const bh      = val != null ? Math.max(0, innerH - by) : 0;
            const fill    = colors[i];
            return (
              <g key={label}>
                <rect
                  x={bx} y={by} width={bw} height={bh}
                  fill={fill} fillOpacity={0.85} rx={3}
                />
                <text
                  x={bx + bw / 2} y={by - 4}
                  textAnchor="middle" fontSize={9} fill={fill} fontWeight={700}
                >
                  {val != null ? val.toFixed(1) : "—"}
                </text>
              </g>
            );
          })}

          {/* Y axis */}
          <line y1={0} y2={innerH} stroke={axisStroke} />
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={-3} stroke={axisStroke} />
              <text x={-5} dy={3} textAnchor="end" fontSize={8} fill={axisStroke}>{t}</text>
            </g>
          ))}

          {/* Unit label top-right */}
          <text x={innerW} y={-8} textAnchor="end" fontSize={8} fill={axisStroke}>{unitLabel}</text>

          {/* X axis + labels */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {humLabels.map((label) => {
              const cx = (x(label) ?? 0) + x.bandwidth() / 2;
              return (
                <g key={label} transform={`translate(${cx},0)`}>
                  <line y2={3} stroke={axisStroke} />
                  <text y={12} textAnchor="middle" fontSize={9} fill={axisStroke} fontWeight={500}>
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
};

const humColors: [string, string] = [
  "hsl(200 98% 39%)",  // PMD — info blue
  "hsl(38 92% 48%)",   // SMD — amber
];

export const HumidityBarChart = ({ data }: { data?: HumidityData }) => (
  <PmdSmdBarChart data={data} colors={humColors} unitLabel="% RH" />
);

export const TemperatureBarChart = ({ data }: { data?: HumidityData }) => (
  <PmdSmdBarChart data={data} colors={humColors} unitLabel="°C" />
);

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
 * SPC Histogram (vertical bars + LSL/USL/Target/LCL/UCL lines)
 * ========================================================== */

interface HistogramBin { range: number; count: number; binStart: number; binEnd: number; }

interface SPCHistogramChartProps {
  data: HistogramBin[];
  lineColor: string;
  unit: string;
  lsl?: number;
  usl?: number;
  target?: number;
  lcl?: number;
  ucl?: number;
  showLimits?: boolean;
  /** Kept for API compatibility; not rendered. */
  tooltip?: ReactElement;
}

interface RefLine {
  val: number;
  label: string;
  color: string;
  dash?: string;
  strokeWidth: number;
}

const HIST_HEIGHT = 340;
const HIST_MARGIN = { top: 42, right: 24, bottom: 36, left: 44 };

export const SPCHistogramChart = ({
  data, lineColor, unit,
  lsl, usl, target, lcl, ucl,
  showLimits = true,
}: SPCHistogramChartProps) => {
  const { ref, width } = useChartSize(700);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const innerW = Math.max(20, width - HIST_MARGIN.left - HIST_MARGIN.right);
  const innerH = HIST_HEIGHT - HIST_MARGIN.top - HIST_MARGIN.bottom;

  // Linear x scale — spans all bin edges + every reference line value
  const x = useMemo(() => {
    const vals = [
      ...data.map((d) => d.binStart),
      ...data.map((d) => d.binEnd),
      ...[lsl, usl, target, lcl, ucl].filter((v): v is number => v !== undefined),
    ];
    if (!vals.length) return d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.06 || 1;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range([0, innerW]);
  }, [data, lsl, usl, target, lcl, ucl, innerW]);

  const y = useMemo(
    () => d3.scaleLinear().domain([0, d3.max(data, (d) => d.count) ?? 1]).nice().range([innerH, 0]),
    [data, innerH]
  );

  const yTicks = y.ticks(5);
  const xTicks = x.ticks(8);

  // Color each bar by SPC zone
  const barFill = (d: HistogramBin) => {
    const mid = (d.binStart + d.binEnd) / 2;
    if ((lsl !== undefined && mid < lsl) || (usl !== undefined && mid > usl))
      return "hsl(0, 75%, 55%)";
    if ((lcl !== undefined && mid < lcl) || (ucl !== undefined && mid > ucl))
      return "hsl(38, 95%, 55%)";
    return "hsl(210, 90%, 55%)";
  };

  // Vertical reference lines ordered so narrower limits draw on top
  const refLines: RefLine[] = showLimits ? [
    lsl    !== undefined ? { val: lsl,    label: "LSL",    color: "hsl(215, 20%, 35%)",  strokeWidth: 2 } : null,
    usl    !== undefined ? { val: usl,    label: "USL",    color: "hsl(215, 20%, 35%)",  strokeWidth: 2 } : null,
    lcl    !== undefined ? { val: lcl,    label: "LCL",    color: "hsl(38, 95%, 55%)",   strokeWidth: 1.5, dash: "5 3" } : null,
    ucl    !== undefined ? { val: ucl,    label: "UCL",    color: "hsl(38, 95%, 55%)",   strokeWidth: 1.5, dash: "5 3" } : null,
    target !== undefined ? { val: target, label: "Target", color: "hsl(145, 65%, 40%)",  strokeWidth: 1.5 } : null,
  ].filter(Boolean) as RefLine[] : [];

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
        <defs>
          {/* Subtle zone shading */}
          <clipPath id="hist-clip">
            <rect x={0} y={0} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <g transform={`translate(${HIST_MARGIN.left},${HIST_MARGIN.top})`}>

          {/* Zone background fills */}
          {showLimits && (
            <g clipPath="url(#hist-clip)">
              {lsl !== undefined && (
                <rect x={0} y={0}
                  width={Math.max(0, x(lsl))} height={innerH}
                  fill="hsl(0,75%,55%)" fillOpacity={0.07} />
              )}
              {usl !== undefined && (
                <rect x={x(usl)} y={0}
                  width={Math.max(0, innerW - x(usl))} height={innerH}
                  fill="hsl(0,75%,55%)" fillOpacity={0.07} />
              )}
              {lsl !== undefined && lcl !== undefined && (
                <rect x={x(lsl)} y={0}
                  width={Math.max(0, x(lcl) - x(lsl))} height={innerH}
                  fill="hsl(38,95%,55%)" fillOpacity={0.07} />
              )}
              {ucl !== undefined && usl !== undefined && (
                <rect x={x(ucl)} y={0}
                  width={Math.max(0, x(usl) - x(ucl))} height={innerH}
                  fill="hsl(38,95%,55%)" fillOpacity={0.07} />
              )}
            </g>
          )}

          {/* Horizontal grid lines */}
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)}
              stroke={gridStroke} strokeDasharray="3 3" />
          ))}

          {/* Histogram bars (linear-positioned) */}
          {data.map((d) => {
            const bx  = x(d.binStart);
            const bw  = Math.max(1, x(d.binEnd) - x(d.binStart) - 1);
            const bh  = Math.max(0, innerH - y(d.count));
            return (
              <rect
                key={d.range}
                x={bx} y={y(d.count)} width={bw} height={bh}
                fill={barFill(d)} fillOpacity={0.85} rx={2}
                onMouseEnter={(e) => showTip(e, d)}
                onMouseMove={(e) => showTip(e, d)}
                onMouseLeave={hideTip}
              />
            );
          })}

          {/* Vertical reference lines with pill labels at the top */}
          {refLines.map(({ val, label, color, dash, strokeWidth: sw }) => {
            const cx = x(val);
            if (cx < -2 || cx > innerW + 2) return null;
            const pillText = `${label}: ${Number(val).toFixed(2)}`;
            const pillW    = Math.max(52, pillText.length * 6.2 + 14);
            const pillH    = 18;
            // Clamp pill so it never overflows left/right of the SVG
            const pillCx   = Math.max(pillW / 2, Math.min(innerW - pillW / 2, cx));
            return (
              <g key={label}>
                {/* Vertical line */}
                <line
                  x1={cx} x2={cx} y1={0} y2={innerH}
                  stroke={color} strokeWidth={sw}
                  strokeDasharray={dash}
                />
                {/* Pill badge */}
                <g transform={`translate(${pillCx}, ${-(HIST_MARGIN.top / 2)})`}>
                  <rect
                    x={-pillW / 2} y={-pillH / 2}
                    width={pillW} height={pillH}
                    rx={3} fill={color}
                  />
                  <text
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={9} fontWeight={700} fill="white"
                  >
                    {pillText}
                  </text>
                </g>
              </g>
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
          <text
            transform={`translate(-34,${innerH / 2}) rotate(-90)`}
            textAnchor="middle" fontSize={10} fill={axisStroke}
          >
            Frequency
          </text>

          {/* X axis */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={4} stroke={axisStroke} />
                <text y={15} textAnchor="middle" fontSize={10} fill={axisStroke}>{t}</text>
              </g>
            ))}
            <text x={innerW} y={30} textAnchor="end" fontSize={10} fill={axisStroke}>{unit}</text>
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};
