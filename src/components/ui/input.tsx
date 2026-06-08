import * as React from "react";
import "./ui.css";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className = "", type, ...props }, ref) => (
    <input
      type={type}
      className={["form-input", className].filter(Boolean).join(" ")}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
