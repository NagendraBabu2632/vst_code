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
import {
  fetchProcessAnalysisData,
  fetchMoistureBlendList,
  fetchMoistureTrend,
  selectMoistureBlendList,
  selectMoistureBlendListLoading,
  clearProcessData,
} from "@/redux/slices/processAnalysisSlice";
import type { MoistureBlendRun } from "@/services/api";

const periodOptions = [
  { value: "lastHour",         label: "Last One Hour" },
  { value: "today",            label: "Today" },
  { value: "customLast7",      label: "Custom Date Range (Last 7 Days)" },
  { value: "customHistorical", label: "Custom Date Range (Historical)" },
];

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

const getMoistureEpochRange = (
  period: string,
  dateRangeFrom: string,
  dateRangeTo: string
): { startDate: number; endDate: number } => {
  if (
    (period === "customLast7" || period === "customHistorical") &&
    dateRangeFrom &&
    dateRangeTo
  ) {
    const toMs = (s: string) =>
      new Date(s.includes(" ") ? s.replace(" ", "T") : `${s}T00:00:00`).getTime();
    return { startDate: toMs(dateRangeFrom), endDate: toMs(dateRangeTo) };
  }
  const { start, end } = getPeriodRange(period);
  return { startDate: start.getTime(), endDate: end.getTime() };
};

const formatApiRun = (r: MoistureBlendRun): string => {
  const end = r.isRunning ? "Running…" : (r.endTimeLabel ?? "?");
  return `${r.startTimeLabel} → ${end} (${r.runTime})`;
};

// ── TimeSpinner sub-component ─────────────────────────────────────────────────
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

// ── PeriodSelector ────────────────────────────────────────────────────────────
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
  const dispatch      = useAppDispatch();
  const selections    = useAppSelector(selectDropdownSelections);
  const dropdownData  = useAppSelector(selectDropdownData);
  const blendList     = useAppSelector(selectMoistureBlendList);
  const blendListLoading = useAppSelector(selectMoistureBlendListLoading);

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [pickerMode, setPickerMode]       = useState<"last7" | "historical">("last7");
  const prevPeriodRef                     = useRef<string>(selections.period);

  // Resolve option lists from dropdown data
  const units          = (dropdownData?.common?.units ?? []) as { value: string; label: string }[];
  const unitToLineMap  = (dropdownData?.common?.unitToLineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lines = (
    selections.unit && unitToLineMap[selections.unit]
      ? unitToLineMap[selections.unit]
      : (dropdownData?.common?.lines ?? [])
  ) as { value: string; label: string }[];

  const unitToParamMap  = (dropdownData?.common?.unitToParamMapping  ?? {}) as Record<string, { value: string; label: string }[]>;
  const processParams   = (
    selections.unit && unitToParamMap[selections.unit]
      ? unitToParamMap[selections.unit]
      : (dropdownData?.processAnalysis?.processParameter?.options ?? [])
  ) as { value: string; label: string }[];

  const unitLineToMachineMap = (dropdownData?.common?.unitLineToMachineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lineToMachineMap     = (dropdownData?.common?.lineToMachineMapping     ?? {}) as Record<string, { value: string; label: string }[]>;
  const machineIdMap         = (dropdownData?.common?.machineIdMap             ?? {}) as Record<string, number>;

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

  const firstMachineWithBlends = (lineName: string): string => {
    const list = resolvedMachines(selections.unit, lineName);
    return (
      list.find((m) => (machineToBlendMap[m.value] ?? []).length > 0)?.value ??
      list[0]?.value ?? ""
    );
  };

  const isMoisture = selections.processParameter?.toLowerCase() === "moisture";

  // ── Moisture: derive blend groups and runs from API data
  const runningApiBlends = useMemo(
    () => blendList.filter((g) => g.runs.some((r) => r.isRunning)),
    [blendList]
  );
  const runningApiValues  = useMemo(() => new Set(runningApiBlends.map((g) => g.blendName)), [runningApiBlends]);
  const nonRunningApiBlends = useMemo(
    () => blendList.filter((g) => !runningApiValues.has(g.blendName)),
    [blendList, runningApiValues]
  );

  const selectedBlendGroup = useMemo(
    () => blendList.find((g) => g.blendName === selections.family),
    [blendList, selections.family]
  );
  const apiRuns: MoistureBlendRun[] = selectedBlendGroup?.runs ?? [];

  const set = (key: Parameters<typeof setDropdownSelection>[0]["key"]) =>
    (value: string) => dispatch(setDropdownSelection({ key, value }));

  // Resolved numeric ID for the currently selected machine — used as a stable dep below.
  // Becomes defined only after dropdown master data loads from the API.
  const currentMachineId = machineIdMap[selections.machine];

  // ── Step 1: Fetch blend list whenever Moisture is selected and machine/period change.
  // currentMachineId is in deps so this re-fires once the dropdown master data arrives
  // (machineIdMap starts empty; the effect is skipped until a valid id is available).
  useEffect(() => {
    if (!isMoisture || !currentMachineId) return;
    const { startDate, endDate } = getMoistureEpochRange(
      selections.period, selections.dateRangeFrom, selections.dateRangeTo
    );
    dispatch(fetchMoistureBlendList({ unit: selections.unit, machineId: currentMachineId, startDate, endDate }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMoisture, currentMachineId, selections.machine, selections.unit, selections.period, selections.dateRangeFrom, selections.dateRangeTo]);

  // ── Step 2: After blend list loads, auto-select the first blend if the
  // current selection is missing from the new list.
  useEffect(() => {
    if (blendList.length === 0) return;
    const isCurrentValid = blendList.some((g) => g.blendName === selections.family);
    if (!isCurrentValid) {
      dispatch(setDropdownSelection({ key: "family", value: blendList[0].blendName }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blendList]);

  // ── Step 3: After available runs change (parameter switched to moisture, blend changed,
  // or blend list refreshed), auto-select the first run and immediately load its trend.
  useEffect(() => {
    if (!isMoisture || !currentMachineId || !selections.family || apiRuns.length === 0) {
      setSelectedRunId(null);
      return;
    }
    const firstRun = apiRuns[0];
    setSelectedRunId(firstRun.blendRunId);
    dispatch(fetchMoistureTrend({
      unit: selections.unit,
      machineId: currentMachineId,
      blendName: selections.family,
      blendRunStartTime: firstRun.startTime,
      blendRunEndTime: firstRun.endTime ?? Date.now(),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRuns]);

  // ── Period change handler
  const handlePeriodChange = (v: string) => {
    if (v === "customLast7" || v === "customHistorical") {
      prevPeriodRef.current = selections.period;
      setPickerMode(v === "customLast7" ? "last7" : "historical");
      setPickerOpen(true);
    } else {
      set("period")(v);
    }
  };

  const handlePickerConfirm = (from: string, to: string) => {
    const periodValue = pickerMode === "last7" ? "customLast7" : "customHistorical";
    dispatch(setDropdownSelection({ key: "period",        value: periodValue }));
    dispatch(setDropdownSelection({ key: "dateRangeFrom", value: from }));
    dispatch(setDropdownSelection({ key: "dateRangeTo",   value: to }));
    setPickerOpen(false);
  };

  const handlePickerCancel = () => {
    setPickerOpen(false);
  };

  // ── Apply
  const handleApply = () => {
    if (isMoisture) {
      const machineId = machineIdMap[selections.machine];
      if (!machineId) { toast.error("Machine ID not found — check dropdown data"); return; }
      if (!selections.family) { toast.error("Please select a Blend"); return; }
      if (selectedRunId === null) { toast.error("Please select a Blend Run"); return; }
      const run = apiRuns.find((r) => r.blendRunId === selectedRunId);
      if (!run) { toast.error("Selected run not found — try refreshing"); return; }
      dispatch(fetchMoistureTrend({
        unit: selections.unit,
        machineId,
        blendName: selections.family,
        blendRunStartTime: run.startTime,
        blendRunEndTime: run.endTime ?? Date.now(),
      }));
      toast.success("Loading moisture trend…", {
        description: `${selections.machine} · ${selections.family} · ${run.startTimeLabel}`,
      });
    } else {
      dispatch(fetchProcessAnalysisData(buildProcessPayload(selections)));
      const periodLabel = periodOptions.find((p) => p.value === selections.period)?.label ?? selections.period;
      const rangeLabel  = (selections.period === "customLast7" || selections.period === "customHistorical")
        ? ` · ${selections.dateRangeFrom} → ${selections.dateRangeTo}`
        : "";
      toast.success("Filters applied", {
        description: `${selections.processParameter} · ${periodLabel}${rangeLabel}`,
      });
    }
  };

  // ── Reset
  const handleReset = () => {
    const firstUnit = units[0]?.value ?? "PMD";
    const firstLine = unitToLineMap[firstUnit]?.[0]?.value ?? "";
    const firstMachine = resolvedMachines(firstUnit, firstLine)[0]?.value ?? "";
    set("unit")(firstUnit);
    set("line")(firstLine);
    set("machine")(firstMachine);
    set("family")("");
    set("processParameter")("Humidity");
    set("period")("lastHour");
    dispatch(clearProcessData());
    dispatch(fetchProcessAnalysisData(buildProcessPayload({
      ...selections,
      unit: firstUnit, line: firstLine, machine: firstMachine,
      processParameter: "Humidity", family: "",
    })));
  };

  const pickerMatchesCurrent =
    (pickerMode === "last7"      && selections.period === "customLast7") ||
    (pickerMode === "historical" && selections.period === "customHistorical");

  const pickerInitialFrom = pickerMatchesCurrent && selections.dateRangeFrom
    ? new Date(selections.dateRangeFrom) : undefined;
  const pickerInitialTo   = pickerMatchesCurrent && selections.dateRangeTo
    ? new Date(selections.dateRangeTo)   : undefined;

  return (
    <div className="process-filters">
      {/* ── Asset filters */}
      {[
        {
          label: "Unit Name",
          value: selections.unit,
          setter: (v: string) => {
            const fl = unitToLineMap[v]?.[0]?.value ?? "";
            const fm = resolvedMachines(v, fl)[0]?.value ?? "";
            set("unit")(v);
            set("line")(fl);
            set("machine")(fm);
            set("family")("");
            set("processParameter")(unitToParamMap[v]?.[0]?.value ?? "Humidity");
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
            if (isMoisture) set("family")((machineToBlendMap[fm] ?? [])[0]?.value ?? "");
          },
          opts: lines,
        },
        {
          label: "Machine Name",
          value: selections.machine,
          setter: (v: string) => {
            set("machine")(v);
            if (isMoisture) {
              set("family")((machineToBlendMap[v] ?? [])[0]?.value ?? "");
            }
          },
          opts: machines,
        },
        {
          label: "Parameter Name",
          value: selections.processParameter,
          setter: (v: string) => {
            set("processParameter")(v);
            if (v.toLowerCase() !== "moisture") {
              // Reset to first line/machine and immediately fetch sensor data
              const resetLine = unitToLineMap[selections.unit]?.[0]?.value ?? "";
              const resetMachine = resolvedMachines(selections.unit, resetLine)[0]?.value ?? "";
              set("line")(resetLine);
              set("machine")(resetMachine);
              dispatch(fetchProcessAnalysisData(buildProcessPayload({
                ...selections, processParameter: v, line: resetLine, machine: resetMachine,
              })));
            }
            // For moisture: the blend-list effect (Step 1) fires automatically
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
          <label className="process-filter-label">
            Blend
            {blendListLoading && <span className="process-filter-badge--count">…</span>}
          </label>
          <Dropdown
            value={selections.family}
            onValueChange={(v) => { set("family")(v); setSelectedRunId(null); }}
            placeholder={blendListLoading ? "Loading blends…" : "Select blend…"}
          >
            {/* Running blends */}
            {runningApiBlends.length > 0 && (
              <>
                <div className="process-filter-group-header">Running</div>
                {runningApiBlends.map((g) => (
                  <DropdownItem key={g.blendName} value={g.blendName}>
                    <span className="process-filter-option-row">
                      <span className="process-filter-dot process-filter-dot--success" />
                      {g.blendName}
                      <span className="process-filter-badge--running">Running</span>
                    </span>
                  </DropdownItem>
                ))}
                <div className="process-filter-group-header--divided">All Blends</div>
              </>
            )}
            {nonRunningApiBlends.map((g) => (
              <DropdownItem key={g.blendName} value={g.blendName}>{g.blendName}</DropdownItem>
            ))}
          </Dropdown>
        </div>
      )}

      {/* ── Blend Run — only for Moisture, only when a blend is selected */}
      {isMoisture && selections.family && (
        <div className="process-filter-field--runtimes">
          <label className="process-filter-run-label">
            <Clock className="process-filter-run-label__icon" />
            Blend Run
            {apiRuns.length > 0 && (
              <span className="process-filter-badge--count">{apiRuns.length}</span>
            )}
          </label>
          <Dropdown
            value={selectedRunId !== null ? String(selectedRunId) : ""}
            onValueChange={(v) => setSelectedRunId(Number(v))}
            placeholder={blendListLoading ? "Loading runs…" : "Select a run…"}
            contentClassName="max-w-[420px]"
          >
            {apiRuns.map((r) => (
              <DropdownItem key={r.blendRunId} value={String(r.blendRunId)}>
                <span className="process-filter-run-text">
                  {formatApiRun(r)}
                  {r.isRunning && (
                    <span className="process-filter-badge--running">Running</span>
                  )}
                </span>
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
