import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type {
  ExecSummaryKpi,
  ExecSecData,
  ExecTrendData,
  ExecTopConsumersData,
  ExecAlertSummary,
  ExecHumidityMoistureData,
} from "@/services/dashboardApi";
import type { ExecApiPayload } from "@/redux/slices/dropdownSlice";

interface ExecutiveSummaryState {
  summaryKpi:       ExecSummaryKpi | null;
  secData:          ExecSecData | null;
  trendData:        ExecTrendData | null;
  top5Data:         ExecTopConsumersData | null;
  pollutionData:    ExecTopConsumersData | null;
  alertSummary:     ExecAlertSummary | null;
  humidityMoisture: ExecHumidityMoistureData | null;
  loading:          boolean;
  error:            string | null;
}

const initialState: ExecutiveSummaryState = {
  summaryKpi:       null,
  secData:          null,
  trendData:        null,
  top5Data:         null,
  pollutionData:    null,
  alertSummary:     null,
  humidityMoisture: null,
  loading:          false,
  error:            null,
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
        state.loading            = false;
        state.summaryKpi         = action.payload.summary;
        state.secData            = action.payload.sec;
        state.trendData          = action.payload.trend;
        state.top5Data           = action.payload.top5;
        state.pollutionData      = action.payload.pollution;
        state.alertSummary       = action.payload.alertSummary;
        state.humidityMoisture   = action.payload.humidityMoisture;
      })
      .addCase(fetchExecutiveSummaryData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default executiveSummarySlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
type State = { executiveSummary: ExecutiveSummaryState };
export const selectExecLoading       = (s: State) => s.executiveSummary.loading;
export const selectExecError         = (s: State) => s.executiveSummary.error;
export const selectSummaryKpi        = (s: State) => s.executiveSummary.summaryKpi;
export const selectSecData           = (s: State) => s.executiveSummary.secData;
export const selectTrendData         = (s: State) => s.executiveSummary.trendData;
export const selectTop5Data          = (s: State) => s.executiveSummary.top5Data;
export const selectPollutionData     = (s: State) => s.executiveSummary.pollutionData;
export const selectAlertSummary      = (s: State) => s.executiveSummary.alertSummary;
export const selectHumidityMoisture  = (s: State) => s.executiveSummary.humidityMoisture;
