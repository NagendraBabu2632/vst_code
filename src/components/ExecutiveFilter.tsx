import "./ExecutiveFilter.css";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Dropdown from "@/components/Dropdown";

export type ExecMode = "day" | "week" | "month";

export interface WeekOption {
  id: number;
  year: number;
  week: string;           // "W25"
  weekStartDate: string;  // "2026-06-15"
  weekEndDate: string;    // "2026-06-21"
  isCurrent: boolean;
}

export interface MonthOption {
  id: number;
  year: number;
  month: string;          // "Jun"
  monthStartDate: string; // "2026-06-01"
  monthEndDate: string;   // "2026-06-30"
  isCurrent: boolean;
}

export interface ExecFilterValue {
  mode: ExecMode;
  date: Date;           // for day mode
  shifts: string[];     // for day mode  (A/B/C/D)
  week: string;         // weekStartDate from API e.g. "2026-06-15"
  weekEnd: string;      // weekEndDate from API e.g. "2026-06-21"
  month: string;        // monthStartDate from API e.g. "2026-06-01"
  monthEnd: string;     // monthEndDate from API e.g. "2026-06-30"
}

interface Props {
  value: ExecFilterValue;
  onChange: (v: ExecFilterValue) => void;
  weeks?: WeekOption[];
  months?: MonthOption[];
}

const SHIFTS = [
  { id: "A", label: "Shift A", time: "07:00 - 15:30" },
  { id: "B", label: "Shift B", time: "15:30 - 23:00" },
  { id: "C", label: "Shift C", time: "23:00 - 07:00" },
  { id: "D", label: "Daily",   time: "07:00 - 07:00" },
];

const TABS: { value: ExecMode; label: string }[] = [
  { value: "day",   label: "Day"   },
  { value: "week",  label: "Week"  },
  { value: "month", label: "Month" },
];

/** Returns the shift id that is currently active based on wall-clock time. */
function getCurrentShiftId(): string {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  if (total >= 420 && total < 930)  return "A"; // 07:00–15:30
  if (total >= 930 && total < 1380) return "B"; // 15:30–23:00
  return "C";                                    // 23:00–07:00
}

const ExecutiveFilter = ({ value, onChange, weeks = [], months = [] }: Props) => {
  const [open, setOpen] = useState(false);

  // Pending state — local to the popover; only committed on Submit
  const [pendingDate,   setPendingDate]   = useState<Date>(value.date);
  const [pendingShifts, setPendingShifts] = useState<string[]>(value.shifts);

  const currentShiftId = getCurrentShiftId();

  // When the popover opens, reset pending to the last committed value
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setPendingDate(value.date);
      setPendingShifts(value.shifts);
    }
    setOpen(nextOpen);
  };

  const setMode = (mode: ExecMode) => onChange({ ...value, mode });

  const toggleShift = (id: string) => {
    setPendingShifts((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      // Daily ↔ Shift A/B/C are mutually exclusive
      const cleared = id === "D"
        ? prev.filter((s) => s === "D")
        : prev.filter((s) => s !== "D");
      return [...cleared, id];
    });
  };

  const handleSubmit = () => {
    const finalShifts = pendingShifts.length === 0 ? ["D"] : pendingShifts;
    onChange({ ...value, date: pendingDate, shifts: finalShifts });
    setOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Week dropdown options from API — ascending order (W1 at top) ────
  const weekOptions = [...weeks]
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
    .map((w) => ({
      value: w.weekStartDate,
      label: `${w.week}  ·  ${format(parseISO(w.weekStartDate), "MMM d")}–${format(parseISO(w.weekEndDate), "MMM d, yyyy")}`,
      disabled: parseISO(w.weekStartDate) > today,
    }));

  // ── Month dropdown options from API — ascending order ───────────────
  const monthOptions = [...months]
    .sort((a, b) => a.monthStartDate.localeCompare(b.monthStartDate))
    .map((m) => ({
      value: m.monthStartDate,
      label: `${m.month} ${m.year}`,
      disabled: parseISO(m.monthStartDate) > today,
    }));

  const renderDayTrigger = () => {
    const shiftLabel =
      value.shifts.length === 0
        ? "No shift"
        : value.shifts.length === SHIFTS.length
        ? "All shifts"
        : value.shifts.map((s) => (s === "D" ? "Daily" : `Shift ${s}`)).join(", ");
    return (
      <button type="button" className="exec-filter__trigger">
        <span className="exec-filter__trigger-inner">
          <CalendarIcon className="exec-filter__trigger-icon" />
          {format(value.date, "dd/MM/yyyy")}
          <span className="exec-filter__trigger-sep">·</span>
          <span className="exec-filter__trigger-shift">{shiftLabel}</span>
        </span>
        <ChevronDown className="exec-filter__trigger-chevron" />
      </button>
    );
  };

  return (
    <div className="exec-filter">
      {/* Period tabs */}
      <div className="exec-filter__tabs-group">
        <label className="exec-filter__label">Period</label>
        <div className="exec-filter__tabs">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setMode(t.value)}
              className={"exec-filter__tab" + (value.mode === t.value ? " exec-filter__tab--active" : "")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic filter */}
      <div className="exec-filter__control-group">
        <label className="exec-filter__label">
          {value.mode === "day" ? "Date & Shift" : value.mode === "week" ? "Week" : "Month"}
        </label>

        {/* ── Day mode ── */}
        {value.mode === "day" && (
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>{renderDayTrigger()}</PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="exec-filter__popover-body">
                {/* Calendar — updates pending date only */}
                <div className="exec-filter__calendar-side">
                  <Calendar
                    mode="single"
                    selected={pendingDate}
                    onSelect={(d) => d && setPendingDate(d)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </div>

                {/* Shifts + Submit */}
                <div className="exec-filter__shifts">
                  <div className="exec-filter__shifts-title">Shift</div>
                  <div className="exec-filter__shift-list">
                    {SHIFTS.map((s) => {
                      const checked = pendingShifts.includes(s.id);
                      const isCurrent = s.id === currentShiftId;
                      return (
                        <label key={s.id} className="exec-filter__shift-row">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleShift(s.id)}
                          />
                          <span className="exec-filter__shift-name">{s.label}</span>
                          <span className="exec-filter__shift-time">{s.time}</span>
                          {isCurrent && (
                            <span className="exec-filter__shift-asterisk">*</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <button type="button" className="exec-filter__submit-btn" onClick={handleSubmit}>
                    Submit
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* ── Week mode — single dropdown from API ── */}
        {value.mode === "week" && (
          <Dropdown
            value={value.week}
            onValueChange={(v) => {
              const sel = weeks.find((w) => w.weekStartDate === v);
              onChange({ ...value, week: v, weekEnd: sel?.weekEndDate ?? "" });
            }}
            placeholder={weeks.length ? "Select week" : "Loading weeks…"}
            triggerClassName="exec-filter__week-dropdown"
            options={weekOptions}
          />
        )}

        {/* ── Month mode ── */}
        {value.mode === "month" && (
          <Dropdown
            value={value.month}
            onValueChange={(v) => {
              const sel = months.find((m) => m.monthStartDate === v);
              onChange({ ...value, month: v, monthEnd: sel?.monthEndDate ?? "" });
            }}
            placeholder={months.length ? "Select month" : "Loading months…"}
            triggerClassName="exec-filter__week-dropdown"
            options={monthOptions}
          />
        )}
      </div>
    </div>
  );
};

export default ExecutiveFilter;
