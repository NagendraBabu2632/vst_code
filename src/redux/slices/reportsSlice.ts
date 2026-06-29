import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { EnergyReportItem, AlertReportItem, ProductionReportItem } from "@/services/api";

interface ReportsState {
  energyItems: EnergyReportItem[];
  alertItems: AlertReportItem[];
  productionItems: ProductionReportItem[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  energyItems: [],
  alertItems: [],
  productionItems: [],
  loading: false,
  error: null,
};

export const fetchReportData = createAsyncThunk(
  "reports/fetchByType",
  async (
    params: { reportName: string; unit: string; startDate: number; endDate: number; parameter?: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await apiService.fetchReportData(params);
      return { reportName: params.reportName, data };
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch report data");
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportData.fulfilled, (state, action) => {
        state.loading = false;
        const { reportName, data } = action.payload;
        const arr = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
        if (reportName === "energy")          state.energyItems = arr;
        else if (reportName === "alerts")     state.alertItems = arr;
        else if (reportName === "production") state.productionItems = arr;
      })
      .addCase(fetchReportData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default reportsSlice.reducer;

export const selectReportsLoading        = (s: { reports: ReportsState }) => s.reports.loading;
export const selectReportsError          = (s: { reports: ReportsState }) => s.reports.error;
export const selectEnergyReportItems     = (s: { reports: ReportsState }) => s.reports.energyItems;
export const selectAlertReportItems      = (s: { reports: ReportsState }) => s.reports.alertItems;
export const selectProductionReportItems = (s: { reports: ReportsState }) => s.reports.productionItems;
