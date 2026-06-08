import * as React from "react";
import "./ui.css";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className = "", ...props }, ref) => (
    <textarea
      className={["form-textarea", className].filter(Boolean).join(" ")}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
