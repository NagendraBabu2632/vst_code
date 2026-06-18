import axios from "axios";
import {
  kpiData,
  energyTrendData,
  equipmentEnergyData,
  alertsData,
  processData,
} from "@/data/mockData";
import { energyTree } from "@/data/energyTreeData";
import DROPDOWN_DATA from "../data/dropdownData";
import PAGE_DATA from "@/data/pageData";
import {
  EXEC_MOCK,
  EXEC_ENDPOINTS,
  buildExecParams,
} from "@/data/executiveApiConfig";
import type { ApiPayload, ExecApiPayload } from "@/redux/slices/dropdownSlice";

// ─── General backend client ───────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("dfs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("dfs_user");
      localStorage.removeItem("dfs_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Executive Summary API client ─────────────────────────────────────────────
// In dev: proxied via Vite → avoids CORS (vite.config.ts: /exec-api → http://172.16.0.177:8018)
// In prod: set VITE_EXEC_API_BASE_URL=http://172.16.0.177:8018/api
const EXEC_BASE_URL = import.meta.env.VITE_EXEC_API_BASE_URL ?? "/exec-api/api";

const execClient = axios.create({
  baseURL: EXEC_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Centralised API Service ──────────────────────────────────────────────────

export const apiService = {

  // ── Dropdown / Master data ───────────────────────────────────────────────
  async fetchDropdownData() {
    return DROPDOWN_DATA;
  },

  // ── Executive Summary — individual endpoint methods ──────────────────────
  async fetchExecSummary(params: Record<string, any>) {
    console.log("[Exec] GET", EXEC_ENDPOINTS.SUMMARY, "params →", params);
    try {
      const res = await execClient.get(EXEC_ENDPOINTS.SUMMARY, { params });
      console.log("[Exec] Response", EXEC_ENDPOINTS.SUMMARY, "→", res.data);
      return res.data;
    } catch (err) {
      console.warn("[Exec] Falling back to mock for", EXEC_ENDPOINTS.SUMMARY, err);
      return EXEC_MOCK.summary;
    }
  },

  async fetchExecSec(params: Record<string, any>) {
    console.log("[Exec] GET", EXEC_ENDPOINTS.SEC, "params →", params);
    try {
      const res = await execClient.get(EXEC_ENDPOINTS.SEC, { params });
      console.log("[Exec] Response", EXEC_ENDPOINTS.SEC, "→", res.data);
      return res.data;
    } catch (err) {
      console.warn("[Exec] Falling back to mock for", EXEC_ENDPOINTS.SEC, err);
      return EXEC_MOCK.sec;
    }
  },

  async fetchExecTrend(params: Record<string, any>) {
    console.log("[Exec] GET", EXEC_ENDPOINTS.TREND, "params →", params);
    try {
      const res = await execClient.get(EXEC_ENDPOINTS.TREND, { params });
      console.log("[Exec] Response", EXEC_ENDPOINTS.TREND, "→", res.data);
      return res.data;
    } catch (err) {
      console.warn("[Exec] Falling back to mock for", EXEC_ENDPOINTS.TREND, err);
      return params.period === "day" ? EXEC_MOCK.trendDay : EXEC_MOCK.trendWeekMonth;
    }
  },

  async fetchExecTopConsumers(params: Record<string, any>) {
    console.log("[Exec] GET", EXEC_ENDPOINTS.TOP_CONSUMERS, "params →", params);
    try {
      const res = await execClient.get(EXEC_ENDPOINTS.TOP_CONSUMERS, { params });
      console.log("[Exec] Response", EXEC_ENDPOINTS.TOP_CONSUMERS, "→", res.data);
      return res.data;
    } catch (err) {
      console.warn("[Exec] Falling back to mock for", EXEC_ENDPOINTS.TOP_CONSUMERS, err);
      return params.kpitype === "pollution" ? EXEC_MOCK.pollution : EXEC_MOCK.top5;
    }
  },

  // ── Executive Summary — combined (calls all 4 endpoints in parallel) ─────
  async fetchExecutiveSummaryData(payload?: ExecApiPayload) {
    const params = buildExecParams(payload ?? { dateFilter: "day", dateRange: { from: "", to: "" } });
    const [summary, sec, trend, top5, pollution] = await Promise.all([
      this.fetchExecSummary(params),
      this.fetchExecSec(params),
      this.fetchExecTrend(params),
      this.fetchExecTopConsumers({ ...params, kpitype: "top5" }),
      this.fetchExecTopConsumers({ ...params, kpitype: "pollution" }),
    ]);
    return { summary, sec, trend, top5, pollution };
  },

  // ── Energy Monitoring ────────────────────────────────────────────────────
  async fetchEnergyMonitoringData(payload?: ApiPayload) {
    console.log("[Energy Monitoring] API Payload:", payload);
    const { summaryMetrics, hourLabels } = PAGE_DATA.energyMonitoring;
    return { energyTree, summaryMetrics, hourLabels };
  },

  // ── Process Analysis ─────────────────────────────────────────────────────
  async fetchProcessAnalysisData(payload?: ApiPayload) {
    console.log("[Process Analysis] API Payload:", payload);
    const { parameters, controlLimits } = PAGE_DATA.processAnalysis;
    return { processData, parameters, controlLimits };
  },

  // ── Alerts ───────────────────────────────────────────────────────────────
  async fetchAlertsData(payload?: ApiPayload) {
    console.log("[Alerts] API Payload:", payload);
    return { alerts: alertsData };
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  async fetchReportsData(payload?: ApiPayload) {
    console.log("[Reports] API Payload:", payload);
    const { reportTypes, historicalKpis } = PAGE_DATA.reportsPage;
    return {
      energyTrend: energyTrendData,
      equipmentEnergy: equipmentEnergyData,
      processData,
      alerts: alertsData,
      reportTypes,
      historicalKpis,
    };
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  async fetchSettingsData() {
    const { sections } = PAGE_DATA.settingsPage;
    return { sections };
  },
};

export default apiClient;
