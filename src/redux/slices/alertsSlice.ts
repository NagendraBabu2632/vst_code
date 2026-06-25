import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import type { AlertApiItem, AlertsResponse } from "@/services/api";
import type { AlertsApiPayload } from "@/redux/slices/dropdownSlice";

export type AlertItem = AlertApiItem & { acknowledgedComment?: string };

interface AlertsState {
  items: AlertItem[];
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  acknowledgedCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: AlertsState = {
  items: [],
  totalAlerts: 0,
  criticalAlerts: 0,
  warningAlerts: 0,
  acknowledgedCount: 0,
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
        alertId: number;
        acknowledgedBy: string;
        acknowledgedAt: string;
        acknowledgedComment: string;
      }>
    ) {
      const alert = state.items.find((a) => a.alertId === action.payload.alertId);
      if (alert) {
        alert.isAcknowledged = true;
        alert.acknowledgedBy = action.payload.acknowledgedBy;
        alert.acknowledgedAt = action.payload.acknowledgedAt;
        alert.acknowledgedComment = action.payload.acknowledgedComment;
        state.acknowledgedCount += 1;
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
        const res = action.payload as AlertsResponse;
        const items = res.items ?? [];
        state.items = items;
        state.totalAlerts    = res.totalAlerts    ?? res.total ?? items.length;
        state.criticalAlerts = res.criticalAlerts ?? items.filter((i) => i.severity === "Critical").length;
        state.warningAlerts  = res.warningAlerts  ?? items.filter((i) => i.severity === "Warning").length;
        state.acknowledgedCount = res.acknowledged ?? items.filter((i) => i.isAcknowledged).length;
      })
      .addCase(fetchAlertsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { acknowledgeAlert } = alertsSlice.actions;
export default alertsSlice.reducer;

export const selectAlertsLoading = (s: { alerts: AlertsState }) => s.alerts.loading;
export const selectAlertsError   = (s: { alerts: AlertsState }) => s.alerts.error;
export const selectAlerts        = (s: { alerts: AlertsState }) => s.alerts.items;
export const selectAlertsKpi     = (s: { alerts: AlertsState }) => ({
  totalAlerts:    s.alerts.totalAlerts,
  criticalAlerts: s.alerts.criticalAlerts,
  warningAlerts:  s.alerts.warningAlerts,
  acknowledged:   s.alerts.acknowledgedCount,
});
