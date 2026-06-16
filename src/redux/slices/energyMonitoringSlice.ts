import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { EnergyTreeUnit } from "@/data/energyTreeData";
import type { EnergyApiPayload } from "@/redux/slices/dropdownSlice";

interface EnergyMonitoringState {
  energyTree: EnergyTreeUnit[];
  summaryMetrics: { id: string; label: string; value: number; unit: string }[];
  hourLabels: string[];
  loading: boolean;
  error: string | null;
}

const initialState: EnergyMonitoringState = {
  energyTree: [],
  summaryMetrics: [],
  hourLabels: [],
  loading: false,
  error: null,
};

export const fetchEnergyMonitoringData = createAsyncThunk(
  "energyMonitoring/fetchAll",
  async (payload: EnergyApiPayload | undefined, { rejectWithValue }) => {
    try {
      return await apiService.fetchEnergyMonitoringData(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch energy monitoring data");
    }
  }
);

const energyMonitoringSlice = createSlice({
  name: "energyMonitoring",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnergyMonitoringData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnergyMonitoringData.fulfilled, (state, action) => {
        state.loading = false;
        state.energyTree = action.payload.energyTree;
        state.summaryMetrics = action.payload.summaryMetrics;
        state.hourLabels = action.payload.hourLabels;
      })
      .addCase(fetchEnergyMonitoringData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default energyMonitoringSlice.reducer;

// Selectors
export const selectEnergyLoading = (s: { energyMonitoring: EnergyMonitoringState }) =>
  s.energyMonitoring.loading;
export const selectEnergyError = (s: { energyMonitoring: EnergyMonitoringState }) =>
  s.energyMonitoring.error;
export const selectEnergyTree = (s: { energyMonitoring: EnergyMonitoringState }) =>
  s.energyMonitoring.energyTree;
export const selectEnergySummaryMetrics = (s: { energyMonitoring: EnergyMonitoringState }) =>
  s.energyMonitoring.summaryMetrics;
