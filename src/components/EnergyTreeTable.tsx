import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { BarChart2, ChevronRight, LineChart, TrendingUp, X } from "lucide-react";
import * as d3 from "d3";
import { useChartSize } from "@/components/charts/useChartSize";
import "@/components/charts/tooltip.css";
import { HOUR_LABELS, energyTree as energyTreeStatic, sumHourly, type EnergyTreeAsset, type EnergyTreeLine, type EnergyTreeUnit } from "@/data/energyTreeData";
import { useAppSelector } from "@/redux/hooks/reduxHooks";
import { selectEnergyTree, selectEnergyHourLabels, selectEnergyShiftLabels } from "@/redux/slices/energyMonitoringSlice";
import "./EnergyTreeTable.css";

export type EnergyPeriod = "today" | "yesterday" | "7days" | "30days" | "month";
type ViewMode = "hour" | "shift" | "day";

type Row =
  | { kind: "unit";  depth: 0; id: string; name: string; hourly: number[]; shiftKwh?: number[]; total: number; childCount: number; childLabel: string; expandable: true }
  | { kind: "line";  depth: 1; id: string; name: string; hourly: number[]; shiftKwh?: number[]; total: number; childCount: number; childLabel: string; expandable: true; parentId: string }
  | { kind: "asset"; depth: 2; id: string; name: string; hourly: number[]; shiftKwh?: number[]; total: number; expandable: false; parentId: string };

interface PreparedLine extends EnergyTreeLine { hourly: number[]; total: number }
interface PreparedUnit extends EnergyTreeUnit { hourly: number[]; total: number; preparedLines: PreparedLine[] }

const sumArr = (a: number[]) => +a.reduce((s, v) => s + v, 0).toFixed(1);
const sumRange = (a: number[], start: number, end: number) =>
  +a.slice(start, end).reduce((s, v) => s + v, 0).toFixed(1);

function prepare(tree: EnergyTreeUnit[]): PreparedUnit[] {
  return tree.map((unit) => {
    const preparedLines: PreparedLine[] = unit.lines.map((line) => {
      const h = line.hourly?.length ? line.hourly : sumHourly(line.assets);
      return { ...line, hourly: h, total: sumArr(h) };
    });
    const h = unit.hourly?.length ? unit.hourly : sumHourly(preparedLines);
    return { ...unit, preparedLines, hourly: h, total: sumArr(h) };
  });
}

const fmt = (v: number) => v.toFixed(1);

// --- column / value transforms by view mode ---

const SHIFT_LABELS = ["Shift A (06–14)", "Shift B (14–22)", "Shift C (22–06)"];

function toShiftValues(hourly: number[]): number[] {
  // hourly[0] = 06-07 ... hourly[23] = 05-06
  return [sumRange(hourly, 0, 8), sumRange(hourly, 8, 16), sumRange(hourly, 16, 24)];
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Format ISO date strings ("2026-06-07") → "Jun 07"; pass through other labels unchanged
function fmtLabel(label: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Date(label + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }
  return label.split(" - ")[0]; // for hour labels like "06 AM - 07 AM"
}

function dayCountFor(period: EnergyPeriod): number {
  if (period === "7days") return 7;
  if (period === "30days") return 30;
  if (period === "month") return 30;
  return 1;
}

function dayLabels(n: number): string[] {
  const labels: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }));
  }
  return labels;
}

function toDayValues(id: string, hourly: number[], n: number): number[] {
  const dayTotal = sumArr(hourly);
  let s = hashString(id);
  return Array.from({ length: n }, () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const variance = 0.7 + (s / 0xffffffff) * 0.6; // 0.7–1.3
    return +(dayTotal * variance).toFixed(1);
  });
}

// Inline trend chart shown when an asset is selected — D3-powered, responsive
const AssetTrendChart = ({ asset, slotLabels, onClose }: { asset: EnergyTreeAsset; slotLabels: string[]; onClose: () => void }) => {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { ref: chartWrapRef, width } = useChartSize<HTMLDivElement>(760);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const H = 240;
  const ML = 44, MR = 16, MT = 16, MB = 32;
  const innerW = Math.max(width - ML - MR, 0);
  const innerH = H - MT - MB;
  const data = asset.hourly;

  const totalKwh = useMemo(() => sumArr(data), [data]);
  const minVal = useMemo(() => Math.min(...data), [data]);
  const maxVal = useMemo(() => Math.max(...data), [data]);
  const avgVal = useMemo(() => +(data.reduce((s, v) => s + v, 0) / data.length).toFixed(1), [data]);

  const { yScale, xLine, xBar, linePath, areaPath, yTicks } = useMemo(() => {
    const yScale = d3.scaleLinear()
      .domain([0, (d3.max(data) ?? 0) * 1.1 || 1])
      .nice()
      .range([innerH, 0]);

    const indices = data.map((_, i) => i);
    const xLine = d3.scalePoint<number>().domain(indices).range([0, innerW]);
    const xBar = d3.scaleBand<number>().domain(indices).range([0, innerW]).padding(0.08);

    const lineGen = d3.line<number>()
      .x((_, i) => xLine(i) ?? 0)
      .y((v) => yScale(v))
      .curve(d3.curveMonotoneX);

    const areaGen = d3.area<number>()
      .x((_, i) => xLine(i) ?? 0)
      .y0(innerH)
      .y1((v) => yScale(v))
      .curve(d3.curveMonotoneX);

    return {
      yScale,
      xLine,
      xBar,
      linePath: lineGen(data) ?? "",
      areaPath: areaGen(data) ?? "",
      yTicks: yScale.ticks(4),
    };
  }, [data, innerW, innerH]);

  const showTip = useCallback((e: { clientX: number; clientY: number }, label: string, value: number) => {
    const tip = tooltipRef.current;
    if (!tip) return;
    tip.innerHTML = `<div class="d3-tt-name">${label}</div><div>${fmt(value)} kWh</div>`;
    tip.style.left = `${e.clientX + 12}px`;
    tip.style.top = `${e.clientY - 28}px`;
    tip.classList.add("is-visible");
  }, []);

  const hideTip = useCallback(() => {
    tooltipRef.current?.classList.remove("is-visible");
  }, []);

  return (
    <div className="energy-trend-panel" ref={panelRef}>
      <div className="energy-trend-head">
        <div>
          <div className="energy-trend-eyebrow"><TrendingUp size={12} /> Asset Trend</div>
          <h4 className="energy-trend-title">{asset.name}</h4>
          <div className="energy-trend-stats">
            <span>Min <strong>{fmt(minVal)} kWh</strong></span>
            <span>Max <strong>{fmt(maxVal)} kWh</strong></span>
            <span>Average <strong>{fmt(avgVal)} kWh</strong></span>
            <span>Total <strong>{fmt(totalKwh)} kWh</strong></span>
          </div>
        </div>
        <div className="energy-trend-controls">
          <button
            type="button"
            className={`energy-trend-chart-btn${chartType === "line" ? " is-active" : ""}`}
            onClick={() => setChartType("line")}
            aria-label="Line chart"
            title="Line chart"
          >
            <LineChart size={15} />
          </button>
          <button
            type="button"
            className={`energy-trend-chart-btn${chartType === "bar" ? " is-active" : ""}`}
            onClick={() => setChartType("bar")}
            aria-label="Histogram"
            title="Histogram"
          >
            <BarChart2 size={15} />
          </button>
          <button type="button" className="energy-trend-close" onClick={onClose} aria-label="Close trend">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="energy-trend-chart-wrap" ref={chartWrapRef}>
        <svg height={H} overflow="visible" className="energy-trend-svg">
          <defs>
            <linearGradient id="energyTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g transform={`translate(${ML},${MT})`}>
            {/* Y gridlines + labels */}
            {yTicks.map((v) => {
              const y = yScale(v);
              return (
                <g key={v}>
                  <line x1={0} x2={innerW} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                  <text x={-8} y={y} dy={4} fontSize={10} textAnchor="end" fill="var(--muted-foreground)">{v}</text>
                </g>
              );
            })}

            {/* Line chart */}
            {chartType === "line" && (
              <>
                <path d={areaPath} fill="url(#energyTrendFill)" />
                <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} />
                {data.map((v, i) => (
                  <circle
                    key={i}
                    cx={xLine(i) ?? 0}
                    cy={yScale(v)}
                    r={3}
                    fill="var(--primary)"
                    className="energy-trend-data-point"
                    onMouseMove={(e) => showTip(e, (slotLabels[i] ?? HOUR_LABELS[i] ?? String(i)), v)}
                    onMouseLeave={hideTip}
                  />
                ))}
              </>
            )}

            {/* Histogram / bar chart */}
            {chartType === "bar" && data.map((v, i) => (
              <rect
                key={i}
                x={xBar(i) ?? 0}
                y={yScale(v)}
                width={xBar.bandwidth()}
                height={innerH - yScale(v)}
                fill="var(--primary)"
                fillOpacity={0.22}
                stroke="var(--primary)"
                strokeOpacity={0.55}
                strokeWidth={1}
                className="energy-trend-data-point"
                onMouseEnter={(e) => {
                  (e.currentTarget as SVGRectElement).setAttribute("fill-opacity", "1");
                  (e.currentTarget as SVGRectElement).setAttribute("stroke-opacity", "1");
                  showTip(e, (slotLabels[i] ?? HOUR_LABELS[i] ?? String(i)), v);
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as SVGRectElement).setAttribute("fill-opacity", "0.22");
                  (e.currentTarget as SVGRectElement).setAttribute("stroke-opacity", "0.55");
                  hideTip();
                }}
              />
            ))}

            {/* X baseline */}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--border)" />

            {/* X-axis labels — show as many as fit without overlapping */}
            {(() => {
              const labelPx = 42; // estimated px each label occupies at font-size 10
              const maxVisible = Math.max(1, Math.floor(innerW / labelPx));
              const step = Math.max(1, Math.ceil(slotLabels.length / maxVisible));
              return slotLabels.map((label, i) => {
                if (i % step !== 0) return null;
                const x = chartType === "line"
                  ? (xLine(i) ?? 0)
                  : (xBar(i) ?? 0) + xBar.bandwidth() / 2;
                return (
                  <text key={i} x={x} y={innerH + 16} fontSize={10} textAnchor="middle" fill="var(--muted-foreground)">
                    {fmtLabel(label)}
                  </text>
                );
              });
            })()}
          </g>
        </svg>
      </div>
      <div ref={tooltipRef} className="d3-tooltip" />
    </div>
  );
};

interface EnergyTreeTableProps {
  period?: EnergyPeriod;
}

const EnergyTreeTable = ({ period = "today" }: EnergyTreeTableProps) => {
  // Use live API data from Redux; fall back to static mock if store is empty
  const liveTree = useAppSelector(selectEnergyTree);
  const apiSlotLabels  = useAppSelector(selectEnergyHourLabels);
  const apiShiftLabels = useAppSelector(selectEnergyShiftLabels);
  const treeSource = liveTree.length ? liveTree : energyTreeStatic;
  const data = useMemo(() => prepare(treeSource), [treeSource]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const isIntraday = period === "today" || period === "yesterday";
  const [intradayMode, setIntradayMode] = useState<"hour" | "shift">("hour");

  const viewMode: ViewMode = isIntraday ? intradayMode : "day";

  const slotLabels = apiSlotLabels.length ? apiSlotLabels : HOUR_LABELS;
  const shiftLabels = apiShiftLabels.length ? apiShiftLabels : SHIFT_LABELS;

  const columns = useMemo(() => {
    if (viewMode === "hour") return slotLabels;
    if (viewMode === "shift") return shiftLabels;
    // For day view: prefer real API slot labels (actual dates) over generated ones
    if (apiSlotLabels.length) return apiSlotLabels;
    return dayLabels(dayCountFor(period));
  }, [viewMode, period, slotLabels, shiftLabels, apiSlotLabels]);

  const valuesFor = (id: string, hourly: number[], shiftKwh?: number[]): number[] => {
    if (viewMode === "hour") return hourly;
    if (viewMode === "shift") {
      if (shiftKwh?.length) return shiftKwh;
      return toShiftValues(hourly);
    }
    // For multiday view: if the API returned daily values (not 24-hour), use them directly
    if (hourly.length !== 24) return hourly.slice(0, columns.length);
    return toDayValues(id, hourly, columns.length);
  };

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    for (const u of treeSource) for (const l of u.lines) {
      const a = l.assets.find((x) => x.id === selectedAssetId);
      if (a) return a;
    }
    return null;
  }, [selectedAssetId, treeSource]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const unit of data) {
      const lineCount = unit.preparedLines.length;
      out.push({
        kind: "unit", depth: 0, id: unit.id, name: unit.name,
        hourly: unit.hourly, shiftKwh: unit.shiftKwh, total: unit.total,
        childCount: lineCount, childLabel: `${lineCount} ${lineCount === 1 ? "Line" : "Lines"}`,
        expandable: true,
      });
      if (!expanded.has(unit.id)) continue;
      for (const line of unit.preparedLines) {
        const assetCount = line.assets.length;
        out.push({
          kind: "line", depth: 1, id: line.id, name: line.name,
          hourly: line.hourly, shiftKwh: line.shiftKwh, total: line.total,
          childCount: assetCount, childLabel: `${assetCount} ${assetCount === 1 ? "Asset" : "Assets"}`,
          expandable: true, parentId: unit.id,
        });
        if (!expanded.has(line.id)) continue;
        for (const asset of line.assets as EnergyTreeAsset[]) {
          out.push({
            kind: "asset", depth: 2, id: asset.id, name: asset.name,
            hourly: asset.hourly, shiftKwh: asset.shiftKwh, total: sumArr(asset.hourly),
            expandable: false, parentId: line.id,
          });
        }
      }
    }
    return out;
  }, [data, expanded]);

  // Per-row column values + recompute total for the current view (so Total matches displayed columns)
  const rowsWithCols = useMemo(
    () =>
      rows.map((r) => {
        const cols = valuesFor(r.id, r.hourly, r.shiftKwh);
        return { row: r, cols, total: sumArr(cols) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, viewMode, columns],
  );

  const maxTotal = Math.max(...rowsWithCols.filter((x) => x.row.kind === "unit").map((x) => x.total), 1);

  return (
    <>
      {isIntraday && (
        <div className="energy-view-toggle" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={intradayMode === "hour" ? "true" : "false"}
            className={`energy-view-toggle-btn${intradayMode === "hour" ? " is-active" : ""}`}
            onClick={() => setIntradayMode("hour")}
          >
            Hourly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={intradayMode === "shift" ? "true" : "false"}
            className={`energy-view-toggle-btn${intradayMode === "shift" ? " is-active" : ""}`}
            onClick={() => setIntradayMode("shift")}
          >
            Shift Summary
          </button>
        </div>
      )}

      <div className="energy-tree-wrap">
        <div className="energy-tree-scroll">
          <table className="energy-tree-table">
            <thead>
              <tr>
                <th className="energy-tree-th energy-tree-col-item">Item</th>
                <th className="energy-tree-th energy-tree-col-total">Total (kWh)</th>
                {columns.map((label, i) => (
                  <th
                    key={label + i}
                    className={`energy-tree-th energy-tree-th-hour ${i % 2 === 0 ? "is-even" : "is-odd"}`}
                  >
                    {fmtLabel(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsWithCols.map(({ row, cols, total }) => {
                const isOpen = expanded.has(row.id);
                const isSelected = row.kind === "asset" && row.id === selectedAssetId;
                const pct = Math.min(100, (total / maxTotal) * 100);
                return (
                  <tr
                    key={row.id}
                    className={`energy-tree-row energy-tree-row--${row.kind}${isSelected ? " is-selected" : ""}`}
                    onClick={() => row.kind === "asset" && setSelectedAssetId(row.id)}
                  >
                    <td className="energy-tree-td energy-tree-col-item">
                      <div className="energy-tree-item" style={{ "--tree-indent": `${row.depth * 18}px` } as React.CSSProperties}>
                        {row.expandable ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggle(row.id); }}
                            className={`energy-tree-caret${isOpen ? " is-open" : ""}`}
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            <ChevronRight />
                          </button>
                        ) : (
                          <span className="energy-tree-caret energy-tree-caret--placeholder" />
                        )}
                        <span className="energy-tree-name">{row.name}</span>
                        {row.expandable && (
                          <span className="energy-tree-badge">{row.childLabel}</span>
                        )}
                      </div>
                    </td>
                    <td className="energy-tree-td energy-tree-col-total">
                      <div className="energy-tree-total">
                        <span className="energy-tree-total-val">{fmt(total)}</span>
                        <span className="energy-tree-total-bar" aria-hidden>
                          <span className="energy-tree-total-bar-fill" style={{ "--bar-fill-pct": `${pct}%` } as React.CSSProperties} />
                        </span>
                      </div>
                    </td>
                    {cols.map((v, i) => (
                      <td key={i} className={`energy-tree-td energy-tree-td-hour ${i % 2 === 0 ? "is-even" : "is-odd"}`}>
                        {fmt(v)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selectedAsset && (
        <AssetTrendChart asset={selectedAsset} slotLabels={slotLabels} onClose={() => setSelectedAssetId(null)} />
      )}
    </>
  );
};

export default EnergyTreeTable;
