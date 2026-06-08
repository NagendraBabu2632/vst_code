import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import "./ui.css";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
type Size = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const variantClass = `btn--${variant}`;
    const sizeClass = size !== "default" ? `btn--${size}` : "";
    return (
      <Comp
        ref={ref}
        className={["btn", variantClass, sizeClass, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
export default Button;
