import "./ExecutiveFilter.css";
import { useState } from "react";
import { format, getWeeksInMonth, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Dropdown, { DropdownItem } from "@/components/Dropdown";

export type ExecMode = "day" | "week" | "month";

export interface ExecFilterValue {
  mode: ExecMode;
  date: Date;          // for day
  shifts: string[];    // for day (Shift A/B/C/Daily)
  week: string;        // for week (W1..W5)
  month: string;       // for month (yyyy-MM)
}

interface Props {
  value: ExecFilterValue;
  onChange: (v: ExecFilterValue) => void;
}

const SHIFTS = [
  { id: "A", label: "Shift A", time: "06:00 - 14:00" },
  { id: "B", label: "Shift B", time: "14:00 - 22:00" },
  { id: "C", label: "Shift C", time: "22:00 - 06:00" },
  { id: "D", label: "Daily",   time: "06:00 - 06:00" },
];

const TABS: { value: ExecMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const monthOptions = (() => {
  const out: { value: string; label: string }[] = [];
  const base = new Date();
  for (let i = -11; i <= 0; i++) {
    const d = addMonths(base, i);
    out.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM-yyyy") });
  }
  return out.reverse();
})();

const ExecutiveFilter = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  const setMode = (mode: ExecMode) => onChange({ ...value, mode });

  const toggleShift = (id: string) => {
    const has = value.shifts.includes(id);
    onChange({
      ...value,
      shifts: has ? value.shifts.filter((s) => s !== id) : [...value.shifts, id],
    });
  };

  const weekCount = getWeeksInMonth(value.date, { weekStartsOn: 1 });
  const weekOptions = Array.from({ length: weekCount }, (_, i) => `W${i + 1}`);

  const renderTrigger = () => {
    if (value.mode === "day") {
      const shiftLabel =
        value.shifts.length === 0
          ? "No shift"
          : value.shifts.length === SHIFTS.length
          ? "All shifts"
          : value.shifts.map((s) => (s === "D" ? "Daily" : `Shift ${s}`)).join(", ");
      return (
        <button className="exec-filter__trigger">
          <span className="exec-filter__trigger-inner">
            <CalendarIcon className="exec-filter__trigger-icon" />
            {format(value.date, "dd/MM/yyyy")}
            <span className="exec-filter__trigger-sep">·</span>
            <span className="exec-filter__trigger-shift">{shiftLabel}</span>
          </span>
          <ChevronDown className="exec-filter__trigger-chevron" />
        </button>
      );
    }
    if (value.mode === "week") {
      return null;
    }
    return null;
  };

  return (
    <div className="exec-filter">
      {/* Tabs */}
      <div className="exec-filter__tabs-group">
        <label className="exec-filter__label">Period</label>
        <div className="exec-filter__tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className={
                "exec-filter__tab" +
                (value.mode === t.value ? " exec-filter__tab--active" : "")
              }
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

        {value.mode === "day" && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="exec-filter__popover-body">
                {/* Calendar */}
                <div className="exec-filter__calendar-side">
                  <Calendar
                    mode="single"
                    selected={value.date}
                    onSelect={(d) => d && onChange({ ...value, date: d })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </div>
                {/* Shifts */}
                <div className="exec-filter__shifts">
                  <div className="exec-filter__shifts-title">Shift</div>
                  <div className="exec-filter__shift-list">
                    {SHIFTS.map((s) => {
                      const checked = value.shifts.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="exec-filter__shift-row"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleShift(s.id)}
                          />
                          <span className="exec-filter__shift-name">{s.label}</span>
                          <span className="exec-filter__shift-time">{s.time}</span>
                          <span className="exec-filter__shift-asterisk">*</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {value.mode === "week" && (
          <div className="exec-filter__week-row">
            {/* Month picker for context */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="exec-filter__month-trigger">
                  <CalendarIcon className="exec-filter__month-trigger-icon" />
                  {format(value.date, "MMM yyyy")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="exec-filter__month-nav">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...value, date: subMonths(value.date, 1) })}
                  >
                    ‹
                  </Button>
                  <span className="exec-filter__month-nav-name">
                    {format(value.date, "MMMM yyyy")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...value, date: addMonths(value.date, 1) })}
                  >
                    ›
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Dropdown
              value={value.week}
              onValueChange={(v) => onChange({ ...value, week: v })}
              placeholder="Select week"
              triggerClassName="w-[140px]"
            >
              {weekOptions.map((w, i) => {
                const monthStart = startOfMonth(value.date);
                const monthEnd = endOfMonth(value.date);
                return (
                  <DropdownItem key={w} value={w}>
                    <span className="exec-filter__week-item">
                      <span className="exec-filter__week-label">{w}</span>
                      <span className="exec-filter__week-range">
                        {format(monthStart, "MMM")} {i * 7 + 1}–
                        {Math.min((i + 1) * 7, monthEnd.getDate())}
                      </span>
                    </span>
                  </DropdownItem>
                );
              })}
            </Dropdown>
          </div>
        )}

        {value.mode === "month" && (
          <Dropdown
            value={value.month}
            onValueChange={(v) => onChange({ ...value, month: v })}
            placeholder="Select month"
            triggerClassName="w-[200px]"
            options={monthOptions.map((m) => ({ value: m.value, label: m.label }))}
          />
        )}
      </div>
    </div>
  );
};

export default ExecutiveFilter;
