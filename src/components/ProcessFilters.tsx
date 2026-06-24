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
  buildProcessPayload,
} from "@/redux/slices/dropdownSlice";
import { fetchProcessAnalysisData } from "@/redux/slices/processAnalysisSlice";

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
  const units = (dropdownData?.common?.units ?? []) as { value: string; label: string }[];

  // Line options cascade from selected unit
  const unitToLineMap = (dropdownData?.common?.unitToLineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lines = (
    selections.unit && unitToLineMap[selections.unit]
      ? unitToLineMap[selections.unit]
      : (dropdownData?.common?.lines ?? [])
  ) as { value: string; label: string }[];

  // Parameter options cascade from selected unit
  const unitToParamMap = (dropdownData?.common?.unitToParamMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const processParams = (
    selections.unit && unitToParamMap[selections.unit]
      ? unitToParamMap[selections.unit]
      : (dropdownData?.processAnalysis?.processParameter?.options ?? [])
  ) as { value: string; label: string }[];

  // Machine options cascade from selected unit + line (unit-aware)
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

  // Blend options cascade from selected machine
  const machineToBlendMap = (dropdownData?.common?.machineToBlendMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const machineBlends = (
    selections.machine && machineToBlendMap[selections.machine]?.length
      ? machineToBlendMap[selections.machine]
      : (dropdownData?.common?.families ?? [])
  ) as { value: string; label: string }[];

  // Helper: first machine in a line that has blends
  const firstMachineWithBlends = (lineName: string): string => {
    const list = resolvedMachines(selections.unit, lineName);
    return (
      list.find((m) => (machineToBlendMap[m.value] ?? []).length > 0)?.value ??
      list[0]?.value ?? ""
    );
  };

  // Running blends — only those available for the selected machine
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

  const handleApply = () => {
    if (selections.unit !== "SMD" && !selections.family) {
      toast.error("Please select a Blend");
      return;
    }
    dispatch(fetchProcessAnalysisData(buildProcessPayload(selections)));
    toast.success("Filters applied", {
      description: `${selections.machine} · ${selections.family || "—"} · ${
        periodOptions.find((p) => p.value === selections.period)?.label ?? selections.period
      }${runTime ? ` · ${runTime}` : " · All runs"}`,
    });
  };

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
    set("period")("last7");
    setRunTime("");
  };

  return (
    <div className="process-filters">
      {/* Asset filters */}
      {[
        { label: "Unit Name",      value: selections.unit,  setter: (v: string) => { const fl = unitToLineMap[v]?.[0]?.value ?? ""; const fm = firstMachineWithBlends(fl); set("unit")(v); set("line")(fl); set("machine")(fm); set("family")((machineToBlendMap[fm] ?? [])[0]?.value ?? ""); set("processParameter")(unitToParamMap[v]?.[0]?.value ?? "Moisture"); }, opts: units.map((u) => ({ value: u.value, label: u.label })) },
        { label: "Line Name",      value: selections.line,  setter: (v: string) => { const fm = firstMachineWithBlends(v); set("line")(v); set("machine")(fm); set("family")((machineToBlendMap[fm] ?? [])[0]?.value ?? ""); }, opts: lines.map((l) => ({ value: l.value, label: l.label })) },
        { label: "Machine Name",   value: selections.machine, setter: (v: string) => { set("machine")(v); set("family")((machineToBlendMap[v] ?? [])[0]?.value ?? ""); setRunTime(""); }, opts: machines.map((m) => ({ value: m.value, label: m.label })) },
        { label: "Parameter Name", value: selections.processParameter, setter: (v: string) => { set("processParameter")(v); dispatch(fetchProcessAnalysisData(buildProcessPayload({ ...selections, processParameter: v }))); }, opts: processParams.map((p) => ({ value: p.value, label: p.label })) },
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

      {/* Blend — hidden for SMD unit */}
      {selections.unit !== "SMD" && (
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

      {/* Family Run Times — hidden for SMD unit, appears once Family + Period selected */}
      {selections.unit !== "SMD" && selections.family && selections.period && runTimes.length > 0 && (
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
