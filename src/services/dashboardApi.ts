import { kpiData, energyTrendData, equipmentEnergyData } from "@/data/mockData";

export interface KpiData {
  totalEnergy: number;
  energyCost: number;
  productionOutput: number;
  avgMoisture: number;
  avgHumidity: number;
}

export interface EnergyTrendPoint {
  time: string;
  actual: number;
  [key: string]: any;
}

export interface EquipmentEnergy {
  equipment: string;
  line: string;
  consumption: number;
  cost: number;
  prevConsumption: number;
  status: string;
}

// ─── Executive Summary API response types ─────────────────────────────────────

export interface ExecSummaryKpi {
  totalKWH: number;
  totalCost: number;
  utilityKWH: number;
  kwhChangePct: number;
  costChangePct: number;
  utilityKwhChangePct: number;
  isTotalKwhUp: boolean;
  isTotalCostUp: boolean;
  isUtilityKwhUp: boolean;
  avgMoisture: number;
  avgHumidity: number;
  avgTemperature: number;
}

export interface ExecSecData {
  pmdSEC: number;
  smdSEC: number;
  pmdSECChangePct: number;
  smdSECChangePct: number;
  isPmdSECUp: boolean;
  isSmdSECUp: boolean;
}

export interface ExecTrendPoint {
  label: string;
  kwh: number;
}

export interface ExecTrendData {
  granularity: 'hourly' | 'hour' | 'daily' | 'day';
  data: ExecTrendPoint[];
}

export interface ExecConsumerItem {
  rank: number;
  feederName: string;
  zone: string;
  kwh: number;
  cost: number;
}

export interface ExecTopConsumersData {
  kpiType: 'top5' | 'pollution';
  items: ExecConsumerItem[];
}

export interface ExecAlertSummary {
  total: number;
  critical: number;
  warning: number;
  acknowledged: number;
}

export interface ExecHumidityData {
  pmd: number;
  smd: number;
  total: number;
}

export interface ExecMoistureItem {
  machineId: number;
  location: string;
  line: string;
  tagName: string;
  avgMoisture: number | null;
}

export interface ExecHumidityMoistureData {
  humidity: ExecHumidityData;
  moisture: ExecMoistureItem[];
}


export const dashboardApi = {
  async getKpiData(): Promise<KpiData> {
    await new Promise((r) => setTimeout(r, 300));
    return kpiData;
  },

  async getEnergyTrend(): Promise<EnergyTrendPoint[]> {
    await new Promise((r) => setTimeout(r, 300));
    return energyTrendData;
  },

  async getEquipmentEnergy(): Promise<EquipmentEnergy[]> {
    await new Promise((r) => setTimeout(r, 300));
    return equipmentEnergyData;
  },
};
