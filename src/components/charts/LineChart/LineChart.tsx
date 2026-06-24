import './LineChart.css';
import '../tooltip.css';
import { useMemo, useRef, useState, useCallback, type ReactElement } from "react";
import * as d3 from "d3";
import { useChartSize } from "../useChartSize";

const gridStroke = "hsl(220, 14%, 22%)";
const axisStroke = "hsl(215, 15%, 55%)";

export interface SPCLineConfig {
  title: string;
  dataKey: string;
  lineColor: string;
  target: number;
  lsl: number;
  usl: number;
  lcl: number;
  ucl: number;
  unit: string;
  yDomain: [number, number];
}

interface SPCTimeseriesChartProps {
  data: any[];
  config: SPCLineConfig;
  xAxisMode: "sample" | "time";
  showLimits: boolean;
  showSPCRules: boolean;
  avg: number;
  /** When provided, replaces SPC zones with sigma-based bands (±1σ green, 1–2σ amber, 2–3σ red). */
  sigmaBands?: { avg: number; sigma: number };
  /** Kept for API compatibility; not used (D3 has built-in tooltip). */
  tooltip?: ReactElement;
  timeTickFormatter: (v: string) => string;
}

const HEIGHT = 320;
const MARGIN = { top: 10, right: 75, bottom: 40, left: 40 };

export const SPCTimeseriesChart = ({
  data, config, xAxisMode, showLimits, showSPCRules, avg, sigmaBands, timeTickFormatter,
}: SPCTimeseriesChartProps) => {
  const { ref, width } = useChartSize(800);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const innerW = Math.max(20, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const xField = xAxisMode === "time" ? "timestamp" : "time";

  const x = useMemo(
    () => d3.scalePoint<string>().domain(data.map((d) => String(d[xField]))).range([0, innerW]).padding(0.5),
    [data, xField, innerW]
  );
  const y = useMemo(
    () => d3.scaleLinear().domain(config.yDomain).range([innerH, 0]),
    [config.yDomain, innerH]
  );

  const line = useMemo(
    () => d3.line<any>()
      .x((d) => x(String(d[xField])) ?? 0)
      .y((d) => y(d[config.dataKey]))
      .curve(d3.curveMonotoneX),
    [x, y, xField, config.dataKey]
  );

  const xTicks = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 8));
    return data.filter((_, i) => i % step === 0);
  }, [data]);
  const yTicks = y.ticks(6);

  const showTooltip = useCallback((e: React.MouseEvent, html: string) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    tt.innerHTML = html;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, []);
  const hideTooltip = useCallback(() => {
    tooltipRef.current?.classList.remove("is-visible");
    setHoverIdx(null);
  }, []);

  const formatTick = (v: string) => xAxisMode === "time" ? timeTickFormatter(v) : v;

  return (
    <div ref={ref} className="d3-line-wrap">
      <svg width={width} height={HEIGHT}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Grid removed per design */}

          {/* SPC zones — 6 bands bounded by UCL/LCL, divided into 3 equal steps each side */}
          {showSPCRules && sigmaBands && (() => {
            const a = sigmaBands.avg;
            const ucl = config.ucl;
            const lcl = config.lcl;
            const upStep   = (ucl - a) / 3;
            const downStep = (a - lcl) / 3;
            const clampY = (v: number) => Math.max(0, Math.min(innerH, y(v)));
            const band = (lo: number, hi: number, fill: string, op: number) => {
              const y1 = clampY(hi); const y2 = clampY(lo);
              return <rect x={0} y={y1} width={innerW} height={Math.max(0, y2 - y1)} fill={fill} fillOpacity={op} />;
            };
            return (
              <>
                {/* Upper side: avg → UCL */}
                {band(a,               a + upStep,       "hsl(145, 60%, 55%)", 0.22)}
                {band(a + upStep,      a + 2 * upStep,   "hsl(42,  95%, 55%)", 0.26)}
                {band(a + 2 * upStep,  ucl,              "hsl(0,   75%, 60%)", 0.25)}
                {/* Lower side: LCL → avg */}
                {band(a - downStep,    a,                "hsl(145, 60%, 55%)", 0.22)}
                {band(a - 2*downStep,  a - downStep,     "hsl(42,  95%, 55%)", 0.26)}
                {band(lcl,             a - 2*downStep,   "hsl(0,   75%, 60%)", 0.25)}
              </>
            );
          })()}
          {showSPCRules && !sigmaBands && (() => {
            const cy = (v: number) => Math.max(0, Math.min(innerH, y(v)));
            return (
              <>
                {/* Zone A: UCL→USL and LSL→LCL (red) */}
                <rect x={0} y={cy(config.ucl)} width={innerW} height={Math.max(0, cy(config.usl) - cy(config.ucl))} fill="hsl(0, 78%, 58%)"   fillOpacity={0.15} />
                <rect x={0} y={cy(config.lsl)} width={innerW} height={Math.max(0, cy(config.lcl) - cy(config.lsl))} fill="hsl(0, 78%, 58%)"   fillOpacity={0.15} />
                {/* Zone B: avg→UCL and LCL→avg (yellow) */}
                <rect x={0} y={cy(config.ucl)} width={innerW} height={Math.max(0, cy(avg)        - cy(config.ucl))} fill="hsl(42, 95%, 55%)"  fillOpacity={0.18} />
                <rect x={0} y={cy(avg)}        width={innerW} height={Math.max(0, cy(config.lcl) - cy(avg))}        fill="hsl(42, 95%, 55%)"  fillOpacity={0.18} />
                {/* Zone C inner ±1σ is not separately available without sigmaBands — UCL/LCL act as outer boundary */}
                {/* Dividers */}
                <line x1={0} x2={innerW} y1={cy(config.ucl)} y2={cy(config.ucl)} stroke="hsl(215,20%,50%)" strokeWidth={0.75} strokeDasharray="3 4" opacity={0.55} />
                <line x1={0} x2={innerW} y1={cy(avg)}        y2={cy(avg)}        stroke="hsl(215,20%,50%)" strokeWidth={0.75} strokeDasharray="3 4" opacity={0.55} />
                <line x1={0} x2={innerW} y1={cy(config.lcl)} y2={cy(config.lcl)} stroke="hsl(215,20%,50%)" strokeWidth={0.75} strokeDasharray="3 4" opacity={0.55} />
              </>
            );
          })()}

          {/* Reference lines */}
          {showLimits && [
            { v: config.usl, color: "hsl(0, 85%, 60%)",  label: "USL",        dash: undefined, width: 2.5 },
            { v: config.lsl, color: "hsl(0, 85%, 60%)",  label: "LSL",        dash: undefined, width: 2.5 },
            { v: config.ucl, color: "hsl(38, 95%, 55%)", label: "UCL",        dash: "4 4",     width: 1.5 },
            { v: config.lcl, color: "hsl(38, 95%, 55%)", label: "LCL",        dash: "4 4",     width: 1.5 },
            { v: config.target, color: "hsl(210, 100%, 60%)", label: "Target", dash: "4 2",    width: 1.5 },
            { v: avg, color: "hsl(280, 80%, 65%)",        label: `Avg ${avg}`, dash: undefined, width: 1.5 },
          ].map((r, i) => (
            <g key={i}>
              <line x1={0} x2={innerW} y1={y(r.v)} y2={y(r.v)} stroke={r.color} strokeWidth={r.width} strokeDasharray={r.dash} />
              <text x={innerW + 4} y={y(r.v)} dy={4} fill={r.color} fontSize={10}>{r.label}</text>
            </g>
          ))}

          {/* Line path */}
          <path d={line(data) ?? ""} fill="none" stroke={config.lineColor} strokeWidth={2} />

          {/* Dots + hover */}
          {data.map((d, i) => {
            const cx = x(String(d[xField])) ?? 0;
            const cy = y(d[config.dataKey]);
            const isHover = hoverIdx === i;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={isHover ? 5 : 2.5} fill={config.lineColor} stroke={isHover ? "hsl(var(--foreground))" : "none"} strokeWidth={isHover ? 2 : 0} />
                <rect
                  x={cx - 8} y={0} width={16} height={innerH}
                  fill="transparent"
                  onMouseEnter={(e) => {
                    setHoverIdx(i);
                    const ts = d.timestamp ? new Date(d.timestamp) : null;
                    const tsLabel = ts ? d3.timeFormat("%d %b %Y, %H:%M")(ts) : d.time;
                    showTooltip(e,
                      `<div class="d3-tt-name">${tsLabel}</div>` +
                      `<div>${config.title.split(" ")[0]}: <strong>${d[config.dataKey]} ${config.unit}</strong></div>`
                    );
                  }}
                  onMouseMove={(e) => showTooltip(e,
                    `<div class="d3-tt-name">${d.timestamp ? d3.timeFormat("%d %b %Y, %H:%M")(new Date(d.timestamp)) : d.time}</div>` +
                    `<div>${config.title.split(" ")[0]}: <strong>${d[config.dataKey]} ${config.unit}</strong></div>`
                  )}
                  onMouseLeave={hideTooltip}
                />
              </g>
            );
          })}

          {/* X axis */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {xTicks.map((d, i) => {
              const cx = x(String(d[xField])) ?? 0;
              const parts = formatTick(String(d[xField])).split("\n");
              return (
                <g key={i} transform={`translate(${cx},0)`}>
                  <line y2={4} stroke={axisStroke} />
                  <text textAnchor="middle" fill={axisStroke} fontSize={10}>
                    {parts.map((part, pi) => (
                      <tspan key={pi} x={0} dy={pi === 0 ? 14 : 12}>{part}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Y axis */}
          <g>
            <line y1={0} y2={innerH} stroke={axisStroke} />
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x1={-4} stroke={axisStroke} />
                <text x={-8} dy={4} textAnchor="end" fill={axisStroke} fontSize={11}>{t}</text>
              </g>
            ))}
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};
