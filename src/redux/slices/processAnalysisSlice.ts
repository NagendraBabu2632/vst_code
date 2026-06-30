import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { ProcessData } from "@/data/mockData";
import type { ProcessApiPayload } from "@/redux/slices/dropdownSlice";
import type { MoistureBlendGroup } from "@/services/api";

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
  moistureBlendList: MoistureBlendGroup[];
  moistureBlendListLoading: boolean;
  moistureBlendListError: string | null;
}

const initialState: ProcessAnalysisState = {
  processData: [],
  parameters: [],
  controlLimits: null,
  sensorStats: null,
  loading: false,
  error: null,
  moistureBlendList: [],
  moistureBlendListLoading: false,
  moistureBlendListError: null,
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

export const fetchMoistureBlendList = createAsyncThunk(
  "processAnalysis/fetchMoistureBlendList",
  async (
    params: { unit?: string; machineId: number; startDate: number; endDate: number },
    { rejectWithValue }
  ) => {
    try {
      return await apiService.fetchMoistureBlendList(params);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch blend list");
    }
  }
);

export const fetchMoistureTrend = createAsyncThunk(
  "processAnalysis/fetchMoistureTrend",
  async (
    params: {
      unit?: string;
      machineId: number;
      blendName: string;
      blendRunStartTime: number;
      blendRunEndTime: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const raw = await apiService.fetchMoistureTrend(params);
      const pd: ProcessData[] = raw.timeSeries.map((p, i) => ({
        time: String(i + 1),
        timestamp: p.timestamp,
        moisture: p.value,
        humidity: 0,
        temperature: 0,
        moistureTarget: raw.target ?? 12.5,
        moistureLSL: raw.lsl ?? 11,
        moistureUSL: raw.usl ?? 14,
        moistureLCL: raw.lcl ?? 11.5,
        moistureUCL: raw.ucl ?? 13.5,
        humidityTarget: 58, humidityLSL: 50, humidityUSL: 65, humidityLCL: 52, humidityUCL: 63,
        temperatureTarget: 31, temperatureLSL: 27, temperatureUSL: 35, temperatureLCL: 28, temperatureUCL: 34,
      }));
      return {
        processData: pd,
        parameters: [] as { id: string; label: string; unit: string; color: string }[],
        controlLimits: {
          moisture: {
            target: raw.target ?? 12.5,
            lsl: raw.lsl ?? 11,
            usl: raw.usl ?? 14,
            lcl: raw.lcl ?? 11.5,
            ucl: raw.ucl ?? 13.5,
          },
          temperature: { target: 31, lsl: 27, usl: 35, lcl: 28, ucl: 34 },
          humidity:    { target: 58, lsl: 50, usl: 65, lcl: 52, ucl: 63 },
        },
        sensorStats: {
          avg: raw.avg,
          sigma: raw.sigma,
          pp: raw.pp ?? 0,
          ppk: raw.ppk ?? 0,
          dataPointCount: raw.dataPointCount,
        } as SensorStats,
      };
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch moisture trend");
    }
  }
);

const processAnalysisSlice = createSlice({
  name: "processAnalysis",
  initialState,
  reducers: {
    clearProcessData: (state) => {
      state.processData = [];
      state.sensorStats = null;
      state.controlLimits = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Sensor data (temperature / humidity)
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
      })
      // ── Moisture blend list
      .addCase(fetchMoistureBlendList.pending, (state) => {
        state.moistureBlendListLoading = true;
        state.moistureBlendListError = null;
      })
      .addCase(fetchMoistureBlendList.fulfilled, (state, action) => {
        state.moistureBlendListLoading = false;
        state.moistureBlendList = action.payload;
      })
      .addCase(fetchMoistureBlendList.rejected, (state, action) => {
        state.moistureBlendListLoading = false;
        state.moistureBlendListError = action.payload as string;
      })
      // ── Moisture trend (writes into the same processData/controlLimits/sensorStats)
      .addCase(fetchMoistureTrend.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMoistureTrend.fulfilled, (state, action) => {
        state.loading = false;
        state.processData = action.payload.processData;
        state.parameters = action.payload.parameters;
        state.controlLimits = action.payload.controlLimits as ProcessAnalysisState["controlLimits"];
        state.sensorStats = action.payload.sensorStats;
      })
      .addCase(fetchMoistureTrend.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProcessData } = processAnalysisSlice.actions;

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
export const selectMoistureBlendList = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.moistureBlendList;
export const selectMoistureBlendListLoading = (s: { processAnalysis: ProcessAnalysisState }) =>
  s.processAnalysis.moistureBlendListLoading;
