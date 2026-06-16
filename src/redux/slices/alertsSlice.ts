import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { Alert } from "@/data/mockData";
import type { AlertsApiPayload } from "@/redux/slices/dropdownSlice";

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

const initialState: AlertsState = {
  alerts: [],
  loading: false,
  error: null,
};

export const fetchAlertsData = createAsyncThunk(
  "alerts/fetchAll",
  async (payload: AlertsApiPayload | undefined, { rejectWithValue }) => {
    try {
      return await apiService.fetchAlertsData(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch alerts data");
    }
  }
);

const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    acknowledgeAlert(
      state,
      action: PayloadAction<{
        id: string;
        acknowledgedBy: string;
        acknowledgedAt: string;
        acknowledgedComment: string;
      }>
    ) {
      const alert = state.alerts.find((a) => a.id === action.payload.id);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = action.payload.acknowledgedBy;
        alert.acknowledgedAt = action.payload.acknowledgedAt;
        alert.acknowledgedComment = action.payload.acknowledgedComment;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlertsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertsData.fulfilled, (state, action) => {
        state.loading = false;
        // Only show process parameter alerts (Moisture/Humidity/Temperature)
        state.alerts = action.payload.alerts.filter((a) =>
          ["Moisture", "Humidity", "Temperature"].includes(a.parameter as string)
        );
      })
      .addCase(fetchAlertsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { acknowledgeAlert } = alertsSlice.actions;
export default alertsSlice.reducer;

// Selectors
export const selectAlertsLoading = (s: { alerts: AlertsState }) =>
  s.alerts.loading;
export const selectAlertsError = (s: { alerts: AlertsState }) =>
  s.alerts.error;
export const selectAlerts = (s: { alerts: AlertsState }) =>
  s.alerts.alerts;
