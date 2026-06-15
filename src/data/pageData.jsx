// Page-wise JSON data structure for all application pages

export const PAGE_DATA = {
  // ─────────────────────────────────────────────
  // 1. EXECUTIVE SUMMARY / DASHBOARD PAGE
  // ─────────────────────────────────────────────
  executiveSummary: {
    pageId: "executive-summary",
    pageTitle: "Executive Summary",
    route: "/",

    kpiCards: [
      {
        id: "total-energy",
        title: "Total Energy Consumed",
        value: 12480,
        unit: "kWh",
        trend: "+3.2%",
        trendDirection: "up",
        icon: "zap",
        breakdown: {
          gridElectricity: 7890,
          solarEnergy: 3240,
          dieselGenerator: 1350,
        },
      },
      {
        id: "energy-cost",
        title: "Energy Cost",
        value: 186720,
        unit: "INR",
        trend: "+2.8%",
        trendDirection: "up",
        icon: "indian-rupee",
      },
      {
        id: "production-output",
        title: "Production Output",
        value: 4520,
        unit: "units",
        trend: "+1.5%",
        trendDirection: "up",
        icon: "package",
      },
      {
        id: "energy-per-unit",
        title: "Energy per Unit",
        value: 2.76,
        unit: "kWh/unit",
        trend: "-0.4%",
        trendDirection: "down",
        icon: "activity",
      },
      {
        id: "avg-moisture",
        title: "Avg Moisture",
        value: 12.4,
        unit: "%",
        trend: "stable",
        trendDirection: "neutral",
        icon: "droplets",
      },
      {
        id: "avg-humidity",
        title: "Avg Humidity",
        value: 58.2,
        unit: "%RH",
        trend: "+1.1%",
        trendDirection: "up",
        icon: "wind",
      },
    ],

    alertSummary: {
      total: 7,
      critical: 2,
      warning: 5,
      normal: 0,
    },

    energyTrend: [
      { time: "00:00", actual: 480, target: 500, cost: 7200 },
      { time: "01:00", actual: 420, target: 500, cost: 6300 },
      { time: "02:00", actual: 390, target: 500, cost: 5850 },
      { time: "03:00", actual: 370, target: 500, cost: 5550 },
      { time: "04:00", actual: 360, target: 500, cost: 5400 },
      { time: "05:00", actual: 400, target: 500, cost: 6000 },
      { time: "06:00", actual: 520, target: 550, cost: 7800 },
      { time: "07:00", actual: 580, target: 600, cost: 8700 },
      { time: "08:00", actual: 620, target: 650, cost: 9300 },
      { time: "09:00", actual: 650, target: 680, cost: 9750 },
      { time: "10:00", actual: 670, target: 700, cost: 10050 },
      { time: "11:00", actual: 690, target: 720, cost: 10350 },
      { time: "12:00", actual: 710, target: 720, cost: 10650 },
      { time: "13:00", actual: 700, target: 720, cost: 10500 },
      { time: "14:00", actual: 720, target: 740, cost: 10800 },
      { time: "15:00", actual: 740, target: 760, cost: 11100 },
      { time: "16:00", actual: 760, target: 780, cost: 11400 },
      { time: "17:00", actual: 730, target: 760, cost: 10950 },
      { time: "18:00", actual: 680, target: 700, cost: 10200 },
      { time: "19:00", actual: 640, target: 660, cost: 9600 },
      { time: "20:00", actual: 600, target: 620, cost: 9000 },
      { time: "21:00", actual: 560, target: 580, cost: 8400 },
      { time: "22:00", actual: 520, target: 540, cost: 7800 },
      { time: "23:00", actual: 490, target: 510, cost: 7350 },
    ],

    equipmentEnergy: [
      { equipment: "Compressor A", line: "Line 1", consumption: 1820, cost: 27300, prevConsumption: 1750, status: "Running" },
      { equipment: "Dryer B",      line: "Line 1", consumption: 1540, cost: 23100, prevConsumption: 1600, status: "Running" },
      { equipment: "Furnace C",    line: "Line 2", consumption: 2100, cost: 31500, prevConsumption: 2050, status: "Running" },
      { equipment: "Compressor D", line: "Line 2", consumption: 980,  cost: 14700, prevConsumption: 1020, status: "Idle" },
      { equipment: "Dryer E",      line: "Line 3", consumption: 1350, cost: 20250, prevConsumption: 1300, status: "Running" },
      { equipment: "Furnace F",    line: "Line 3", consumption: 1890, cost: 28350, prevConsumption: 1920, status: "Maintenance" },
      { equipment: "Chiller G",    line: "Line 4", consumption: 1240, cost: 18600, prevConsumption: 1180, status: "Running" },
      { equipment: "Pump H",       line: "Line 4", consumption: 560,  cost: 8400,  prevConsumption: 580,  status: "Running" },
    ],
  },

  // ─────────────────────────────────────────────
  // 2. ENERGY MONITORING PAGE
  // ─────────────────────────────────────────────
  energyMonitoring: {
    pageId: "energy-monitoring",
    pageTitle: "Energy Monitoring",
    route: "/energy",

    summaryMetrics: [
      { id: "total-consumption", label: "Total Consumption", value: 12480, unit: "kWh" },
      { id: "peak-demand",       label: "Peak Demand",       value: 760,   unit: "kW" },
      { id: "total-cost",        label: "Total Cost",        value: 186720, unit: "INR" },
      { id: "solar-share",       label: "Solar Share",       value: 25.96, unit: "%" },
    ],

    energyTree: [
      {
        id: "PMD",
        name: "Primary Manufacturing Division",
        totalConsumption: 7890,
        lines: [
          {
            id: "PMD-L1",
            name: "Line 1",
            totalConsumption: 3360,
            assets: [
              { id: "PMD-L1-CA", name: "Compressor A", hourly: [70, 65, 60, 58, 62, 80, 95, 110, 115, 120, 118, 122, 125, 122, 128, 130, 135, 128, 118, 110, 105, 95, 88, 75] },
              { id: "PMD-L1-DB", name: "Dryer B",      hourly: [50, 45, 42, 40, 44, 58, 72, 80,  85,  88,  90,  92,  95,  92,  96,  98,  100, 95, 88, 82,  76,  68, 62, 54] },
            ],
          },
          {
            id: "PMD-L2",
            name: "Line 2",
            totalConsumption: 3080,
            assets: [
              { id: "PMD-L2-FC", name: "Furnace C",    hourly: [85, 80, 78, 76, 79, 92, 108, 122, 128, 132, 130, 135, 138, 135, 140, 142, 148, 140, 130, 122, 115, 108, 99, 88] },
              { id: "PMD-L2-CD", name: "Compressor D", hourly: [35, 32, 30, 28, 30, 38, 45,  52,  56,  58,  60,  62,  64,  62,  66,  68,  70,  65, 60, 55,  50,  45, 40, 36] },
            ],
          },
          {
            id: "PMD-L3",
            name: "Line 3",
            totalConsumption: 1450,
            assets: [
              { id: "PMD-L3-DE", name: "Dryer E", hourly: [45, 42, 40, 38, 40, 50, 62, 72, 76, 78, 80, 82, 84, 82, 86, 88, 90, 85, 78, 72, 66, 60, 54, 48] },
            ],
          },
        ],
      },
      {
        id: "SMD",
        name: "Secondary Manufacturing Division",
        totalConsumption: 4590,
        lines: [
          {
            id: "SMD-L4",
            name: "Line 4",
            totalConsumption: 2800,
            assets: [
              { id: "SMD-L4-FF", name: "Furnace F", hourly: [72, 68, 65, 62, 66, 80, 95, 108, 112, 116, 115, 118, 120, 118, 122, 125, 130, 122, 115, 108, 100, 94, 86, 78] },
              { id: "SMD-L4-CG", name: "Chiller G", hourly: [42, 40, 38, 36, 38, 48, 58, 68,  72,  74,  75,  76,  78,  76,  80,  82,  84,  78, 72, 68,  62,  56, 52, 46] },
            ],
          },
          {
            id: "SMD-L5",
            name: "Line 5",
            totalConsumption: 1790,
            assets: [
              { id: "SMD-L5-PH", name: "Pump H",   hourly: [22, 20, 18, 17, 18, 24, 30, 36, 38, 40, 42, 44, 45, 44, 46, 48, 50, 46, 42, 38, 35, 30, 26, 23] },
              { id: "SMD-L5-MI", name: "Motor I",  hourly: [30, 28, 26, 24, 26, 32, 40, 48, 52, 54, 56, 58, 60, 58, 62, 64, 66, 62, 56, 50, 46, 40, 35, 31] },
            ],
          },
        ],
      },
    ],

    hourLabels: [
      "06 AM - 07 AM", "07 AM - 08 AM", "08 AM - 09 AM", "09 AM - 10 AM",
      "10 AM - 11 AM", "11 AM - 12 PM", "12 PM - 01 PM", "01 PM - 02 PM",
      "02 PM - 03 PM", "03 PM - 04 PM", "04 PM - 05 PM", "05 PM - 06 PM",
      "06 PM - 07 PM", "07 PM - 08 PM", "08 PM - 09 PM", "09 PM - 10 PM",
      "10 PM - 11 PM", "11 PM - 12 AM", "12 AM - 01 AM", "01 AM - 02 AM",
      "02 AM - 03 AM", "03 AM - 04 AM", "04 AM - 05 AM", "05 AM - 06 AM",
    ],
  },

  // ─────────────────────────────────────────────
  // 3. PROCESS ANALYSIS PAGE
  // ─────────────────────────────────────────────
  processAnalysis: {
    pageId: "process-analysis",
    pageTitle: "Process Analysis",
    route: "/process",

    parameters: [
      { id: "moisture",    label: "Moisture",    unit: "%",   color: "#3b82f6" },
      { id: "humidity",    label: "Humidity",    unit: "%RH", color: "#10b981" },
      { id: "temperature", label: "Temperature", unit: "°C",  color: "#f59e0b" },
    ],

    controlLimits: {
      moisture: {
        target: 12.5,
        lsl: 10.0,
        usl: 15.0,
        lcl: 10.8,
        ucl: 14.2,
      },
      humidity: {
        target: 58.0,
        lsl: 50.0,
        usl: 65.0,
        lcl: 52.0,
        ucl: 63.0,
      },
      temperature: {
        target: 72.0,
        lsl: 65.0,
        usl: 80.0,
        lcl: 67.0,
        ucl: 77.0,
      },
    },

    processSamples: Array.from({ length: 50 }, (_, i) => ({
      sampleId: i + 1,
      time: `${String(Math.floor((i * 30) / 60) % 24).padStart(2, "0")}:${String((i * 30) % 60).padStart(2, "0")}`,
      timestamp: `2024-01-15T${String(Math.floor((i * 30) / 60) % 24).padStart(2, "0")}:${String((i * 30) % 60).padStart(2, "0")}:00`,
      moisture:    +(11.0 + Math.sin(i * 0.4) * 2.5 + (Math.random() - 0.5) * 0.8).toFixed(2),
      humidity:    +(57.0 + Math.cos(i * 0.3) * 4.0 + (Math.random() - 0.5) * 1.5).toFixed(2),
      temperature: +(71.5 + Math.sin(i * 0.5) * 3.5 + (Math.random() - 0.5) * 1.2).toFixed(2),
    })),
  },

  // ─────────────────────────────────────────────
  // 4. ALERTS PAGE
  // ─────────────────────────────────────────────
  alertsPage: {
    pageId: "alerts",
    pageTitle: "Alerts Management",
    route: "/alerts",

    alerts: [
      {
        id: "ALT-001",
        timestamp: "2024-01-15T14:32:00",
        productionLine: "Line 1",
        equipment: "Compressor A",
        parameter: "Energy",
        severity: "Critical",
        message: "Compressor A energy consumption exceeded threshold by 18%",
        currentValue: 135,
        threshold: 115,
        unit: "kWh",
        costImpact: 3000,
        acknowledged: false,
      },
      {
        id: "ALT-002",
        timestamp: "2024-01-15T13:15:00",
        productionLine: "Line 2",
        equipment: "Furnace C",
        parameter: "Temperature",
        severity: "Critical",
        message: "Furnace C temperature above upper control limit",
        currentValue: 79.8,
        threshold: 77.0,
        unit: "°C",
        costImpact: 1500,
        acknowledged: false,
      },
      {
        id: "ALT-003",
        timestamp: "2024-01-15T12:45:00",
        productionLine: "Line 1",
        equipment: "Dryer B",
        parameter: "Moisture",
        severity: "Warning",
        message: "Dryer B output moisture trending high",
        currentValue: 14.1,
        threshold: 14.2,
        unit: "%",
        costImpact: 800,
        acknowledged: false,
      },
      {
        id: "ALT-004",
        timestamp: "2024-01-15T11:20:00",
        productionLine: "Line 3",
        equipment: "Dryer E",
        parameter: "Humidity",
        severity: "Warning",
        message: "Ambient humidity approaching upper limit",
        currentValue: 62.5,
        threshold: 63.0,
        unit: "%RH",
        costImpact: 500,
        acknowledged: true,
        acknowledgedBy: "Operator Singh",
        acknowledgedAt: "2024-01-15T11:35:00",
        acknowledgedComment: "Ventilation adjusted, monitoring closely",
      },
      {
        id: "ALT-005",
        timestamp: "2024-01-15T10:05:00",
        productionLine: "Line 4",
        equipment: "Furnace F",
        parameter: "Energy",
        severity: "Warning",
        message: "Furnace F energy spike detected during startup",
        currentValue: 148,
        threshold: 130,
        unit: "kWh",
        costImpact: 1200,
        acknowledged: true,
        acknowledgedBy: "Supervisor Rao",
        acknowledgedAt: "2024-01-15T10:20:00",
        acknowledgedComment: "Normal startup surge, resolved",
      },
      {
        id: "ALT-006",
        timestamp: "2024-01-15T09:30:00",
        productionLine: "Line 2",
        equipment: "Compressor D",
        parameter: "Energy",
        severity: "Warning",
        message: "Compressor D running below expected efficiency",
        currentValue: 58,
        threshold: 65,
        unit: "kWh",
        costImpact: 400,
        acknowledged: false,
      },
      {
        id: "ALT-007",
        timestamp: "2024-01-15T08:15:00",
        productionLine: "Line 5",
        equipment: "Motor I",
        parameter: "Energy",
        severity: "Warning",
        message: "Motor I energy draw elevated — check belt tension",
        currentValue: 68,
        threshold: 60,
        unit: "kWh",
        costImpact: 600,
        acknowledged: false,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 5. REPORTS PAGE
  // ─────────────────────────────────────────────
  reportsPage: {
    pageId: "reports",
    pageTitle: "Reports & Analytics",
    route: "/reports",

    reportTypes: [
      { id: "daily-energy",     label: "Daily Energy Report",     description: "Hourly energy breakdown per unit/line/asset" },
      { id: "weekly-summary",   label: "Weekly Summary",          description: "7-day KPI trends and variance analysis" },
      { id: "monthly-cost",     label: "Monthly Cost Analysis",   description: "Cost allocation by division and line" },
      { id: "process-quality",  label: "Process Quality Report",  description: "SPC charts and out-of-control events" },
      { id: "alert-history",    label: "Alert History Report",    description: "All alerts with resolution status" },
      { id: "equipment-health", label: "Equipment Health Report", description: "Runtime, downtime, and efficiency per asset" },
    ],

    historicalKpis: [
      { date: "2024-01-09", totalEnergy: 11980, cost: 179700, production: 4380, efficiency: 96.2 },
      { date: "2024-01-10", totalEnergy: 12100, cost: 181500, production: 4420, efficiency: 96.8 },
      { date: "2024-01-11", totalEnergy: 12320, cost: 184800, production: 4460, efficiency: 97.1 },
      { date: "2024-01-12", totalEnergy: 11800, cost: 177000, production: 4300, efficiency: 95.8 },
      { date: "2024-01-13", totalEnergy: 10200, cost: 153000, production: 3800, efficiency: 94.5 },
      { date: "2024-01-14", totalEnergy: 10500, cost: 157500, production: 3950, efficiency: 95.2 },
      { date: "2024-01-15", totalEnergy: 12480, cost: 186720, production: 4520, efficiency: 97.4 },
    ],
  },

  // ─────────────────────────────────────────────
  // 6. SETTINGS PAGE
  // ─────────────────────────────────────────────
  settingsPage: {
    pageId: "settings",
    pageTitle: "Settings",
    route: "/settings",

    sections: [
      {
        id: "general",
        title: "General",
        settings: [
          { id: "app-name",   label: "Application Name", type: "text",   value: "Digital Factory System" },
          { id: "plant-name", label: "Plant Name",        type: "text",   value: "VST Industries - Unit 5" },
          { id: "timezone",   label: "Timezone",          type: "select", value: "Asia/Kolkata" },
          { id: "language",   label: "Language",          type: "select", value: "en" },
        ],
      },
      {
        id: "thresholds",
        title: "Alert Thresholds",
        settings: [
          { id: "energy-critical",     label: "Energy Critical (%)",     type: "number", value: 115 },
          { id: "energy-warning",      label: "Energy Warning (%)",      type: "number", value: 105 },
          { id: "moisture-upper",      label: "Moisture Upper Limit (%)",type: "number", value: 15.0 },
          { id: "moisture-lower",      label: "Moisture Lower Limit (%)",type: "number", value: 10.0 },
          { id: "humidity-upper",      label: "Humidity Upper (%RH)",    type: "number", value: 65.0 },
          { id: "humidity-lower",      label: "Humidity Lower (%RH)",    type: "number", value: 50.0 },
          { id: "temperature-upper",   label: "Temp Upper (°C)",         type: "number", value: 80.0 },
          { id: "temperature-lower",   label: "Temp Lower (°C)",         type: "number", value: 65.0 },
        ],
      },
      {
        id: "notifications",
        title: "Notifications",
        settings: [
          { id: "email-alerts",   label: "Email Alerts",       type: "toggle", value: true },
          { id: "sms-alerts",     label: "SMS Alerts",         type: "toggle", value: false },
          { id: "push-alerts",    label: "Push Notifications", type: "toggle", value: true },
          { id: "alert-email",    label: "Alert Email",        type: "text",   value: "ops@vstindustries.com" },
          { id: "alert-interval", label: "Digest Interval",    type: "select", value: "immediate" },
        ],
      },
      {
        id: "display",
        title: "Display",
        settings: [
          { id: "theme",           label: "Theme",                 type: "select", value: "light" },
          { id: "chart-animation", label: "Chart Animations",      type: "toggle", value: true },
          { id: "data-refresh",    label: "Auto-Refresh Interval", type: "select", value: "30s" },
          { id: "decimal-places",  label: "Decimal Places",        type: "select", value: "2" },
        ],
      },
      {
        id: "users",
        title: "User Management",
        users: [
          { id: "U001", name: "Admin User",       email: "admin@vstindustries.com",   role: "Admin",    status: "Active" },
          { id: "U002", name: "Supervisor Rao",   email: "rao@vstindustries.com",     role: "Supervisor", status: "Active" },
          { id: "U003", name: "Operator Singh",   email: "singh@vstindustries.com",   role: "Operator", status: "Active" },
          { id: "U004", name: "Analyst Kumar",    email: "kumar@vstindustries.com",   role: "Analyst",  status: "Active" },
          { id: "U005", name: "Technician Reddy", email: "reddy@vstindustries.com",   role: "Technician", status: "Inactive" },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────
// Helper: get page data by route
// ─────────────────────────────────────────────
export function getPageDataByRoute(route) {
  return Object.values(PAGE_DATA).find((page) => page.route === route) ?? null;
}

// ─────────────────────────────────────────────
// Helper: get page data by pageId
// ─────────────────────────────────────────────
export function getPageDataById(pageId) {
  return Object.values(PAGE_DATA).find((page) => page.pageId === pageId) ?? null;
}

// ─────────────────────────────────────────────
// Named exports for direct page access
// ─────────────────────────────────────────────
export const { executiveSummary, energyMonitoring, processAnalysis, alertsPage, reportsPage, settingsPage } = PAGE_DATA;

export default PAGE_DATA;
