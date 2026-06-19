// Single source of truth for all dropdown options across the application
// Derived from the canonical JSON format below.

// ─── Raw JSON (new format) ─────────────────────────────────────────────────────
const RAW = {
  units: [
    { id: 1, name: "PMD" },
    { id: 2, name: "SMD" },
  ],
  lines: [
    { id: 1, name: "Line Lamina" },
    { id: 2, name: "Line Stem" },
    { id: 3, name: "Line All" },
  ],
  machines: [
    { id: 1,  name: "Machine All" },
    { id: 2,  name: "DCC EXIT" },
    { id: 3,  name: "Lamina Infeed" },
    { id: 4,  name: "Lamina Exit" },
    { id: 5,  name: "ADDMoist" },
    { id: 6,  name: "CRS Infeed" },
    { id: 7,  name: "CRS Exit" },
    { id: 8,  name: "Flaour Cylinder EXIT" },
    { id: 9,  name: "Product Bin" },
  ],
  parameters: [
    { id: 1, name: "Moisture" },
    { id: 2, name: "Temperature" },
    { id: 3, name: "Humidity" },
  ],
  blends: [
    { id: 1,  name: "CFT",   family: "CHARMINAR FAMILY" },
    { id: 2,  name: "CSV",   family: "CHARMS FAMILY" },
    { id: 3,  name: "CVF",   family: "CHARMS FAMILY" },
    { id: 4,  name: "CMK",   family: "CHARMS FAMILY" },
    { id: 5,  name: "CVG",   family: "CHARMS FAMILY" },
    { id: 6,  name: "TRT",   family: "TRT/ZFT FAMILY" },
    { id: 7,  name: "ZFT",   family: "TRT/ZFT FAMILY" },
    { id: 8,  name: "TRL",   family: "TRT/ZFT FAMILY" },
    { id: 9,  name: "ETR",   family: "ETR FAMILY" },
    { id: 10, name: "CSF",   family: "CSF FAMILY" },
    { id: 11, name: "CSF64", family: "CSF FAMILY" },
    { id: 12, name: "SER",   family: "SES FAMILY" },
    { id: 13, name: "MTR",   family: "SES FAMILY" },
    { id: 14, name: "SES",   family: "SES FAMILY" },
    { id: 15, name: "TTL",   family: "TOTAL FAMILY" },
    { id: 16, name: "TTN",   family: "TOTAL FAMILY" },
    { id: 17, name: "TTLNB", family: "TOTAL FAMILY" },
    { id: 18, name: "TAM",   family: "TOTAL FAMILY" },
    { id: 19, name: "MTU",   family: "MTU FAMILY" },
    { id: 20, name: "MRD",   family: "MRD FAMILY" },
    { id: 21, name: "ESP",   family: "EDITION FAMILY" },
    { id: 22, name: "ESO",   family: "ESO FAMILY" },
    { id: 23, name: "T3",    family: "ESO FAMILY" },
  ],
  // hierarchy drives all cascade/dependency logic: unit → line → machine → [parameters]
  hierarchy: {
    PMD: {
      "Line Lamina": {
        "DCC EXIT":      ["Moisture"],
        "Lamina Infeed": ["Moisture"],
        "Lamina Exit":   ["Moisture"],
      },
      "Line Stem": {
        "ADDMoist":  ["Moisture"],
        "CRS Infeed": ["Moisture"],
        "CRS Exit":   ["Moisture"],
      },
      "Line All": {
        "Machine All":          ["Temperature", "Humidity"],
        "Flaour Cylinder EXIT": ["Moisture"],
        "Product Bin":          ["Moisture"],
      },
    },
    SMD: {
      "Line All": {
        "Machine All": ["Temperature", "Humidity"],
      },
    },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const toOpt  = (name) => ({ value: name, label: name });
const PARAM_META = { Moisture: "%", Temperature: "°C", Humidity: "%RH" };
const toParamOpt = (name) => ({ value: name, label: name, unit: PARAM_META[name] ?? "" });

// ─── Flat option lists (used in page-specific dropdown config below) ───────────
const UNITS      = RAW.units.map((u) => toOpt(u.name));
const LINES      = RAW.lines.map((l) => toOpt(l.name));
const MACHINES   = RAW.machines.map((m) => toOpt(m.name));
const PARAMETERS = RAW.parameters.map((p) => toParamOpt(p.name));
const ALL_BLENDS = RAW.blends.map((b) => ({ value: b.name, label: b.name }));

// ─── Cascade mappings derived from hierarchy ───────────────────────────────────

// Unit → Lines
const unitToLineMapping = Object.fromEntries(
  Object.entries(RAW.hierarchy).map(([unit, lines]) => [
    unit,
    Object.keys(lines).map(toOpt),
  ])
);

// Line → Machines (flat union across all units — used by components that only know the line)
const lineToMachineMapping = (() => {
  const map = {};
  for (const lines of Object.values(RAW.hierarchy)) {
    for (const [line, machines] of Object.entries(lines)) {
      if (!map[line]) map[line] = [];
      for (const machineName of Object.keys(machines)) {
        if (!map[line].some((m) => m.value === machineName)) {
          map[line].push(toOpt(machineName));
        }
      }
    }
  }
  return map;
})();

// Unit + Line → Machines (hierarchy-aware; key = "UNIT:LINE")
const unitLineToMachineMapping = (() => {
  const map = {};
  for (const [unit, lines] of Object.entries(RAW.hierarchy)) {
    for (const [line, machines] of Object.entries(lines)) {
      map[`${unit}:${line}`] = Object.keys(machines).map(toOpt);
    }
  }
  return map;
})();

// Unit → Parameters (collected from all machines in that unit)
const unitToParamMapping = (() => {
  const map = {};
  for (const [unit, lines] of Object.entries(RAW.hierarchy)) {
    const seen = new Set();
    for (const machines of Object.values(lines)) {
      for (const params of Object.values(machines)) {
        params.forEach((p) => seen.add(p));
      }
    }
    map[unit] = [...seen].map(toParamOpt);
  }
  return map;
})();

// Machine → Blends (all machines carry the full blend list)
const machineToBlendMapping = Object.fromEntries(
  RAW.machines.map((m) => [m.name, [...ALL_BLENDS]])
);

// Asset hierarchy tree (unit → line → machine)
const assetHierarchy = Object.entries(RAW.hierarchy).map(([unit, lines]) => ({
  id: unit, label: unit,
  lines: Object.entries(lines).map(([line, machines]) => ({
    id: line, label: line,
    machines: Object.keys(machines).map((m) => ({ id: m, label: m })),
  })),
}));

// ─── DROPDOWN_DATA export ──────────────────────────────────────────────────────
const DROPDOWN_DATA = {

  // ─────────────────────────────────────────────
  // SHARED — reused across multiple pages
  // ─────────────────────────────────────────────
  common: {
    units:      UNITS,
    lines:      LINES,
    machines:   MACHINES,
    families:   ALL_BLENDS,
    parameters: PARAMETERS,

    shifts: [
      { value: "all",    label: "All Shifts", time: "" },
      { value: "shiftA", label: "Shift A",    time: "07:00 – 15:30" },
      { value: "shiftB", label: "Shift B",    time: "15:30 – 23:00" },
      { value: "shiftC", label: "Shift C",    time: "23:00 – 07:00" },
      { value: "daily",  label: "Daily",      time: "07:00 – 07:00" },
    ],

    severity: [
      { value: "all",      label: "All",      color: "#6b7280" },
      { value: "critical", label: "Critical", color: "#ef4444" },
      { value: "warning",  label: "Warning",  color: "#f59e0b" },
      { value: "normal",   label: "Normal",   color: "#10b981" },
      { value: "info",     label: "Info",     color: "#3b82f6" },
    ],

    alertStatus: [
      { value: "all",          label: "All" },
      { value: "active",       label: "Active" },
      { value: "acknowledged", label: "Acknowledged" },
    ],

    // ── Cascade dependency mappings ────────────────────────────────────────────
    unitToLineMapping,
    lineToMachineMapping,
    unitLineToMachineMapping,   // hierarchy-aware: key = "UNIT:LINE"
    unitToParamMapping,
    machineToBlendMapping,
    assetHierarchy,
  },

  // ─────────────────────────────────────────────
  // 1. EXECUTIVE SUMMARY
  // ─────────────────────────────────────────────
  executiveSummary: {
    dateMode: {
      id: "date-mode", label: "Date Range", default: "day",
      options: [
        { value: "hour",  label: "Last 1 Hour" },
        { value: "day",   label: "Day" },
        { value: "week",  label: "Week" },
        { value: "month", label: "Month" },
      ],
    },
    period: {
      id: "period", label: "Period", type: "tabs", default: "day",
      options: [
        { value: "day",   label: "Day" },
        { value: "week",  label: "Week" },
        { value: "month", label: "Month" },
      ],
    },
    week: {
      id: "week", label: "Week", default: "W1",
      note: "Visible only when period = Week",
      options: [
        { value: "W1", label: "W1" },
        { value: "W2", label: "W2" },
        { value: "W3", label: "W3" },
        { value: "W4", label: "W4" },
        { value: "W5", label: "W5" },
      ],
    },
    unit:      { id: "unit",      label: "Unit",      default: "all", options: "→ common.units" },
    line:      { id: "line",      label: "Line",      default: "all", options: "→ common.lines" },
    machine:   { id: "machine",   label: "Machine",   default: "all", options: "→ common.machines" },
    parameter: { id: "parameter", label: "Parameter", default: "all", options: "→ common.parameters" },
    family:    { id: "family",    label: "Family",    default: "all", options: "→ common.families" },
    shift:     { id: "shift",     label: "Shift",     default: "all", options: "→ common.shifts" },
  },

  // ─────────────────────────────────────────────
  // 2. ENERGY MONITORING
  // ─────────────────────────────────────────────
  energyMonitoring: {
    unit:    { id: "unit",    label: "Unit Name",    default: "all", options: "→ common.units" },
    line:    { id: "line",    label: "Line Name",    default: "all", options: "→ common.lines" },
    machine: { id: "machine", label: "Machine Name", default: "all", options: "→ common.machines" },
    family:  { id: "family",  label: "Family",       default: "all", options: "→ common.families" },
    shift:   { id: "shift",   label: "Shift",        default: "all", options: "→ common.shifts" },
  },

  // ─────────────────────────────────────────────
  // 3. PROCESS ANALYSIS
  // ─────────────────────────────────────────────
  // processAnalysis: {
  //   unit:    { id: "unit",    label: "Unit Name",    default: "all", options: "→ common.units" },
  //   line:    { id: "line",    label: "Line Name",    default: "all", options: "→ common.lines" },
  //   machine: { id: "machine", label: "Machine Name", default: "all", options: "→ common.machines" },
  //   processParameter: {
  //     id: "process-parameter", label: "Parameter Name", default: "Moisture",
  //     options: [
  //       { value: "Moisture",    label: "Moisture" },
  //       { value: "Humidity",    label: "Humidity" },
  //       { value: "Temperature", label: "Temperature" },
  //     ],
  //   },
  //   blendRunning: {
  //     id: "blend-running", label: "Blend (Running)", default: "CFT",
  //     note: "Subset of machineToBlendMapping[selectedMachine] that are currently running",
  //     options: [
  //       { value: "CFT", label: "CFT" },
  //       { value: "CMK", label: "CMK" },
  //       { value: "CSF", label: "CSF" },
  //     ],
  //   },
  //   blend: {
  //     id: "blend", label: "Blend", default: "CFT",
  //     note: "Options derived from common.machineToBlendMapping[selectedMachine]",
  //     options: "→ common.machineToBlendMapping[selectedMachine]",
  //   },
  //   period: {
  //     id: "period", label: "Period", default: "today",
  //     options: [
  //       { value: "today",     label: "Today" },
  //       { value: "yesterday", label: "Yesterday" },
  //       { value: "last7",     label: "Last 7 Days" },
  //       { value: "last30",    label: "Last 30 Days" },
  //       { value: "thisMonth", label: "This Month" },
  //     ],
  //   },
  //   blendRun: {
  //     id: "blend-run", label: "Blend Run", default: "allRuns",
  //     note: "Run timestamps generated dynamically based on selected blend + period",
  //     options: [
  //       { value: "allRuns", label: "All runs in period" },
  //     ],
  //   },
  // },

  // ─────────────────────────────────────────────
  // 4. ALERTS
  // ─────────────────────────────────────────────
  alertsPage: {
    unit: {
      id: "unit", label: "Unit", default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "PMD", label: "PMD" },
        { value: "SMD", label: "SMD" },
      ],
    },
    line:    { id: "line",    label: "Line",    default: "all", options: "→ common.lines" },
    machine: { id: "machine", label: "Machine", default: "all", options: "→ common.machines" },
    parameter: {
      id: "parameter", label: "Parameter", default: "all",
      options: [
        { value: "all",         label: "All" },
        { value: "Moisture",    label: "Moisture" },
        { value: "Humidity",    label: "Humidity" },
        { value: "Temperature", label: "Temperature" },
      ],
    },
    period: {
      id: "period", label: "Period", default: "last24h",
      options: [
        { value: "last1h",  label: "Last One Hour" },
        { value: "last24h", label: "Last 24 Hours" },
        { value: "last1m",  label: "Last One Month" },
      ],
    },
    status:   { id: "status",   label: "Status",   default: "all", options: "→ common.alertStatus" },
    severity: {
      id: "severity", label: "Severity", type: "tabs", default: "all",
      options: [
        { value: "all",      label: "All" },
        { value: "critical", label: "Critical" },
        { value: "warning",  label: "Warning" },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // 5. REPORTS
  // ─────────────────────────────────────────────
  reportsPage: {
    unit:      { id: "unit",      label: "Unit",      default: "all", options: "→ common.units" },
    line:      { id: "line",      label: "Line",      default: "all", options: "→ common.lines" },
    machine:   { id: "machine",   label: "Machine",   default: "all", options: "→ common.machines" },
    parameter: { id: "parameter", label: "Parameter", default: "all", options: "→ common.parameters" },
    family:    { id: "family",    label: "Family",    default: "all", options: "→ common.families" },
    shift:     { id: "shift",     label: "Shift",     default: "all", options: "→ common.shifts" },
    period: {
      id: "period", label: "Period", default: "today",
      options: [
        { value: "today",     label: "Today" },
        { value: "yesterday", label: "Yesterday" },
        { value: "7days",     label: "Last 7 Days" },
        { value: "30days",    label: "Last 30 Days" },
        { value: "month",     label: "This Month" },
        { value: "custom",    label: "Custom Range" },
      ],
    },
    reportType: {
      id: "report-type", label: "Report Type", type: "tabs", default: "energy",
      options: [
        { value: "energy",     label: "Energy Reports" },
        { value: "process",    label: "Process (SPC) Reports" },
        { value: "alerts",     label: "Alerts Reports" },
        { value: "production", label: "Production Reports" },
      ],
    },
    exportFormat: {
      id: "export-format", label: "Export Format", default: "pdf",
      options: [
        { value: "pdf",   label: "PDF" },
        { value: "excel", label: "Excel" },
        { value: "csv",   label: "CSV" },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // 6. SETTINGS
  // ─────────────────────────────────────────────
  settingsPage: {
    // General
    timezone: {
      id: "timezone", label: "Timezone", section: "general", default: "Asia/Kolkata",
      options: [
        { value: "Asia/Kolkata",  label: "Asia/Kolkata (IST)" },
        { value: "UTC",           label: "UTC" },
        { value: "Asia/Dubai",    label: "Asia/Dubai (GST)" },
        { value: "Europe/London", label: "Europe/London (GMT)" },
      ],
    },
    language: {
      id: "language", label: "Language", section: "general", default: "en",
      options: [
        { value: "en", label: "English" },
        { value: "hi", label: "Hindi" },
        { value: "te", label: "Telugu" },
      ],
    },
    // Display
    theme: {
      id: "theme", label: "Theme", section: "display", default: "light",
      options: [
        { value: "light",  label: "Light" },
        { value: "dark",   label: "Dark" },
        { value: "system", label: "System Default" },
      ],
    },
    dataRefresh: {
      id: "data-refresh", label: "Auto-Refresh Interval", section: "display", default: "30s",
      options: [
        { value: "15s", label: "Every 15 seconds" },
        { value: "30s", label: "Every 30 seconds" },
        { value: "1m",  label: "Every 1 minute" },
        { value: "5m",  label: "Every 5 minutes" },
        { value: "off", label: "Off" },
      ],
    },
    decimalPlaces: {
      id: "decimal-places", label: "Decimal Places", section: "display", default: "2",
      options: [
        { value: "0", label: "0" },
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
      ],
    },
    // Tariff
    tariffType: {
      id: "tariff-type", label: "Tariff Type", section: "tariff", default: "fixed",
      options: [
        { value: "fixed", label: "Fixed" },
        { value: "slab",  label: "Slab-based" },
        { value: "tod",   label: "Time-of-Day (ToD)" },
      ],
    },
    // Moisture Parameter Specifications
    moistureParameter: {
      id: "moisture-parameter", label: "Parameter", section: "moisture-specs", default: "Moisture",
      options: [
        { value: "Moisture",    label: "Moisture" },
        { value: "Humidity",    label: "Humidity" },
        { value: "Temperature", label: "Temperature" },
      ],
    },
    moistureFamily: { id: "moisture-family", label: "Family", section: "moisture-specs", default: "CFT", options: "→ common.families" },
    quarter: {
      id: "quarter", label: "Quarter", section: "moisture-specs", default: "Q1",
      options: [
        { value: "Q1", label: "Q1 (Jan – Mar)" },
        { value: "Q2", label: "Q2 (Apr – Jun)" },
        { value: "Q3", label: "Q3 (Jul – Sep)" },
        { value: "Q4", label: "Q4 (Oct – Dec)" },
      ],
    },
    year: {
      id: "year", label: "Year", section: "moisture-specs", default: "2025",
      note: "Dynamically populated: current year ± 1",
      options: [
        { value: "2024", label: "2024" },
        { value: "2025", label: "2025" },
        { value: "2026", label: "2026" },
      ],
    },
    // Alert Configurator
    alertSeverity: {
      id: "alert-severity", label: "Severity", section: "alert-configurator", default: "warning",
      options: [
        { value: "critical", label: "Critical" },
        { value: "warning",  label: "Warning" },
        { value: "info",     label: "Info" },
      ],
    },
    alertParameter: {
      id: "alert-parameter", label: "Parameter", section: "alert-configurator", default: "Humidity",
      options: [
        { value: "Humidity",    label: "Humidity" },
        { value: "Moisture",    label: "Moisture" },
        { value: "Temperature", label: "Temperature" },
      ],
    },
    alertUnit: {
      id: "alert-unit", label: "Unit", section: "alert-configurator", default: "PMD",
      note: "Dynamically populated from energy tree",
      options: [
        { value: "PMD", label: "PMD" },
        { value: "SMD", label: "SMD" },
      ],
    },
    alertLine: {
      id: "alert-line", label: "Line", section: "alert-configurator", default: "Line All",
      note: "Dynamically populated based on selected Unit — see common.unitToLineMapping",
      options: "→ common.lines",
    },
    alertMachine: {
      id: "alert-machine", label: "Machine", section: "alert-configurator", default: "all",
      note: "Dynamically populated based on selected Line — see common.lineToMachineMapping",
      options: "→ common.machines",
    },
    alertShift: {
      id: "alert-shift", label: "Shift", section: "alert-configurator", default: "shiftA",
      options: [
        { value: "shiftA", label: "Shift A", time: "07:00 – 15:30" },
        { value: "shiftB", label: "Shift B", time: "15:30 – 23:00" },
        { value: "shiftC", label: "Shift C", time: "23:00 – 07:00" },
      ],
    },
    // Notifications
    alertEmailDigest: {
      id: "alert-email-digest", label: "Digest Interval", section: "notifications", default: "immediate",
      options: [
        { value: "immediate", label: "Immediate" },
        { value: "15min",     label: "Every 15 min" },
        { value: "hourly",    label: "Hourly" },
        { value: "daily",     label: "Daily" },
      ],
    },
    // User Management
    userRole: {
      id: "user-role", label: "Role", section: "user-management", default: "operator",
      options: [
        { value: "admin",      label: "Admin" },
        { value: "supervisor", label: "Supervisor" },
        { value: "operator",   label: "Operator" },
        { value: "analyst",    label: "Analyst" },
        { value: "technician", label: "Technician" },
      ],
    },
  },
};

export default DROPDOWN_DATA;
