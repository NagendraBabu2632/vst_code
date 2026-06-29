import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
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
  ackLoading: boolean;
  ackError: string | null;
}

const initialState: AlertsState = {
  items: [],
  totalAlerts: 0,
  criticalAlerts: 0,
  warningAlerts: 0,
  acknowledgedCount: 0,
  loading: false,
  error: null,
  ackLoading: false,
  ackError: null,
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

export const acknowledgeAlertAsync = createAsyncThunk(
  "alerts/acknowledge",
  async ({ alertId, comment }: { alertId: number; comment: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.acknowledgeAlert(alertId);
      return { ...response, acknowledgedComment: comment };
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to acknowledge alert");
    }
  }
);

const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {},
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
      })
      .addCase(acknowledgeAlertAsync.pending, (state) => {
        state.ackLoading = true;
        state.ackError = null;
      })
      .addCase(acknowledgeAlertAsync.fulfilled, (state, action) => {
        state.ackLoading = false;
        const { alertId, isAcknowledged, acknowledgedBy, acknowledgedAt, acknowledgedComment } = action.payload;
        const alert = state.items.find((a) => a.alertId === alertId);
        if (alert) {
          alert.isAcknowledged = isAcknowledged;
          alert.acknowledgedBy = acknowledgedBy;
          alert.acknowledgedAt = acknowledgedAt;
          alert.acknowledgedComment = acknowledgedComment;
          state.acknowledgedCount += 1;
        }
      })
      .addCase(acknowledgeAlertAsync.rejected, (state, action) => {
        state.ackLoading = false;
        state.ackError = action.payload as string;
      });
  },
});

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
export const selectAckLoading = (s: { alerts: AlertsState }) => s.alerts.ackLoading;
export const selectAckError   = (s: { alerts: AlertsState }) => s.alerts.ackError;
