import { kpiData, energyTrendData, equipmentEnergyData } from "@/data/mockData";

export interface KpiData {
  totalEnergy: number;
  energyCost: number;
  productionOutput: number;
  avgMoisture: number;
  avgHumidity: number;
  avgTemperature: number;
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
