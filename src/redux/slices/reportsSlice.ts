import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { EnergyTrendPoint, EquipmentEnergy } from "@/services/dashboardApi";
import type { ProcessData, Alert } from "@/data/mockData";
import type { ReportsApiPayload } from "@/redux/slices/dropdownSlice";

interface ReportType {
  id: string;
  label: string;
  description: string;
}

interface HistoricalKpi {
  date: string;
  totalEnergy: number;
  cost: number;
  production: number;
  efficiency: number;
}

interface ReportsState {
  energyTrend: EnergyTrendPoint[];
  equipmentEnergy: EquipmentEnergy[];
  processData: ProcessData[];
  alerts: Alert[];
  reportTypes: ReportType[];
  historicalKpis: HistoricalKpi[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  energyTrend: [],
  equipmentEnergy: [],
  processData: [],
  alerts: [],
  reportTypes: [],
  historicalKpis: [],
  loading: false,
  error: null,
};

export const fetchReportsData = createAsyncThunk(
  "reports/fetchAll",
  async (payload: ReportsApiPayload | undefined, { rejectWithValue }) => {
    try {
      return await apiService.fetchReportsData(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch reports data");
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportsData.fulfilled, (state, action) => {
        state.loading = false;
        state.energyTrend = action.payload.energyTrend;
        state.equipmentEnergy = action.payload.equipmentEnergy;
        state.processData = action.payload.processData;
        state.alerts = action.payload.alerts;
        state.reportTypes = action.payload.reportTypes;
        state.historicalKpis = action.payload.historicalKpis;
      })
      .addCase(fetchReportsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default reportsSlice.reducer;

// Selectors
export const selectReportsLoading = (s: { reports: ReportsState }) =>
  s.reports.loading;
export const selectReportsError = (s: { reports: ReportsState }) =>
  s.reports.error;
export const selectReportsEnergyTrend = (s: { reports: ReportsState }) =>
  s.reports.energyTrend;
export const selectReportsEquipmentEnergy = (s: { reports: ReportsState }) =>
  s.reports.equipmentEnergy;
export const selectReportsProcessData = (s: { reports: ReportsState }) =>
  s.reports.processData;
export const selectReportsAlerts = (s: { reports: ReportsState }) =>
  s.reports.alerts;
