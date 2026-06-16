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
import type { ApiPayload } from "@/redux/slices/dropdownSlice";

// ─── Real backend client ─────────────────────────────────────────────────────
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

// ─── Dummy integration client (dummyjson.com for testing) ────────────────────
const dummyClient = axios.create({
  baseURL: "https://dummyjson.com",
  timeout: 10_000,
});

// Fires the dummy API call to demonstrate integration; payload is NOT forwarded
const pingDummy = () => dummyClient.get("/products?limit=1").catch(() => {});

// ─── Centralised API Service ─────────────────────────────────────────────────
// Flow per method:
//   1. Prepare payload (received as arg)
//   2. console.log the payload (for dev visibility)
//   3. Ping dummyjson.com — payload is intentionally NOT sent to the dummy URL
//   4. Return local JSON data as if it came from a real backend

export const apiService = {

  // ── Dropdown / Master data ───────────────────────────────────────────────
  async fetchDropdownData() {
    await pingDummy();
    return DROPDOWN_DATA;
  },

  // ── Executive Summary ────────────────────────────────────────────────────
  async fetchExecutiveSummaryData(payload?: ApiPayload) {
    console.log("[Executive Summary] API Payload:", payload);
    await pingDummy();
    const { kpiCards, alertSummary, energyTrend, equipmentEnergy } =
      PAGE_DATA.executiveSummary;

    return {
      kpiData,
      energyTrend: energyTrendData,
      equipmentEnergy: equipmentEnergyData,
      alerts: alertsData,
      kpiCards,
      alertSummary,
      energyTrendPageData: energyTrend,
      equipmentEnergyPageData: equipmentEnergy,
    };
  },

  // ── Energy Monitoring ────────────────────────────────────────────────────
  async fetchEnergyMonitoringData(payload?: ApiPayload) {
    console.log("[Energy Monitoring] API Payload:", payload);
    await pingDummy();
    const { summaryMetrics, hourLabels } = PAGE_DATA.energyMonitoring;
    return {
      energyTree,
      summaryMetrics,
      hourLabels,
    };
  },

  // ── Process Analysis ─────────────────────────────────────────────────────
  async fetchProcessAnalysisData(payload?: ApiPayload) {
    console.log("[Process Analysis] API Payload:", payload);
    await pingDummy();
    const { parameters, controlLimits } = PAGE_DATA.processAnalysis;
    return {
      processData,
      parameters,
      controlLimits,
    };
  },

  // ── Alerts ───────────────────────────────────────────────────────────────
  async fetchAlertsData(payload?: ApiPayload) {
    console.log("[Alerts] API Payload:", payload);
    await pingDummy();
    return {
      alerts: alertsData,
    };
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  async fetchReportsData(payload?: ApiPayload) {
    console.log("[Reports] API Payload:", payload);
    await pingDummy();
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
    await pingDummy();
    const { sections } = PAGE_DATA.settingsPage;
    return { sections };
  },
};

export default apiClient;
