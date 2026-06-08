import { useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Dropdown from "@/components/Dropdown";

export type FilterMode = "hour" | "day" | "week" | "month";

interface DashboardDateFilterProps {
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DashboardDateFilter = ({ mode, onModeChange, selectedDate, onDateChange }: DashboardDateFilterProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getDateLabel = () => {
    switch (mode) {
      case "hour":
        return "Last 1 Hour";
      case "day":
        return format(selectedDate, "dd MMM yyyy");
      case "week": {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
      }
      case "month":
        return format(selectedDate, "MMMM yyyy");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        value={mode}
        onValueChange={(v) => onModeChange(v as FilterMode)}
        triggerClassName="w-[120px]"
        options={[
          { value: "hour", label: "Last 1 Hour" },
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
      />

      {mode !== "hour" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("h-9 justify-start text-left font-normal text-sm gap-2 min-w-[180px]")}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {getDateLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default DashboardDateFilter;
