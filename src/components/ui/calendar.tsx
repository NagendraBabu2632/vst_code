import * as React from "react";
import { DayPicker } from "react-day-picker";
import "./ui.css";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className = "", showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={["calendar-wrapper", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export { Calendar };
