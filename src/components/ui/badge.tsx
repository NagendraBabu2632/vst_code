import * as React from "react";
import "./ui.css";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={["badge", `badge--${variant}`, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export { Badge };
