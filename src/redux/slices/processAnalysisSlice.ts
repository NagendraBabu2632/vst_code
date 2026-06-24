import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { ProcessData } from "@/data/mockData";
import type { ProcessApiPayload } from "@/redux/slices/dropdownSlice";

interface ControlLimitSet {
  target: number;
  lsl: number;
  usl: number;
  lcl: number;
  ucl: number;
}

export interface SensorStats {
  avg: number;
  sigma: number;
  pp: number;
  ppk: number;
  dataPointCount: number;
}

interface ProcessAnalysisState {
  processData: ProcessData[];
  parameters: { id: string; label: string; unit: string; color: string }[];
  controlLimits: {
    moisture: ControlLimitSet;
    humidity: ControlLimitSet;
    temperature: ControlLimitSet;
  } | null;
  sensorStats: SensorStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProcessAnalysisState = {
  processData: [],
  parameters: [],
  controlLimits: null,
  sensorStats: null,
  loading: false,
  error: null,
};

export const fetchProcessAnalysisData = createAsyncThunk(
  "processAnalysis/fetchAll",
  async (payload: ProcessApiPayload | undefined, { rejectWithValue }) => {
    try {
      return await apiService.fetchProcessAnalysisData(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch process analysis data");
    }
  }
);

const processAnalysisSlice = createSlice({
  name: "processAnalysis",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcessAnalysisData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProcessAnalysisData.fulfilled, (state, action) => {
        state.loading = false;
        state.processData = action.payload.processData;
        state.parameters = action.payload.parameters;
        state.controlLimits = action.payload.controlLimits as ProcessAnalysisState["controlLimits"];
        state.sensorStats = (action.payload as any).sensorStats ?? null;
      })
      .addCase(fetchProcessAnalysisData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default processAnalysisSlice.reducer;

// Selectors
export const selectProcessLoading = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.loading;
export const selectProcessError = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.error;
export const selectProcessData = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.processData;
export const selectControlLimits = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.controlLimits;
export const selectSensorStats = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.sensorStats;
