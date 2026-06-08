import "./AssetFilter.css";
import { useMemo, useState } from "react";
import { Filter, ChevronDown, ChevronRight, Search, Factory } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Machine = { id: string; name: string };
type Line = { id: string; name: string; machines: Machine[] };
type Unit = { id: string; name: string; lines: Line[] };

const HIERARCHY: Unit[] = [
  {
    id: "u1",
    name: "Unit 1",
    lines: [
      { id: "u1-l1", name: "Line 1", machines: [{ id: "u1-l1-m1", name: "Compressor A" }, { id: "u1-l1-m2", name: "Dryer B" }] },
      { id: "u1-l2", name: "Line 2", machines: [{ id: "u1-l2-m1", name: "Motor C" }, { id: "u1-l2-m2", name: "Pump E" }] },
    ],
  },
  {
    id: "u2",
    name: "Unit 2",
    lines: [
      { id: "u2-l3", name: "Line 3", machines: [{ id: "u2-l3-m1", name: "Furnace D" }, { id: "u2-l3-m2", name: "Conveyor F" }] },
      { id: "u2-l4", name: "Line 4", machines: [{ id: "u2-l4-m1", name: "Mixer G" }, { id: "u2-l4-m2", name: "Boiler H" }] },
    ],
  },
  {
    id: "pmd",
    name: "PMD",
    lines: [
      { id: "pmd-l1", name: "PMD Line 1", machines: [{ id: "pmd-l1-m1", name: "Press 1" }, { id: "pmd-l1-m2", name: "Press 2" }] },
    ],
  },
  {
    id: "smd",
    name: "SMD",
    lines: [
      { id: "smd-l1", name: "SMD Line 1", machines: [{ id: "smd-l1-m1", name: "Cutter 1" }, { id: "smd-l1-m2", name: "Cutter 2" }] },
    ],
  },
];

interface AssetFilterProps {
  onChange?: (selectedMachineIds: string[]) => void;
}

const AssetFilter = ({ onChange }: AssetFilterProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({ u1: true, u2: true });
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filteredHierarchy = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HIERARCHY;
    return HIERARCHY.map((u) => ({
      ...u,
      lines: u.lines
        .map((l) => ({
          ...l,
          machines: l.machines.filter(
            (m) => m.name.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
          ),
        }))
        .filter((l) => l.machines.length > 0 || l.name.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)),
    })).filter((u) => u.lines.length > 0 || u.name.toLowerCase().includes(q));
  }, [query]);

  const allMachineIdsOfLine = (l: Line) => l.machines.map((m) => m.id);
  const allMachineIdsOfUnit = (u: Unit) => u.lines.flatMap(allMachineIdsOfLine);

  const updateSelection = (next: Set<string>) => {
    setSelected(next);
    onChange?.(Array.from(next));
  };

  const toggleMachine = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    updateSelection(next);
  };

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    updateSelection(next);
  };

  const lineState = (l: Line): "all" | "some" | "none" => {
    const ids = allMachineIdsOfLine(l);
    const sel = ids.filter((id) => selected.has(id)).length;
    if (sel === 0) return "none";
    if (sel === ids.length) return "all";
    return "some";
  };

  const unitState = (u: Unit): "all" | "some" | "none" => {
    const ids = allMachineIdsOfUnit(u);
    const sel = ids.filter((id) => selected.has(id)).length;
    if (sel === 0) return "none";
    if (sel === ids.length) return "all";
    return "some";
  };

  const totalMachines = HIERARCHY.flatMap(allMachineIdsOfUnit).length;
  const summary = selected.size === 0 ? "All Assets" : `${selected.size}/${totalMachines}`;

  const reset = () => updateSelection(new Set());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="asset-filter__trigger">
          <Filter className="asset-filter__trigger-icon" />
          <span className="asset-filter__trigger-label">Asset Filter</span>
          <span className="asset-filter__summary">{summary}</span>
          <ChevronDown className="asset-filter__chevron" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="asset-filter__content">
        {/* Header */}
        <div className="asset-filter__header">
          <div className="asset-filter__header-label">Asset Hierarchy</div>
        </div>

        {/* Search */}
        <div className="asset-filter__search">
          <div className="asset-filter__search-wrapper">
            <Search className="asset-filter__search-icon" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search unit, line or machine..."
              className="asset-filter__search-input"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="asset-filter__tree">
          {filteredHierarchy.map((u) => {
            const uState = unitState(u);
            const uIds = allMachineIdsOfUnit(u);
            const uSelCount = uIds.filter((id) => selected.has(id)).length;
            const uOpen = expandedUnits[u.id] ?? false;
            return (
              <div key={u.id} className="asset-filter__unit">
                {/* Unit row */}
                <div className="asset-filter__unit-row">
                  <button
                    onClick={() => setExpandedUnits((p) => ({ ...p, [u.id]: !uOpen }))}
                    className="asset-filter__expand-btn"
                    aria-label={uOpen ? "Collapse" : "Expand"}
                  >
                    {uOpen
                      ? <ChevronDown className="asset-filter__expand-icon" />
                      : <ChevronRight className="asset-filter__expand-icon" />}
                  </button>
                  <Checkbox
                    checked={uState === "all" ? true : uState === "some" ? "indeterminate" : false}
                    onCheckedChange={(v) => setMany(uIds, !!v)}
                  />
                  <Factory className="asset-filter__factory-icon" />
                  <span className="asset-filter__unit-name">{u.name}</span>
                  <span className="asset-filter__unit-count">
                    {uSelCount}/{uIds.length}
                  </span>
                </div>

                {/* Lines */}
                {uOpen &&
                  u.lines.map((l) => {
                    const lState = lineState(l);
                    const lIds = allMachineIdsOfLine(l);
                    const lSelCount = lIds.filter((id) => selected.has(id)).length;
                    const lOpen = expandedLines[l.id] ?? false;
                    return (
                      <div key={l.id} className="asset-filter__line-group">
                        <div className="asset-filter__line-row">
                          <button
                            onClick={() => setExpandedLines((p) => ({ ...p, [l.id]: !lOpen }))}
                            className="asset-filter__expand-btn"
                            aria-label={lOpen ? "Collapse" : "Expand"}
                          >
                            {lOpen
                              ? <ChevronDown className="asset-filter__expand-icon" />
                              : <ChevronRight className="asset-filter__expand-icon" />}
                          </button>
                          <Checkbox
                            checked={lState === "all" ? true : lState === "some" ? "indeterminate" : false}
                            onCheckedChange={(v) => setMany(lIds, !!v)}
                          />
                          <span className="asset-filter__line-name">{l.name}</span>
                          <span className="asset-filter__line-count">
                            {lSelCount}/{lIds.length}
                          </span>
                        </div>

                        {/* Machines */}
                        {lOpen &&
                          l.machines.map((m) => (
                            <div key={m.id} className="asset-filter__machine-group">
                              <div className="asset-filter__machine-row">
                                <span className="asset-filter__machine-spacer" />
                                <Checkbox
                                  checked={selected.has(m.id)}
                                  onCheckedChange={() => toggleMachine(m.id)}
                                />
                                <span className="asset-filter__machine-name">{m.name}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    );
                  })}
              </div>
            );
          })}
          {filteredHierarchy.length === 0 && (
            <div className="asset-filter__empty">No matches</div>
          )}
        </div>

        {/* Footer */}
        <div className="asset-filter__footer">
          <button onClick={reset} className="asset-filter__reset">
            Reset
          </button>
          <Button size="sm" className="asset-filter__apply" onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AssetFilter;
