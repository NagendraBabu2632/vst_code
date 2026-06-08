import Dropdown from "@/components/Dropdown";

const units = ["Unit 1", "Unit 2", "Unit 3", "PMD", "SMD"];
const lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
const machines = ["Compressor A", "Dryer B", "Motor C", "Furnace D", "Pump E", "Conveyor F"];
const families = ["Family A", "Family B", "Family C", "Family D", "Family E"];
const shifts = ["All Shifts", "Shift A", "Shift B", "Shift C"];

interface FilterConfig {
  label: string;
  placeholder: string;
  options: string[];
}

const filters: FilterConfig[] = [
  { label: "Unit Name", placeholder: "Select…", options: units },
  { label: "Line Name", placeholder: "Select…", options: lines },
  { label: "Machine Name", placeholder: "Select…", options: machines },
  { label: "Family", placeholder: "Select…", options: families },
  { label: "Shift", placeholder: "Select…", options: shifts },
];

const EnergyFilters = () => {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {filters.map((filter) => (
        <div key={filter.label} className="flex flex-col gap-1 min-w-[150px] flex-1 max-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
          <Dropdown placeholder={filter.placeholder} options={filter.options} />
        </div>
      ))}
    </div>
  );
};

export default EnergyFilters;
