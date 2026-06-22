import { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import "./Dropdown.css";

export type DropdownOption =
  | string
  | { value: string; label?: ReactNode; disabled?: boolean };

export interface DropdownProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  options?: DropdownOption[];
  /** If provided, replaces the auto-rendered options. Use DropdownItem inside. */
  children?: ReactNode;
  disabled?: boolean;
}

/**
 * Shared dropdown component built on top of the underlying Select primitives.
 * Centralizes the trigger / value / content boilerplate so pages can stay tidy.
 */
const Dropdown = ({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  triggerClassName,
  contentClassName,
  options,
  children,
  disabled,
}: DropdownProps) => {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("dropdown-trigger h-9 text-sm", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("dropdown-content", contentClassName)}>
        {children ??
          options?.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const l = typeof opt === "string" ? opt : (opt.label ?? opt.value);
            const d = typeof opt === "string" ? false : (opt.disabled ?? false);
            return (
              <SelectItem key={v} value={v} disabled={d}>
                {l}
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
};

export { SelectItem as DropdownItem };
export default Dropdown;
