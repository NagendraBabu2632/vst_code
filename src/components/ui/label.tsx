import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import "./ui.css";

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className = "", ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={["form-label", className].filter(Boolean).join(" ")}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
