import { processData } from "@/data/mockData";

export const processApi = {
  async getProcessData() {
    await new Promise((r) => setTimeout(r, 350));
    return processData;
  },
};
