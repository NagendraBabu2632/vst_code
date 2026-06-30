import "./ProcessFilters.css";
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, subDays, subMonths, subHours, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Check, Clock, ChevronUp, ChevronDown } from "lucide-react";
import Dropdown, { DropdownItem } from "@/components/Dropdown";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  setDropdownSelection,
  selectDropdownSelections,
  selectDropdownData,
  buildProcessPayload,
} from "@/redux/slices/dropdownSlice";
import { fetchProcessAnalysisData } from "@/redux/slices/processAnalysisSlice";

const periodOptions = [
  { value: "lastHour",         label: "Last One Hour" },
  { value: "today",            label: "Today" },
  { value: "customLast7",      label: "Custom Date Range (Last 7 Days)" },
  { value: "customHistorical", label: "Custom Date Range (Historical)" },
];

// ── Seeded pseudo-random for stable run-time lists
const seededRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const getPeriodRange = (period: string): { start: Date; end: Date } => {
  const now = new Date();
  switch (period) {
    case "lastHour":
      return { start: subHours(now, 1), end: now };
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "customLast7":
    case "customHistorical":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "last7":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "last30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  }
};

const generateRunTimes = (family: string, period: string) => {
  if (!family || !period) return [];
  const { start, end } = getPeriodRange(period);
  const seed =
    family.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 31 +
    period.length * 7;
  const rand = seededRand(seed);
  const span = end.getTime() - start.getTime();
  const count =
    period === "lastHour" || period === "today" ? 2
    : period === "customLast7" || period === "last7" ? 4
    : 6;

  const runs: { start: Date; end: Date }[] = [];
  for (let i = 0; i < count; i++) {
    const slot = span / count;
    const slotStart = start.getTime() + i * slot;
    const offset = rand() * slot * 0.3;
    const duration = (1 + rand() * 6) * 60 * 60 * 1000;
    const s = new Date(slotStart + offset);
    const e = new Date(Math.min(slotStart + offset + duration, end.getTime()));
    runs.push({ start: s, end: e });
  }
  return runs.sort((a, b) => b.start.getTime() - a.start.getTime());
};

const formatRun = (r: { start: Date; end: Date }) =>
  `${format(r.start, "yyyy-MM-dd HH:mm:ss")} → ${format(r.end, "yyyy-MM-dd HH:mm:ss")}`;

// ── Time spinner sub-component ─────────────────────────────────────────────────
const TimeSpinner = ({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) => (
  <div className="dtrp-spinner">
    <button
      type="button"
      aria-label="Increase"
      className="dtrp-spinner-btn"
      onClick={() => onChange(value >= max ? 0 : value + 1)}
    >
      <ChevronUp size={14} />
    </button>
    <span className="dtrp-spinner-val">{String(value).padStart(2, "0")}</span>
    <button
      type="button"
      aria-label="Decrease"
      className="dtrp-spinner-btn"
      onClick={() => onChange(value <= 0 ? max : value - 1)}
    >
      <ChevronDown size={14} />
    </button>
  </div>
);

// ── PeriodSelector — always fires onChange even when same option re-clicked ────
// Radix Select deliberately skips onValueChange for the same value, which
// prevents re-opening the custom date picker. This plain button-based dropdown
// fires every time.
const PeriodSelector = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = options.find((o) => o.value === value)?.label;

  return (
    <div ref={containerRef} className="period-sel">
      <button
        type="button"
        className="period-sel-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={label ? "" : "period-sel-placeholder"}>
          {label ?? "Select period…"}
        </span>
        <ChevronDown className="period-sel-chevron" size={14} />
      </button>

      {open && (
        <div className="period-sel-content" role="listbox" aria-label="Period options">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`period-sel-item${opt.value === value ? " period-sel-item--active" : ""}`}
              onClick={() => {
                setOpen(false);
                onChange(opt.value);
              }}
            >
              {opt.label}
              {opt.value === value && <Check className="period-sel-check" size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── DateTimeRangePicker modal ──────────────────────────────────────────────────
interface DateTimeRangePickerProps {
  mode: "last7" | "historical";
  initialFrom?: Date;
  initialTo?: Date;
  onConfirm: (from: string, to: string) => void;
  onCancel: () => void;
}

const DateTimeRangePicker = ({
  mode,
  initialFrom,
  initialTo,
  onConfirm,
  onCancel,
}: DateTimeRangePickerProps) => {
  const now = new Date();
  const minDate = mode === "last7"
    ? startOfDay(subDays(now, 7))
    : startOfDay(subMonths(now, 6));

  const defaultStart = mode === "last7" ? startOfDay(subDays(now, 7)) : subMonths(now, 1);
  const defaultEnd   = now;

  const [startDate,  setStartDate]  = useState<Date>(initialFrom ?? defaultStart);
  const [endDate,    setEndDate]    = useState<Date>(initialTo   ?? defaultEnd);
  const [startHour,  setStartHour]  = useState(initialFrom ? initialFrom.getHours()   : 0);
  const [startMin,   setStartMin]   = useState(initialFrom ? initialFrom.getMinutes() : 0);
  const [endHour,    setEndHour]    = useState(initialTo   ? initialTo.getHours()     : now.getHours());
  const [endMin,     setEndMin]     = useState(initialTo   ? initialTo.getMinutes()   : now.getMinutes());
  const [startMonth, setStartMonth] = useState<Date>(startDate);
  const [endMonth,   setEndMonth]   = useState<Date>(endDate);

  const isDisabled = (date: Date) => date < minDate || date > now;

  const handleConfirm = () => {
    const from = new Date(startDate);
    from.setHours(startHour, startMin, 0, 0);
    const to = new Date(endDate);
    to.setHours(endHour, endMin, 0, 0);
    if (from > to) {
      toast.error("Start date/time must be before end date/time");
      return;
    }
    onConfirm(
      format(from, "yyyy-MM-dd HH:mm:ss"),
      format(to,   "yyyy-MM-dd HH:mm:ss")
    );
  };

  const title = mode === "last7"
    ? "Custom Date Range (Last 7 Days)"
    : "Custom Date Range (Historical)";

  return (
    <div className="dtrp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="dtrp-modal">
        <p className="dtrp-title">{title}</p>

        <div className="dtrp-panes">
          {/* ── Start pane ── */}
          <div className="dtrp-pane">
            <DayPicker
              className="calendar-wrapper dtrp-calendar"
              mode="single"
              selected={startDate}
              onSelect={(d) => d && setStartDate(d)}
              month={startMonth}
              onMonthChange={setStartMonth}
              disabled={isDisabled}
            />
            <div className="dtrp-time-row">
              <TimeSpinner value={startHour} max={23} onChange={setStartHour} />
              <span className="dtrp-colon">:</span>
              <TimeSpinner value={startMin}  max={59} onChange={setStartMin}  />
            </div>
          </div>

          <div className="dtrp-divider" />

          {/* ── End pane ── */}
          <div className="dtrp-pane">
            <DayPicker
              className="calendar-wrapper dtrp-calendar"
              mode="single"
              selected={endDate}
              onSelect={(d) => d && setEndDate(d)}
              month={endMonth}
              onMonthChange={setEndMonth}
              disabled={isDisabled}
            />
            <div className="dtrp-time-row">
              <TimeSpinner value={endHour} max={23} onChange={setEndHour} />
              <span className="dtrp-colon">:</span>
              <TimeSpinner value={endMin}  max={59} onChange={setEndMin}  />
            </div>
          </div>
        </div>

        <div className="dtrp-footer">
          <button type="button" className="dtrp-btn dtrp-btn--cancel" onClick={onCancel}>CANCEL</button>
          <button type="button" className="dtrp-btn dtrp-btn--ok"     onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
};

// ── ProcessFilters ─────────────────────────────────────────────────────────────
const ProcessFilters = () => {
  const dispatch   = useAppDispatch();
  const selections = useAppSelector(selectDropdownSelections);
  const dropdownData = useAppSelector(selectDropdownData);

  const [runTime, setRunTime]       = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"last7" | "historical">("last7");
  const prevPeriodRef               = useRef<string>(selections.period);

  // Resolve option lists from dropdown data
  const units        = (dropdownData?.common?.units ?? []) as { value: string; label: string }[];
  const unitToLineMap = (dropdownData?.common?.unitToLineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lines = (
    selections.unit && unitToLineMap[selections.unit]
      ? unitToLineMap[selections.unit]
      : (dropdownData?.common?.lines ?? [])
  ) as { value: string; label: string }[];

  const unitToParamMap = (dropdownData?.common?.unitToParamMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const processParams = (
    selections.unit && unitToParamMap[selections.unit]
      ? unitToParamMap[selections.unit]
      : (dropdownData?.processAnalysis?.processParameter?.options ?? [])
  ) as { value: string; label: string }[];

  const unitLineToMachineMap = (dropdownData?.common?.unitLineToMachineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lineToMachineMap     = (dropdownData?.common?.lineToMachineMapping     ?? {}) as Record<string, { value: string; label: string }[]>;
  const resolvedMachines = (unit: string, line: string) => {
    const key = `${unit}:${line}`;
    return unitLineToMachineMap[key] ?? lineToMachineMap[line] ?? [];
  };
  const machines = (
    selections.unit && selections.line
      ? resolvedMachines(selections.unit, selections.line)
      : selections.line && lineToMachineMap[selections.line]
        ? lineToMachineMap[selections.line]
        : (dropdownData?.common?.machines ?? [])
  ) as { value: string; label: string }[];

  const machineToBlendMap = (dropdownData?.common?.machineToBlendMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const machineBlends = (
    selections.machine && machineToBlendMap[selections.machine]?.length
      ? machineToBlendMap[selections.machine]
      : (dropdownData?.common?.families ?? [])
  ) as { value: string; label: string }[];

  const firstMachineWithBlends = (lineName: string): string => {
    const list = resolvedMachines(selections.unit, lineName);
    return (
      list.find((m) => (machineToBlendMap[m.value] ?? []).length > 0)?.value ??
      list[0]?.value ?? ""
    );
  };

  const runningCandidates = (dropdownData?.processAnalysis?.blendRunning?.options ?? []) as { value: string; label: string }[];
  const availableBlendValues = new Set(machineBlends.map((b) => b.value));
  const runningFamilies  = runningCandidates.filter((f) => availableBlendValues.has(f.value));
  const runningValues    = new Set(runningFamilies.map((f) => f.value));
  const nonRunningBlends = machineBlends.filter((f) => !runningValues.has(f.value));

  const set = (key: Parameters<typeof setDropdownSelection>[0]["key"]) =>
    (value: string) => dispatch(setDropdownSelection({ key, value }));

  const runTimes = useMemo(
    () => generateRunTimes(selections.family, selections.period),
    [selections.family, selections.period]
  );

  // ── Period change handler
  const handlePeriodChange = (v: string) => {
    if (v === "customLast7" || v === "customHistorical") {
      prevPeriodRef.current = selections.period;
      setPickerMode(v === "customLast7" ? "last7" : "historical");
      setPickerOpen(true);
    } else {
      set("period")(v);
      setRunTime("");
    }
  };

  const handlePickerConfirm = (from: string, to: string) => {
    const periodValue = pickerMode === "last7" ? "customLast7" : "customHistorical";
    dispatch(setDropdownSelection({ key: "period",       value: periodValue }));
    dispatch(setDropdownSelection({ key: "dateRangeFrom", value: from }));
    dispatch(setDropdownSelection({ key: "dateRangeTo",   value: to }));
    setPickerOpen(false);
  };

  const handlePickerCancel = () => {
    setPickerOpen(false);
  };

  // ── Apply
  const handleApply = () => {
    if (selections.unit !== "SMD" && !selections.family) {
      toast.error("Please select a Blend");
      return;
    }
    dispatch(fetchProcessAnalysisData(buildProcessPayload(selections)));
    const periodLabel = periodOptions.find((p) => p.value === selections.period)?.label ?? selections.period;
    const rangeLabel  = (selections.period === "customLast7" || selections.period === "customHistorical")
      ? ` · ${selections.dateRangeFrom} → ${selections.dateRangeTo}`
      : "";
    toast.success("Filters applied", {
      description: `${selections.machine} · ${selections.family || "—"} · ${periodLabel}${rangeLabel}${runTime ? ` · ${runTime}` : " · All runs"}`,
    });
  };

  // ── Reset
  const handleReset = () => {
    const firstUnit    = units[0]?.value ?? "PMD";
    const firstLine    = unitToLineMap[firstUnit]?.[0]?.value ?? "";
    const firstMachine = firstMachineWithBlends(firstLine);
    const firstBlend   = (machineToBlendMap[firstMachine] ?? [])[0]?.value ?? "";
    set("unit")(firstUnit);
    set("line")(firstLine);
    set("machine")(firstMachine);
    set("family")(firstBlend);
    set("processParameter")(unitToParamMap[firstUnit]?.[0]?.value ?? "Moisture");
    set("period")("lastHour");
    setRunTime("");
  };

  // Only restore saved dates when re-opening the SAME custom mode.
  // Switching from customLast7 → historical must NOT carry over the 7-day range.
  const pickerMatchesCurrent =
    (pickerMode === "last7"       && selections.period === "customLast7") ||
    (pickerMode === "historical"  && selections.period === "customHistorical");

  const pickerInitialFrom = pickerMatchesCurrent && selections.dateRangeFrom
    ? new Date(selections.dateRangeFrom) : undefined;
  const pickerInitialTo   = pickerMatchesCurrent && selections.dateRangeTo
    ? new Date(selections.dateRangeTo)   : undefined;

  const isMoisture = selections.processParameter?.toLowerCase() === "moisture";

  return (
    <div className="process-filters">
      {/* ── Asset filters */}
      {[
        {
          label: "Unit Name",
          value: selections.unit,
          setter: (v: string) => {
            const fl = unitToLineMap[v]?.[0]?.value ?? "";
            const fm = firstMachineWithBlends(fl);
            set("unit")(v);
            set("line")(fl);
            set("machine")(fm);
            set("family")((machineToBlendMap[fm] ?? [])[0]?.value ?? "");
            set("processParameter")(unitToParamMap[v]?.[0]?.value ?? "Moisture");
          },
          opts: units.map((u) => ({ value: u.value, label: u.label })),
        },
        {
          label: "Line Name",
          value: selections.line,
          setter: (v: string) => {
            const fm = firstMachineWithBlends(v);
            set("line")(v);
            set("machine")(fm);
            set("family")((machineToBlendMap[fm] ?? [])[0]?.value ?? "");
          },
          opts: lines.map((l) => ({ value: l.value, label: l.label })),
        },
        {
          label: "Machine Name",
          value: selections.machine,
          setter: (v: string) => {
            set("machine")(v);
            set("family")((machineToBlendMap[v] ?? [])[0]?.value ?? "");
            setRunTime("");
          },
          opts: machines.map((m) => ({ value: m.value, label: m.label })),
        },
        {
          label: "Parameter Name",
          value: selections.processParameter,
          setter: (v: string) => {
            set("processParameter")(v);
            dispatch(fetchProcessAnalysisData(buildProcessPayload({ ...selections, processParameter: v })));
          },
          opts: processParams.map((p) => ({ value: p.value, label: p.label })),
        },
      ].map((f) => (
        <div key={f.label} className="process-filter-field">
          <label className="process-filter-label">{f.label}</label>
          <Dropdown
            value={f.value}
            onValueChange={f.setter}
            placeholder="Select…"
            options={f.opts}
          />
        </div>
      ))}

      {/* ── Period */}
      <div className="process-filter-field--period">
        <label className="process-filter-label">Period</label>
        <PeriodSelector
          value={selections.period}
          options={periodOptions}
          onChange={handlePeriodChange}
        />
      </div>

      {/* ── Blend — only for Moisture parameter */}
      {isMoisture && (
        <div className="process-filter-field--family">
          <label className="process-filter-label">Blend</label>
          <Dropdown
            value={selections.family}
            onValueChange={(v) => { set("family")(v); setRunTime(""); }}
            placeholder="Select blend…"
          >
            {runningFamilies.length > 0 && (
              <>
                <div className="process-filter-group-header">Running</div>
                {runningFamilies.map((f) => (
                  <DropdownItem key={f.value} value={f.value}>
                    <span className="process-filter-option-row">
                      <span className="process-filter-dot process-filter-dot--success" />
                      {f.label}
                      <span className="process-filter-badge--running">Running</span>
                    </span>
                  </DropdownItem>
                ))}
                <div className="process-filter-group-header--divided">All Blends</div>
              </>
            )}
            {nonRunningBlends.map((f) => (
              <DropdownItem key={f.value} value={f.value}>{f.label}</DropdownItem>
            ))}
          </Dropdown>
        </div>
      )}

      {/* ── Blend Run Times */}
      {isMoisture && selections.family && selections.period && runTimes.length > 0 && (
        <div className="process-filter-field--runtimes">
          <label className="process-filter-run-label">
            <Clock className="process-filter-run-label__icon" />
            Blend Run Times
            <span className="process-filter-badge--count">{runTimes.length}</span>
          </label>
          <Dropdown
            value={runTime}
            onValueChange={setRunTime}
            placeholder="All runs in period"
            contentClassName="max-w-[400px]"
          >
            <DropdownItem value="all">
              <span className="process-filter-option-row">
                <span className="process-filter-dot process-filter-dot--primary" />
                All runs in period
              </span>
            </DropdownItem>
            {runTimes.map((r, i) => (
              <DropdownItem key={i} value={formatRun(r)}>
                <span className="process-filter-run-text">{formatRun(r)}</span>
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      )}

      {/* ── Action buttons */}
      <div className="process-filter-actions">
        <button type="button" className="process-filter-btn-reset" onClick={handleReset}>
          Reset
        </button>
        <button type="button" className="process-filter-btn-apply" onClick={handleApply}>
          <Check className="process-filter-btn-apply__icon" />
          Apply
        </button>
      </div>

      {/* ── Date-time range picker modal */}
      {pickerOpen && createPortal(
        <DateTimeRangePicker
          mode={pickerMode}
          initialFrom={pickerInitialFrom}
          initialTo={pickerInitialTo}
          onConfirm={handlePickerConfirm}
          onCancel={handlePickerCancel}
        />,
        document.body
      )}
    </div>
  );
};

export default ProcessFilters;
