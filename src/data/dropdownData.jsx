// Single source of truth for all dropdown options across the application

// ─── Shared blend list (all 23 blends, reused in machineToBlendMapping) ───────
const ALL_BLENDS = [
  { value: "CFT",   label: "CFT" },
  { value: "CMK",   label: "CMK" },
  { value: "CSF",   label: "CSF" },
  { value: "CSF64", label: "CSF64" },
  { value: "CSV",   label: "CSV" },
  { value: "CVF",   label: "CVF" },
  { value: "CVG",   label: "CVG" },
  { value: "ESO",   label: "ESO" },
  { value: "ESP",   label: "ESP" },
  { value: "ETR",   label: "ETR" },
  { value: "MRD",   label: "MRD" },
  { value: "MTR",   label: "MTR" },
  { value: "MTU",   label: "MTU" },
  { value: "SER",   label: "SER" },
  { value: "SES",   label: "SES" },
  { value: "T3",    label: "T3" },
  { value: "TAM",   label: "TAM" },
  { value: "TRL",   label: "TRL" },
  { value: "TRT",   label: "TRT" },
  { value: "TTL",   label: "TTL" },
  { value: "TTLNB", label: "TTLNB" },
  { value: "TTN",   label: "TTN" },
  { value: "ZFT",   label: "ZFT" },
];

const DROPDOWN_DATA = {

  // ─────────────────────────────────────────────
  // SHARED — reused across multiple pages
  // ─────────────────────────────────────────────
  common: {
    // Units: PMD and SMD
    units: [
      { value: "PMD", label: "PMD" },
      { value: "SMD", label: "SMD" },
    ],

    // Lines
    lines: [
      { value: "All",         label: "All" },
      { value: "Line All",    label: "Line All" },
      { value: "Line Lamina", label: "Line Lamina" },
      { value: "Line Stem",   label: "Line Stem" },
    ],

    // Machines: full machine list
    machines: [
      { value: "ADDMoist",             label: "ADDMoist" },
      { value: "All",                  label: "All" },
      { value: "CRS Dryer Exit",       label: "CRS Dryer Exit" },
      { value: "CRS Dryer Infeed",     label: "CRS Dryer Infeed" },
      { value: "DCC EXIT",             label: "DCC EXIT" },
      { value: "Flaour Cylinder EXIT", label: "Flaour Cylinder EXIT" },
      { value: "Lamina Dryer Infeed",  label: "Lamina Dryer Infeed" },
      { value: "Lamina Dryer Outfeed", label: "Lamina Dryer Outfeed" },
      { value: "Product Bin",          label: "Product Bin" },
    ],

    // Families = Blends (23 blend codes)
    families: [
      ...ALL_BLENDS,
    ],

    shifts: [
      { value: "all",    label: "All Shifts", time: "" },
      { value: "shiftA", label: "Shift A",    time: "07:00 – 15:30" },
      { value: "shiftB", label: "Shift B",    time: "15:30 – 23:00" },
      { value: "shiftC", label: "Shift C",    time: "23:00 – 07:00" },
      { value: "daily",  label: "Daily",      time: "07:00 – 07:00" },
    ],

    // Parameters: Humidity / Moisture / Temperature
    parameters: [
      { value: "Humidity",    label: "Humidity",    unit: "%RH" },
      { value: "Moisture",    label: "Moisture",    unit: "%" },
      { value: "Temperature", label: "Temperature", unit: "°C" },
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

    // ── Dependency: Unit → Lines ─────────────────────────────────────────────
    // PMD has 3 lines; SMD has only Line All
    unitToLineMapping: {
      PMD: [
        { value: "Line All",    label: "Line All" },
        { value: "Line Lamina", label: "Line Lamina" },
        { value: "Line Stem",   label: "Line Stem" },
      ],
      SMD: [
        { value: "Line All", label: "Line All" },
      ],
    },

    // ── Dependency: Unit → Parameters ────────────────────────────────────────
    // PMD supports all 3 parameters; SMD excludes Moisture
    unitToParamMapping: {
      PMD: [
        { value: "Humidity",    label: "Humidity",    unit: "%RH" },
        { value: "Moisture",    label: "Moisture",    unit: "%" },
        { value: "Temperature", label: "Temperature", unit: "°C" },
      ],
      SMD: [
        { value: "Humidity",    label: "Humidity",    unit: "%RH" },
        { value: "Temperature", label: "Temperature", unit: "°C" },
      ],
    },

    // ── Dependency: Line → Machines ──────────────────────────────────────────
    lineToMachineMapping: {
      "Line All": [
        { value: "All",                  label: "All" },
        { value: "Flaour Cylinder EXIT", label: "Flaour Cylinder EXIT" },
        { value: "Product Bin",          label: "Product Bin" },
      ],
      "Line Lamina": [
        { value: "DCC EXIT",             label: "DCC EXIT" },
        { value: "Lamina Dryer Infeed",  label: "Lamina Dryer Infeed" },
        { value: "Lamina Dryer Outfeed", label: "Lamina Dryer Outfeed" },
      ],
      "Line Stem": [
        { value: "ADDMoist",         label: "ADDMoist" },
        { value: "CRS Dryer Exit",   label: "CRS Dryer Exit" },
        { value: "CRS Dryer Infeed", label: "CRS Dryer Infeed" },
      ],
    },

    // ── Dependency: Machine → Blends (Families) ──────────────────────────────
    // "All" machine has no blend options; every other machine carries all 23 blends
    machineToBlendMapping: {
      "All":                  [...ALL_BLENDS],
      "ADDMoist":             [...ALL_BLENDS],
      "CRS Dryer Exit":       [...ALL_BLENDS],
      "CRS Dryer Infeed":     [...ALL_BLENDS],
      "DCC EXIT":             [...ALL_BLENDS],
      "Flaour Cylinder EXIT": [...ALL_BLENDS],
      "Lamina Dryer Infeed":  [...ALL_BLENDS],
      "Lamina Dryer Outfeed": [...ALL_BLENDS],
      "Product Bin":          [...ALL_BLENDS],
    },

    // ── Asset hierarchy (unit → line → machine tree) ─────────────────────────
    assetHierarchy: [
      {
        id: "PMD", label: "PMD",
        lines: [
          {
            id: "Line All", label: "Line All",
            machines: [
              { id: "All",                  label: "All" },
              { id: "Flaour Cylinder EXIT", label: "Flaour Cylinder EXIT" },
              { id: "Product Bin",          label: "Product Bin" },
            ],
          },
          {
            id: "Line Lamina", label: "Line Lamina",
            machines: [
              { id: "DCC EXIT",             label: "DCC EXIT" },
              { id: "Lamina Dryer Infeed",  label: "Lamina Dryer Infeed" },
              { id: "Lamina Dryer Outfeed", label: "Lamina Dryer Outfeed" },
            ],
          },
          {
            id: "Line Stem", label: "Line Stem",
            machines: [
              { id: "ADDMoist",         label: "ADDMoist" },
              { id: "CRS Dryer Exit",   label: "CRS Dryer Exit" },
              { id: "CRS Dryer Infeed", label: "CRS Dryer Infeed" },
            ],
          },
        ],
      },
      {
        id: "SMD", label: "SMD",
        lines: [
          {
            id: "Line All", label: "Line All",
            machines: [
              { id: "All",                  label: "All" },
              { id: "Flaour Cylinder EXIT", label: "Flaour Cylinder EXIT" },
              { id: "Product Bin",          label: "Product Bin" },
            ],
          },
        ],
      },
    ],
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
  processAnalysis: {
    unit:    { id: "unit",    label: "Unit Name",    default: "all",        options: "→ common.units" },
    line:    { id: "line",    label: "Line Name",    default: "all",        options: "→ common.lines" },
    machine: { id: "machine", label: "Machine Name", default: "all",        options: "→ common.machines" },
    processParameter: {
      id: "process-parameter", label: "Parameter Name", default: "Moisture",
      options: [
        { value: "Moisture",    label: "Moisture" },
        { value: "Humidity",    label: "Humidity" },
        { value: "Temperature", label: "Temperature" },
      ],
    },
    // Blend options depend on selected Machine — see common.machineToBlendMapping
    blendRunning: {
      id: "blend-running", label: "Blend (Running)", default: "CFT",
      note: "Subset of machineToBlendMapping[selectedMachine] that are currently running",
      options: [
        { value: "CFT", label: "CFT" },
        { value: "CMK", label: "CMK" },
        { value: "CSF", label: "CSF" },
      ],
    },
    blend: {
      id: "blend", label: "Blend", default: "CFT",
      note: "Options derived from common.machineToBlendMapping[selectedMachine]",
      options: "→ common.machineToBlendMapping[selectedMachine]",
    },
    period: {
      id: "period", label: "Period", default: "today",
      options: [
        { value: "today",     label: "Today" },
        { value: "yesterday", label: "Yesterday" },
        { value: "last7",     label: "Last 7 Days" },
        { value: "last30",    label: "Last 30 Days" },
        { value: "thisMonth", label: "This Month" },
      ],
    },
    blendRun: {
      id: "blend-run", label: "Blend Run", default: "allRuns",
      note: "Run timestamps generated dynamically based on selected blend + period",
      options: [
        { value: "allRuns", label: "All runs in period" },
      ],
    },
  },

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
