import "./ProcessFilters.css";
import { useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { Check, Clock } from "lucide-react";
import Dropdown, { DropdownItem } from "@/components/Dropdown";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  setDropdownSelection,
  selectDropdownSelections,
  selectDropdownData,
} from "@/redux/slices/dropdownSlice";

const periodOptions = [
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7",     label: "Last 7 Days" },
  { value: "last30",    label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
];

// Deterministic pseudo-random generator so run-time list is stable per family+period
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
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
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
  const count = period === "today" || period === "yesterday" ? 2 : period === "last7" ? 4 : 6;

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

const ProcessFilters = () => {
  const dispatch = useAppDispatch();
  const selections = useAppSelector(selectDropdownSelections);
  const dropdownData = useAppSelector(selectDropdownData);

  const [runTime, setRunTime] = useState<string>("");

  // Resolve option lists from DROPDOWN_DATA (fall back to static lists)
  const units      = (dropdownData?.common?.units      ?? []) as { value: string; label: string }[];
  const lines      = (dropdownData?.common?.lines      ?? []) as { value: string; label: string }[];
  const machines   = (dropdownData?.common?.machines   ?? []) as { value: string; label: string }[];
  const processParams = (dropdownData?.processAnalysis?.processParameter?.options ?? []) as { value: string; label: string }[];
  const runningFamilies = (dropdownData?.processAnalysis?.familyRunning?.options ?? []) as { value: string; label: string }[];
  const allFamilies     = (dropdownData?.common?.families ?? []) as { value: string; label: string }[];
  const runningValues   = runningFamilies.map((f) => f.value);

  const set = (key: Parameters<typeof setDropdownSelection>[0]["key"]) =>
    (value: string) => dispatch(setDropdownSelection({ key, value }));

  const runTimes = useMemo(
    () => generateRunTimes(selections.family, selections.period),
    [selections.family, selections.period]
  );

  const handleApply = () => {
    if (!selections.family) {
      toast.error("Please select a Family");
      return;
    }
    toast.success("Filters applied", {
      description: `${selections.family} · ${
        periodOptions.find((p) => p.value === selections.period)?.label ?? selections.period
      }${runTime ? ` · ${runTime}` : " · All runs"}`,
    });
  };

  const handleReset = () => {
    set("unit")("all");
    set("line")("all");
    set("machine")("all");
    set("processParameter")(processParams[0]?.value ?? "moistureS1");
    set("family")(allFamilies[0]?.value ?? "all");
    set("period")("last7");
    setRunTime("");
  };

  return (
    <div className="process-filters">
      {/* Asset filters */}
      {[
        { label: "Unit Name",      value: selections.unit,             setter: set("unit"),             opts: units.map((u) => ({ value: u.value, label: u.label })) },
        { label: "Line Name",      value: selections.line,             setter: set("line"),             opts: lines.map((l) => ({ value: l.value, label: l.label })) },
        { label: "Machine Name",   value: selections.machine,          setter: set("machine"),          opts: machines.map((m) => ({ value: m.value, label: m.label })) },
        { label: "Parameter Name", value: selections.processParameter, setter: set("processParameter"), opts: processParams.map((p) => ({ value: p.value, label: p.label })) },
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

      {/* Family */}
      <div className="process-filter-field--family">
        <label className="process-filter-label">Family</label>
        <Dropdown
          value={selections.family}
          onValueChange={(v) => { set("family")(v); setRunTime(""); }}
          placeholder="Select family…"
        >
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
          <div className="process-filter-group-header--divided">All Families</div>
          {allFamilies
            .filter((f) => !runningValues.includes(f.value))
            .map((f) => (
              <DropdownItem key={f.value} value={f.value}>{f.label}</DropdownItem>
            ))}
        </Dropdown>
      </div>

      {/* Period */}
      <div className="process-filter-field--period">
        <label className="process-filter-label">Period</label>
        <Dropdown
          value={selections.period}
          onValueChange={(v) => { set("period")(v); setRunTime(""); }}
          placeholder="Select period…"
          options={periodOptions}
        />
      </div>

      {/* Family Run Times — appears once Family + Period selected */}
      {selections.family && selections.period && runTimes.length > 0 && (
        <div className="process-filter-field--runtimes">
          <label className="process-filter-run-label">
            <Clock className="process-filter-run-label__icon" />
            Family Run Times
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

      {/* Action buttons */}
      <div className="process-filter-actions">
        <button type="button" className="process-filter-btn-reset" onClick={handleReset}>
          Reset
        </button>
        <button type="button" className="process-filter-btn-apply" onClick={handleApply}>
          <Check className="process-filter-btn-apply__icon" />
          Apply
        </button>
      </div>
    </div>
  );
};

export default ProcessFilters;
