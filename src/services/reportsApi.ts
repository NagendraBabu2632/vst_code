import { energyTrendData, equipmentEnergyData, processData, alertsData } from "@/data/mockData";

export const reportsApi = {
  async getEnergyReport() {
    await new Promise((r) => setTimeout(r, 300));
    return energyTrendData;
  },

  async getEquipmentReport() {
    await new Promise((r) => setTimeout(r, 300));
    return equipmentEnergyData;
  },

  async getProcessReport() {
    await new Promise((r) => setTimeout(r, 300));
    return processData;
  },

  async getAlertsReport() {
    await new Promise((r) => setTimeout(r, 300));
    return alertsData;
  },
};
