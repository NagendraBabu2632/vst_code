import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import themeReducer from "./slices/themeSlice";
import dashboardReducer from "./slices/dashboardSlice";
import dropdownReducer from "./slices/dropdownSlice";
import executiveSummaryReducer from "./slices/executiveSummarySlice";
import energyMonitoringReducer from "./slices/energyMonitoringSlice";
import processAnalysisReducer from "./slices/processAnalysisSlice";
import alertsReducer from "./slices/alertsSlice";
import reportsReducer from "./slices/reportsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    dashboard: dashboardReducer,
    dropdown: dropdownReducer,
    executiveSummary: executiveSummaryReducer,
    energyMonitoring: energyMonitoringReducer,
    processAnalysis: processAnalysisReducer,
    alerts: alertsReducer,
    reports: reportsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
