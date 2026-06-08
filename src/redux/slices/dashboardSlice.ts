import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { dashboardApi, type KpiData, type EnergyTrendPoint, type EquipmentEnergy } from "@/services/dashboardApi";

interface DashboardState {
  kpiData: KpiData | null;
  energyTrend: EnergyTrendPoint[];
  equipmentEnergy: EquipmentEnergy[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  kpiData: null,
  energyTrend: [],
  equipmentEnergy: [],
  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const [kpiData, energyTrend, equipmentEnergy] = await Promise.all([
        dashboardApi.getKpiData(),
        dashboardApi.getEnergyTrend(),
        dashboardApi.getEquipmentEnergy(),
      ]);
      return { kpiData, energyTrend, equipmentEnergy };
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch dashboard data");
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDashboardData.fulfilled,
        (
          state,
          action: PayloadAction<{
            kpiData: KpiData;
            energyTrend: EnergyTrendPoint[];
            equipmentEnergy: EquipmentEnergy[];
          }>
        ) => {
          state.loading = false;
          state.kpiData = action.payload.kpiData;
          state.energyTrend = action.payload.energyTrend;
          state.equipmentEnergy = action.payload.equipmentEnergy;
        }
      )
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default dashboardSlice.reducer;
