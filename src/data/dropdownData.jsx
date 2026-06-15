// Single source of truth for all dropdown options across the application

const DROPDOWN_DATA = {

  // ─────────────────────────────────────────────
  // SHARED — reused across multiple pages
  // ─────────────────────────────────────────────
  common: {
    units: [
      { value: "all",   label: "All Units" },
      { value: "unit1", label: "Unit 1" },
      { value: "unit2", label: "Unit 2" },
      { value: "unit3", label: "Unit 3" },
      { value: "PMD",   label: "PMD" },
      { value: "SMD",   label: "SMD" },
    ],
    lines: [
      { value: "all",   label: "All Lines" },
      { value: "line1", label: "Line 1" },
      { value: "line2", label: "Line 2" },
      { value: "line3", label: "Line 3" },
      { value: "line4", label: "Line 4" },
      { value: "line5", label: "Line 5" },
    ],
    machines: [
      { value: "all",         label: "All Machines" },
      { value: "compressorA", label: "Compressor A" },
      { value: "dryerB",      label: "Dryer B" },
      { value: "motorC",      label: "Motor C" },
      { value: "furnaceD",    label: "Furnace D" },
      { value: "pumpE",       label: "Pump E" },
      { value: "conveyorF",   label: "Conveyor F" },
    ],
    families: [
      { value: "all",     label: "All Families" },
      { value: "familyA", label: "Family A" },
      { value: "familyB", label: "Family B" },
      { value: "familyC", label: "Family C" },
      { value: "familyD", label: "Family D" },
      { value: "familyE", label: "Family E" },
    ],
    shifts: [
      { value: "all",    label: "All Shifts",  time: "" },
      { value: "shiftA", label: "Shift A",     time: "06:00 – 14:00" },
      { value: "shiftB", label: "Shift B",     time: "14:00 – 22:00" },
      { value: "shiftC", label: "Shift C",     time: "22:00 – 06:00" },
      { value: "daily",  label: "Daily",       time: "06:00 – 06:00" },
    ],
    parameters: [
      { value: "all",         label: "All Parameters", unit: "" },
      { value: "energy",      label: "Energy",         unit: "kWh" },
      { value: "moisture",    label: "Moisture",       unit: "%" },
      { value: "humidity",    label: "Humidity",       unit: "%RH" },
      { value: "temperature", label: "Temperature",    unit: "°C" },
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
    assetHierarchy: [
      {
        id: "unit1", label: "Unit 1",
        lines: [
          { id: "unit1-line1", label: "Line 1", machines: [{ id: "compA", label: "Compressor A" }, { id: "dryB", label: "Dryer B" }] },
          { id: "unit1-line2", label: "Line 2", machines: [{ id: "motC", label: "Motor C" }, { id: "pumE", label: "Pump E" }] },
        ],
      },
      {
        id: "unit2", label: "Unit 2",
        lines: [
          { id: "unit2-line3", label: "Line 3", machines: [{ id: "furD", label: "Furnace D" }, { id: "conF", label: "Conveyor F" }] },
          { id: "unit2-line4", label: "Line 4", machines: [{ id: "mixG", label: "Mixer G" }, { id: "bolH", label: "Boiler H" }] },
        ],
      },
      {
        id: "PMD", label: "PMD",
        lines: [
          { id: "PMD-line1", label: "PMD Line 1", machines: [{ id: "prs1", label: "Press 1" }, { id: "prs2", label: "Press 2" }] },
        ],
      },
      {
        id: "SMD", label: "SMD",
        lines: [
          { id: "SMD-line1", label: "SMD Line 1", machines: [{ id: "cut1", label: "Cutter 1" }, { id: "cut2", label: "Cutter 2" }] },
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
      id: "process-parameter", label: "Parameter Name", default: "moistureS1",
      options: [
        { value: "moistureS1",   label: "Moisture Parameter 1" },
        { value: "moistureS2",   label: "Moisture Parameter 2" },
        { value: "humiditySen1", label: "Humidity Sensor 1" },
        { value: "temp1",        label: "Temperature 1" },
        { value: "temp2",        label: "Temperature 2" },
      ],
    },
    familyRunning: {
      id: "family-running", label: "Family (Running)", default: "familyA",
      options: [
        { value: "familyA", label: "Family A" },
        { value: "familyB", label: "Family B" },
        { value: "familyC", label: "Family C" },
      ],
    },
    family: { id: "family", label: "Family (All)", default: "all", options: "→ common.families" },
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
    familyRun: {
      id: "family-run", label: "Family Run", default: "allRuns",
      note: "Additional run timestamps generated dynamically",
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
        { value: "moisture",    label: "Moisture" },
        { value: "humidity",    label: "Humidity" },
        { value: "temperature", label: "Temperature" },
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
      id: "moisture-parameter", label: "Parameter", section: "moisture-specs", default: "moistureS1",
      options: [
        { value: "moistureS1", label: "Moisture S1" },
        { value: "moistureS2", label: "Moisture S2" },
        { value: "moistureS3", label: "Moisture S3" },
        { value: "moistureS4", label: "Moisture S4" },
      ],
    },
    moistureFamily: { id: "moisture-family", label: "Family", section: "moisture-specs", default: "familyA", options: "→ common.families" },
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
      id: "alert-parameter", label: "Parameter", section: "alert-configurator", default: "energy",
      options: [
        { value: "energy",      label: "Energy (kWh)" },
        { value: "power",       label: "Power (kW)" },
        { value: "current",     label: "Current (A)" },
        { value: "voltage",     label: "Voltage (V)" },
        { value: "temperature", label: "Temperature (°C)" },
        { value: "vibration",   label: "Vibration (mm/s)" },
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
      id: "alert-line", label: "Line", section: "alert-configurator", default: "line1",
      note: "Dynamically populated based on selected Unit",
      options: [
        { value: "line1", label: "Line 1" },
        { value: "line2", label: "Line 2" },
      ],
    },
    alertMachine: {
      id: "alert-machine", label: "Machine", section: "alert-configurator", default: "compressorA",
      note: "Dynamically populated based on selected Line",
      options: [
        { value: "compressorA", label: "Compressor A" },
        { value: "dryerB",      label: "Dryer B" },
      ],
    },
    alertShift: {
      id: "alert-shift", label: "Shift", section: "alert-configurator", default: "shiftA",
      options: [
        { value: "shiftA", label: "Shift A", time: "06:00 – 14:00" },
        { value: "shiftB", label: "Shift B", time: "14:00 – 22:00" },
        { value: "shiftC", label: "Shift C", time: "22:00 – 06:00" },
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
