import './AreaChart.css';
import '../tooltip.css';
import { useMemo, useRef, useCallback } from "react";
import * as d3 from "d3";
import { useChartSize } from "../useChartSize";

const gridStroke = "hsl(220, 14%, 22%)";
const axisStroke = "hsl(215, 15%, 55%)";

interface EnergyTrendPoint {
  time: string;
  actual: number;
  [key: string]: any;
}

interface EnergyTrendAreaChartProps {
  data: EnergyTrendPoint[];
}

const HEIGHT = 300;
const MARGIN = { top: 10, right: 20, bottom: 36, left: 50 };

export const EnergyTrendAreaChart = ({ data }: EnergyTrendAreaChartProps) => {
  const { ref, width } = useChartSize(800);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const innerW = Math.max(20, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = useMemo(
    () => d3.scalePoint<string>().domain(data.map((d) => d.time)).range([0, innerW]).padding(0),
    [data, innerW]
  );
  const y = useMemo(
    () => d3.scaleLinear().domain([0, (d3.max(data, (d) => d.actual) ?? 0) * 1.1]).nice().range([innerH, 0]),
    [data, innerH]
  );

  const area = useMemo(
    () => d3.area<EnergyTrendPoint>()
      .x((d) => x(d.time) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.actual))
      .curve(d3.curveMonotoneX),
    [x, y, innerH]
  );
  const line = useMemo(
    () => d3.line<EnergyTrendPoint>()
      .x((d) => x(d.time) ?? 0)
      .y((d) => y(d.actual))
      .curve(d3.curveMonotoneX),
    [x, y]
  );

  const xTicks = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0);
  const yTicks = y.ticks(5);

  const showTip = useCallback((e: React.MouseEvent, d: EnergyTrendPoint) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    tt.innerHTML = `<div class="d3-tt-name">${d.time}</div><div>Actual: <strong>${d.actual} kWh</strong></div>`;
    tt.classList.add("is-visible");
    tt.style.left = `${e.clientX + 12}px`;
    tt.style.top = `${e.clientY + 12}px`;
  }, []);
  const hideTip = useCallback(() => tooltipRef.current?.classList.remove("is-visible"), []);

  return (
    <div ref={ref} className="d3-area-wrap">
      <svg width={width} height={HEIGHT}>
        <defs>
          <linearGradient id="d3AreaActualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke={gridStroke} strokeDasharray="3 3" />
          ))}
          <path d={area(data) ?? ""} fill="url(#d3AreaActualGrad)" />
          <path d={line(data) ?? ""} fill="none" stroke="hsl(210, 100%, 50%)" strokeWidth={2} />
          {data.map((d, i) => (
            <circle
              key={i}
              cx={x(d.time) ?? 0} cy={y(d.actual)} r={3}
              fill="hsl(210, 100%, 50%)" opacity={0.001}
              onMouseEnter={(e) => showTip(e, d)}
              onMouseMove={(e) => showTip(e, d)}
              onMouseLeave={hideTip}
            />
          ))}
          {/* Invisible hover columns */}
          {data.map((d, i) => (
            <rect
              key={`h-${i}`}
              x={(x(d.time) ?? 0) - innerW / data.length / 2}
              y={0}
              width={innerW / data.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={(e) => showTip(e, d)}
              onMouseMove={(e) => showTip(e, d)}
              onMouseLeave={hideTip}
            />
          ))}
          {/* X axis */}
          <g transform={`translate(0,${innerH})`}>
            <line x1={0} x2={innerW} stroke={axisStroke} />
            {xTicks.map((d) => (
              <g key={d.time} transform={`translate(${x(d.time) ?? 0},0)`}>
                <line y2={4} stroke={axisStroke} />
                <text y={16} textAnchor="middle" fontSize={11} fill={axisStroke}>{d.time}</text>
              </g>
            ))}
            <text x={innerW / 2} y={32} textAnchor="middle" fontSize={11} fill={axisStroke}>Date-Time</text>
          </g>
          {/* Y axis */}
          <line y1={0} y2={innerH} stroke={axisStroke} />
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={-4} stroke={axisStroke} />
              <text x={-8} dy={4} textAnchor="end" fontSize={11} fill={axisStroke}>{t}</text>
            </g>
          ))}
          <text transform={`translate(-38,${innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={axisStroke}>kWh</text>
          {/* Legend */}
          <g transform={`translate(${innerW - 80},${-2})`}>
            <rect width={10} height={10} fill="hsl(210, 100%, 50%)" />
            <text x={14} y={9} fontSize={11} fill={axisStroke}>Actual</text>
          </g>
        </g>
      </svg>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};
