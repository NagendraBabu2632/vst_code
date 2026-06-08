// Sample sensor data structure and mock data for VST Industry Digital Factory

export interface SensorReading {
  tagName: string;
  tagValue: number;
  timestamp: string;
  productionLine: string;
  parameterType: "Energy" | "Moisture" | "Humidity";
  unit: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  productionLine: string;
  parameter: "Energy" | "Moisture" | "Humidity";
  severity: "Critical" | "Warning" | "Normal";
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  acknowledgedComment?: string;
  equipment?: string;
  currentValue?: number;
  threshold?: number;
  unit?: string;
  costImpact?: number;
  unitName?: string;
}

export interface EnergyData {
  time: string;
  actual: number;
  target: number;
}

export interface ProcessData {
  time: string;
  timestamp: string;
  moisture: number;
  humidity: number;
  temperature: number;
  moistureTarget: number;
  moistureLSL: number;
  moistureUSL: number;
  moistureLCL: number;
  moistureUCL: number;
  humidityTarget: number;
  humidityLSL: number;
  humidityUSL: number;
  humidityLCL: number;
  humidityUCL: number;
  temperatureTarget: number;
  temperatureLSL: number;
  temperatureUSL: number;
  temperatureLCL: number;
  temperatureUCL: number;
}

export const kpiData = {
  totalEnergy: 12480,
  gridElectricity: 7890,
  solarEnergy: 3240,
  dieselGenerator: 1350,
  energyCost: 186720,
  productionOutput: 4520,
  energyPerUnit: 2.76,
  avgMoisture: 12.4,
  avgHumidity: 58.2,
  activeAlerts: 7,
  criticalAlerts: 2,
  warningAlerts: 5,
};

const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export const energyTrendData: EnergyData[] = hours.map((time, i) => {
  const target = 350;
  const actual = 300 + Math.random() * 120 + (i >= 8 && i <= 18 ? 40 : 0);
  const cost = +(actual * 7.5).toFixed(0);
  return { time, actual: +actual.toFixed(1), target, cost };
});

export const lineEnergyData = [
  { line: "Line 1", consumption: 3420, efficiency: 92 },
  { line: "Line 2", consumption: 2890, efficiency: 88 },
  { line: "Line 3", consumption: 3150, efficiency: 95 },
  { line: "Line 4", consumption: 1780, efficiency: 84 },
  { line: "Line 5", consumption: 1240, efficiency: 91 },
];

export const equipmentEnergyData = [
  { equipment: "Compressor A", line: "Line 1", consumption: 890, cost: 7120, status: "Running", prevConsumption: 820 },
  { equipment: "Dryer B", line: "Line 1", consumption: 650, cost: 5200, status: "Running", prevConsumption: 680 },
  { equipment: "Motor C", line: "Line 2", consumption: 1120, cost: 8960, status: "Running", prevConsumption: 1050 },
  { equipment: "Furnace D", line: "Line 3", consumption: 1540, cost: 12320, status: "Idle", prevConsumption: 1480 },
  { equipment: "Pump E", line: "Line 4", consumption: 320, cost: 2560, status: "Running", prevConsumption: 340 },
  { equipment: "Conveyor F", line: "Line 5", consumption: 210, cost: 1680, status: "Maintenance", prevConsumption: 230 },
];

export const processData: ProcessData[] = Array.from({ length: 50 }, (_, i) => {
  const moisture = 11.5 + Math.random() * 2;
  const humidity = 55 + Math.random() * 8;
  const temperature = 28 + Math.random() * 6;
  const baseDate = new Date(2026, 2, 10, 6, 0, 0);
  const timestamp = new Date(baseDate.getTime() + i * 15 * 60 * 1000);
  return {
    time: `Sample ${i + 1}`,
    timestamp: timestamp.toISOString(),
    moisture: +moisture.toFixed(2),
    humidity: +humidity.toFixed(2),
    temperature: +temperature.toFixed(2),
    moistureTarget: 12.5,
    moistureLSL: 11.0,
    moistureUSL: 14.0,
    moistureLCL: 11.5,
    moistureUCL: 13.5,
    humidityTarget: 58,
    humidityLSL: 50,
    humidityUSL: 65,
    humidityLCL: 52,
    humidityUCL: 63,
    temperatureTarget: 31,
    temperatureLSL: 27,
    temperatureUSL: 35,
    temperatureLCL: 28,
    temperatureUCL: 34,
  };
});

export const moistureByLine = [
  { line: "Line 1", current: 12.3, target: 12.5, status: "Normal" as const },
  { line: "Line 2", current: 13.8, target: 12.5, status: "Warning" as const },
  { line: "Line 3", current: 12.1, target: 12.5, status: "Normal" as const },
  { line: "Line 4", current: 14.2, target: 12.5, status: "Critical" as const },
  { line: "Line 5", current: 12.6, target: 12.5, status: "Normal" as const },
];

export const humidityByLine = [
  { line: "Line 1", current: 57.2, target: 58, status: "Normal" as const },
  { line: "Line 2", current: 62.1, target: 58, status: "Warning" as const },
  { line: "Line 3", current: 56.8, target: 58, status: "Normal" as const },
  { line: "Line 4", current: 66.5, target: 58, status: "Critical" as const },
  { line: "Line 5", current: 58.3, target: 58, status: "Normal" as const },
];

export const alertsData: Alert[] = [
  { id: "ALT-001", timestamp: "2026-03-10 14:32:00", productionLine: "Line 4", parameter: "Moisture", severity: "Critical", message: "Moisture level exceeded USL (14.0%). Current: 14.2%", acknowledged: false, equipment: "Dryer B", currentValue: 14.2, threshold: 14.0, unit: "%", costImpact: 0, unitName: "PMD" },
  { id: "ALT-002", timestamp: "2026-03-10 14:28:00", productionLine: "Line 4", parameter: "Humidity", severity: "Critical", message: "Humidity exceeded USL (65%). Current: 66.5%", acknowledged: false, equipment: "Motor C", currentValue: 66.5, threshold: 65, unit: "%RH", costImpact: 0, unitName: "PMD" },
  { id: "ALT-003", timestamp: "2026-03-10 13:45:00", productionLine: "Line 2", parameter: "Moisture", severity: "Warning", message: "Moisture approaching USL. Current: 13.8%", acknowledged: false, equipment: "Dryer B", currentValue: 13.8, threshold: 14.0, unit: "%", costImpact: 0, unitName: "SMD" },
  { id: "ALT-004", timestamp: "2026-03-10 13:20:00", productionLine: "Line 2", parameter: "Humidity", severity: "Warning", message: "Humidity above target. Current: 62.1%", acknowledged: true, acknowledgedBy: "Operator A", acknowledgedAt: "2026-03-10 13:35:00", acknowledgedComment: "Adjusted HVAC settings", equipment: "Motor C", currentValue: 62.1, threshold: 65, unit: "%RH", costImpact: 0, unitName: "SMD" },
  { id: "ALT-005", timestamp: "2026-03-10 12:15:00", productionLine: "Line 1", parameter: "Energy", severity: "Warning", message: "Energy spike detected on Compressor A", acknowledged: true, acknowledgedBy: "Supervisor B", acknowledgedAt: "2026-03-10 12:30:00", acknowledgedComment: "Load balancing adjusted", equipment: "Compressor A", currentValue: 520, threshold: 450, unit: "kWh", costImpact: 525, unitName: "PMD" },
  { id: "ALT-006", timestamp: "2026-03-10 11:00:00", productionLine: "Line 3", parameter: "Energy", severity: "Warning", message: "Furnace D idle but consuming power", acknowledged: false, equipment: "Furnace D", currentValue: 180, threshold: 50, unit: "kWh", costImpact: 975, unitName: "SMD" },
  { id: "ALT-007", timestamp: "2026-03-10 09:30:00", productionLine: "Line 5", parameter: "Energy", severity: "Warning", message: "Conveyor F scheduled maintenance overdue", acknowledged: true, acknowledgedBy: "Maintenance C", acknowledgedAt: "2026-03-10 10:00:00", acknowledgedComment: "Scheduled for next shift", equipment: "Conveyor F", currentValue: 95, threshold: 80, unit: "kWh", costImpact: 112, unitName: "PMD" },
];

export const weeklyEnergyData = [
  { day: "Mon", actual: 11100, target: 10500 },
  { day: "Tue", actual: 11500, target: 10500 },
  { day: "Wed", actual: 12480, target: 10500 },
  { day: "Thu", actual: 10900, target: 10500 },
  { day: "Fri", actual: 11650, target: 10500 },
  { day: "Sat", actual: 7200, target: 7000 },
  { day: "Sun", actual: 5700, target: 5500 },
];

export const monthlyEnergyData = [
  { month: "Jan", total: 340000 },
  { month: "Feb", total: 310000 },
  { month: "Mar", total: 365000 },
  { month: "Apr", total: 345000 },
  { month: "May", total: 380000 },
  { month: "Jun", total: 395000 },
];
