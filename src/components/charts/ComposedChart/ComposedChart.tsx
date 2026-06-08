import './ComposedChart.css';
import '../tooltip.css';
import { useMemo, useRef, useCallback } from "react";
import * as d3 from "d3";
import { useChartSize } from "../useChartSize";

export type EnergyChartMode = "consumption" | "cost";
export type EnergyChartType = "line" | "area" | "bar";

interface EnergyTrendPoint { time: string; actual: number; cost?: number; [k: string]: any; }

interface EnergyTrendComposedChartProps {
  data: EnergyTrendPoint[];
  mode: EnergyChartMode;
  chartType: EnergyChartType;
  showShiftBands: boolean;
  fmt: (v: number) => string;
}

const HEIGHT = 340;
const MARGIN = { top: 16, right: 20, bottom: 36, left: 50 };

const muted = "var(--muted-foreground)";
const border = "color-mix(in oklab, var(--border) 80%, transparent)";

const SHIFT_BANDS: { x1: string; x2: string; color: string }[] = [
  { x1: "06:00", x2: "14:00", color: "hsl(210 100% 50%)" },
  { x1: "14:00", x2: "22:00", color: "hsl(38 92% 50%)" },
  { x1: "22:00", x2: "23:00", color: "hsl(260 60% 55%)" },
];

export const EnergyTrendComposedChart = ({
  data, mode, chartType, showShiftBands, fmt,
}: EnergyTrendComposedChartProps) => {
  const { ref, width } = useChartSize(800);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const dataKey = mode === "consumption" ? "actual" : "cost";
  const innerW = Math.max(20, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = useMemo(
    () => d3.scaleBand<string>().domain(data.map((d) => d.time)).range([0, innerW]).padding(0.15),
    [data, innerW]
  );
  const y = useMemo(() => {
    const max = d3.max(data, (d) => (d as any)[dataKey] as number) ?? 1;
    return d3.scaleLinear().domain([0, max * 1.1]).nice().range([innerH, 0]);
  }, [data, dataKey, innerH]);

  const centerX = (t: string) => (x(t) ?? 0) + x.bandwidth() / 2;

  const line = useMemo(
    () => d3.line<EnergyTrendPoint>()
      .x((d) => centerX(d.time))
      .y((d) => y((d as any)[dataKey] ?? 0))
      .curve(d3.curveMonotoneX),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, y, dataKey]
  );

  const area = useMemo(
    () => d3.area<EnergyTrendPoint>()
      .x((d) => centerX(d.time))
      .y0(innerH)
      .y1((d) => y((d as any)[dataKey] ?? 0))
      .curve(d3.curveMonotoneX),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, y, dataKey, innerH]
  );

  const xTicks = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0);
  const yTicks = y.ticks(5);

  const showTip = useCallback((e: React.MouseEvent, d: EnergyTrendPoint) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    const v = (d as any)[dataKey] as number;
    tt.innerHTML =
      `<div class="d3-tt-name">Time: ${d.time}</div>` +
      `<div>${mode === "consumption" ? "Consumption" : "Cost"}: <strong>${fmt(v)}</strong></div>`;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, [dataKey, mode, fmt]);
  const hideTip = useCallback(() => tooltipRef.current?.classList.remove("is-visible"), []);

  // Shift band rects (uses band x positions if those times exist in the data)
  const bandRects = showShiftBands
    ? SHIFT_BANDS.map((b, i) => {
        const x1 = x(b.x1);
        const x2 = x(b.x2);
        if (x1 == null || x2 == null) return null;
        return (
          <rect key={i} x={x1} y={0} width={Math.max(0, x2 - x1)} height={innerH} fill={b.color} fillOpacity={0.05} />
        );
      })
    : null;

  return (
    <div ref={ref} className="d3-composed-wrap">
      <svg width={width} height={HEIGHT}>
        <defs>
          <linearGradient id="d3BarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(195 90% 65%)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="hsl(210 100% 70%)" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="d3AreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(210 100% 55%)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(210 100% 55%)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Grid */}
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke={border} strokeDasharray="3 3" />
          ))}

          {bandRects}

          {/* Bars */}
          {chartType === "bar" && data.map((d) => {
            const bx = x(d.time) ?? 0;
            const v = (d as any)[dataKey] ?? 0;
            const bw = Math.min(x.bandwidth(), data.length > 30 ? 6 : 14);
            return (
              <rect
                key={d.time}
                x={bx + (x.bandwidth() - bw) / 2}
                y={y(v)}
                width={bw}
                height={innerH - y(v)}
                fill="url(#d3BarGradient)"
                rx={4}
              />
            );
          })}

          {/* Area */}
          {chartType === "area" && (
            <>
              <path d={area(data) ?? ""} fill="url(#d3AreaGradient)" />
              <path d={line(data) ?? ""} fill="none" stroke="hsl(210 100% 55%)" strokeWidth={2} />
            </>
          )}

          {/* Trend line (drawn for line + bar modes) */}
          {chartType !== "area" && (
            <path d={line(data) ?? ""} fill="none" stroke="hsl(310 75% 60%)" strokeWidth={2.5} />
          )}

          {/* Hover columns */}
          {data.map((d) => (
            <rect
              key={`h-${d.time}`}
              x={x(d.time) ?? 0} y={0}
              width={x.bandwidth()} height={innerH}
              fill="transparent"
              onMouseEnter={(e) => showTip(e, d)}
              onMouseMove={(e) => showTip(e, d)}
              onMouseLeave={hideTip}
            />
          ))}

          {/* X axis */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={muted} />
            {xTicks.map((d) => (
              <g key={d.time} transform={`translate(${centerX(d.time)},0)`}>
                <line y2={4} stroke={muted} />
                <text y={16} textAnchor="middle" fontSize={10} fill={muted}>{d.time}</text>
              </g>
            ))}
          </g>

          {/* Y axis */}
          <line y1={0} y2={innerH} stroke={muted} />
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={-4} stroke={muted} />
              <text x={-8} dy={4} textAnchor="end" fontSize={10} fill={muted}>{t}</text>
            </g>
          ))}

          {/* Legend */}
          <g transform={`translate(0,${innerH + 26})`}>
            <rect width={10} height={10} fill="url(#d3BarGradient)" />
            <text x={14} y={9} fontSize={11} fill={muted}>
              {mode === "consumption" ? "Consumption (kWh)" : "Cost (₹)"}
            </text>
            {chartType !== "area" && (
              <>
                <line x1={140} x2={160} y1={5} y2={5} stroke="hsl(310 75% 60%)" strokeWidth={2.5} />
                <text x={166} y={9} fontSize={11} fill={muted}>Trend</text>
              </>
            )}
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};
