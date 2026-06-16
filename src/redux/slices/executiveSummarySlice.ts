import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { KpiData, EnergyTrendPoint, EquipmentEnergy } from "@/services/dashboardApi";
import type { Alert } from "@/data/mockData";
import type { ExecApiPayload } from "@/redux/slices/dropdownSlice";

interface ExecutiveSummaryState {
  kpiData: KpiData | null;
  energyTrend: EnergyTrendPoint[];
  equipmentEnergy: EquipmentEnergy[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

const initialState: ExecutiveSummaryState = {
  kpiData: null,
  energyTrend: [],
  equipmentEnergy: [],
  alerts: [],
  loading: false,
  error: null,
};

export const fetchExecutiveSummaryData = createAsyncThunk(
  "executiveSummary/fetchAll",
  async (payload: ExecApiPayload | undefined, { rejectWithValue }) => {
    try {
      return await apiService.fetchExecutiveSummaryData(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch executive summary data");
    }
  }
);

const executiveSummarySlice = createSlice({
  name: "executiveSummary",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExecutiveSummaryData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExecutiveSummaryData.fulfilled, (state, action) => {
        state.loading = false;
        state.kpiData = action.payload.kpiData;
        state.energyTrend = action.payload.energyTrend;
        state.equipmentEnergy = action.payload.equipmentEnergy;
        state.alerts = action.payload.alerts;
      })
      .addCase(fetchExecutiveSummaryData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default executiveSummarySlice.reducer;

// Selectors
export const selectExecLoading = (s: { executiveSummary: ExecutiveSummaryState }) =>
  s.executiveSummary.loading;
export const selectExecError = (s: { executiveSummary: ExecutiveSummaryState }) =>
  s.executiveSummary.error;
export const selectKpiData = (s: { executiveSummary: ExecutiveSummaryState }) =>
  s.executiveSummary.kpiData;
export const selectEnergyTrend = (s: { executiveSummary: ExecutiveSummaryState }) =>
  s.executiveSummary.energyTrend;
export const selectEquipmentEnergy = (s: { executiveSummary: ExecutiveSummaryState }) =>
  s.executiveSummary.equipmentEnergy;
export const selectExecAlerts = (s: { executiveSummary: ExecutiveSummaryState }) =>
  s.executiveSummary.alerts;
