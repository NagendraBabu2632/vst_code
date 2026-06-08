import "./FormDropdown.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DropdownOption {
  label: string;
  value: string;
}

interface FormDropdownProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
}

const FormDropdown = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className = "",
}: FormDropdownProps) => (
  <div className={`form-dropdown ${className}`}>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="form-dropdown__trigger" aria-label={label}>
        {label && <span className="form-dropdown__label-prefix">{label}:</span>}
        <SelectValue placeholder={placeholder} className="form-dropdown__value" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default FormDropdown;
