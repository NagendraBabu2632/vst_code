import { energyTree } from "@/data/energyTreeData";
import type { EnergyTreeUnit } from "@/data/energyTreeData";

export const energyApi = {
  async getEnergyTree(): Promise<EnergyTreeUnit[]> {
    await new Promise((r) => setTimeout(r, 400));
    return energyTree;
  },
};
