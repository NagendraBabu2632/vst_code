import axios from "axios";
import {
  kpiData,
  energyTrendData,
  equipmentEnergyData,
  alertsData,
  processData,
} from "@/data/mockData";
import { energyTree as energyTreeMock } from "@/data/energyTreeData";
import type { EnergyTreeUnit, EnergyTreeLine, EnergyTreeAsset } from "@/data/energyTreeData";
import DROPDOWN_DATA from "@/data/dropdownData";
import PAGE_DATA from "@/data/pageData";
import {
  EXEC_MOCK,
  EXEC_ENDPOINTS,
  buildExecParams,
} from "@/data/executiveApiConfig";
import type { ApiPayload, ExecApiPayload, EnergyApiPayload } from "@/redux/slices/dropdownSlice";

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

// ─── Dropdown transform ───────────────────────────────────────────────────────
// Converts raw API response { units, lines, machines, parameters, blends, hierarchy }
// into the DROPDOWN_DATA.common shape that all components consume.
const PARAM_UNIT: Record<string, string> = { Moisture: "%", Temperature: "°C", Humidity: "%RH" };
const toOpt      = (name: string) => ({ value: name, label: name });
const toParamOpt = (name: string) => ({ value: name, label: name, unit: PARAM_UNIT[name] ?? "" });

function buildDropdownCommon(raw: any) {
  const units      = raw.units.map((u: any) => toOpt(u.name));
  const lines      = raw.lines.map((l: any) => toOpt(l.name));
  const machines   = raw.machines.map((m: any) => toOpt(m.name));
  const parameters = raw.parameters.map((p: any) => toParamOpt(p.name));
  const families   = raw.blends.map((b: any) => ({ value: b.name, label: b.name }));
  const hier       = raw.hierarchy as Record<string, Record<string, Record<string, string[]>>>;

  // Unit → Lines
  const unitToLineMapping: Record<string, any[]> = {};
  for (const [unit, linesObj] of Object.entries(hier)) {
    unitToLineMapping[unit] = Object.keys(linesObj).map(toOpt);
  }

  // Line → Machines (flat union — used when unit is unknown)
  const lineToMachineMapping: Record<string, any[]> = {};
  for (const linesObj of Object.values(hier)) {
    for (const [line, machinesObj] of Object.entries(linesObj)) {
      if (!lineToMachineMapping[line]) lineToMachineMapping[line] = [];
      for (const machineName of Object.keys(machinesObj)) {
        if (!lineToMachineMapping[line].some((m) => m.value === machineName)) {
          lineToMachineMapping[line].push(toOpt(machineName));
        }
      }
    }
  }

  // "UNIT:LINE" → Machines (hierarchy-aware; used when unit is known)
  const unitLineToMachineMapping: Record<string, any[]> = {};
  for (const [unit, linesObj] of Object.entries(hier)) {
    for (const [line, machinesObj] of Object.entries(linesObj)) {
      unitLineToMachineMapping[`${unit}:${line}`] = Object.keys(machinesObj).map(toOpt);
    }
  }

  // Unit → Parameters (collected from all machines in that unit)
  const unitToParamMapping: Record<string, any[]> = {};
  for (const [unit, linesObj] of Object.entries(hier)) {
    const seen = new Set<string>();
    for (const machinesObj of Object.values(linesObj)) {
      for (const params of Object.values(machinesObj)) {
        params.forEach((p) => seen.add(p));
      }
    }
    unitToParamMapping[unit] = [...seen].map(toParamOpt);
  }

  // Machine → Blends (all machines carry the full blend list)
  const machineToBlendMapping: Record<string, any[]> = {};
  for (const m of raw.machines) {
    machineToBlendMapping[m.name] = [...families];
  }

  // Asset hierarchy tree
  const assetHierarchy = Object.entries(hier).map(([unit, linesObj]) => ({
    id: unit, label: unit,
    lines: Object.entries(linesObj).map(([line, machinesObj]) => ({
      id: line, label: line,
      machines: Object.keys(machinesObj).map((m) => ({ id: m, label: m })),
    })),
  }));

  return {
    units, lines, machines, parameters, families,
    unitToLineMapping,
    lineToMachineMapping,
    unitLineToMachineMapping,
    unitToParamMapping,
    machineToBlendMapping,
    assetHierarchy,
    shifts:      DROPDOWN_DATA.common.shifts,
    severity:    DROPDOWN_DATA.common.severity,
    alertStatus: DROPDOWN_DATA.common.alertStatus,
  };
}

// ─── Energy Monitoring response transform ─────────────────────────────────────
// API shape: { granularity, slotLabels, zones: [{ name, slotKwh, shiftKwh, children }] }
// zones → EnergyTreeUnit, zone.children (PCCs) → EnergyTreeLine, pcc.children → EnergyTreeAsset
function transformEnergyResponse(raw: any): {
  tree: EnergyTreeUnit[];
  slotLabels: string[];
  shiftLabels: string[];
} {
  const slotLabels: string[] = raw?.slotLabels ?? [];
  const zones: any[] = raw?.zones ?? [];

  if (!zones.length) {
    console.warn("[Energy Monitoring] No zones in response:", raw);
    return { tree: [], slotLabels, shiftLabels: [] };
  }

  const shiftLabels: string[] = (zones[0]?.shiftKwh ?? []).map(
    (s: any) => s.label ?? `Shift ${s.shift}`
  );

  const tree: EnergyTreeUnit[] = zones.map((zone: any) => {
    const children: any[] = zone.children ?? [];

    const lines: EnergyTreeLine[] = children.map((child: any) => {
      const subChildren: any[] = child.children ?? [];

      const assets: EnergyTreeAsset[] = subChildren.map((sf: any) => ({
        id:       `${zone.name}__${child.name}__${sf.name}`,
        name:     sf.name,
        hourly:   sf.slotKwh ?? [],
        shiftKwh: (sf.shiftKwh ?? []).map((s: any) => s.kwh as number),
      }));

      return {
        id:       `${zone.name}__${child.name}`,
        name:     child.name,
        assets,
        hourly:   child.slotKwh ?? [],
        shiftKwh: (child.shiftKwh ?? []).map((s: any) => s.kwh as number),
      };
    });

    return {
      id:       zone.name,
      name:     zone.name,
      lines,
      hourly:   zone.slotKwh ?? [],
      shiftKwh: (zone.shiftKwh ?? []).map((s: any) => s.kwh as number),
    };
  });

  return { tree, slotLabels, shiftLabels };
}

// ─── Centralised API Service ──────────────────────────────────────────────────

export const apiService = {

  // ── Dropdown / Master data ───────────────────────────────────────────────
  async fetchDropdownData() {
    console.log("[Dropdowns] GET /dropdowns/all + /weeks + /months");
    const [allResult, weeksResult, monthsResult] = await Promise.allSettled([
      execClient.get("/dropdowns/all"),
      execClient.get("/dropdowns/weeks"),
      execClient.get("/dropdowns/months"),
    ]);

    let common = DROPDOWN_DATA.common;
    if (allResult.status === "fulfilled") {
      try { common = buildDropdownCommon(allResult.value.data); } catch (e) {
        console.warn("[Dropdowns] Failed to build common from /dropdowns/all", e);
      }
    } else {
      console.warn("[Dropdowns] /dropdowns/all failed", (allResult as any).reason);
    }

    const weeks  = weeksResult.status  === "fulfilled" ? weeksResult.value.data  : [];
    const months = monthsResult.status === "fulfilled" ? monthsResult.value.data : [];
    if (weeksResult.status  !== "fulfilled") console.warn("[Dropdowns] /dropdowns/weeks failed");
    if (monthsResult.status !== "fulfilled") console.warn("[Dropdowns] /dropdowns/months failed");

    return { ...DROPDOWN_DATA, common, weeks, months };
  },

  async fetchWeekOptions() {
    const res = await execClient.get("/dropdowns/weeks");
    return res.data as any[];
  },

  async fetchMonthOptions() {
    const res = await execClient.get("/dropdowns/months");
    return res.data as any[];
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
  async fetchEnergyMonitoringData(payload?: EnergyApiPayload) {
    const period     = payload?.period ?? "today";
    const isIntraday = period === "today" || period === "yesterday";

    // shift_detail: 1=ShiftA, 2=ShiftB, 3=ShiftC, 4=all+summary, 5=daily(week)
    const SHIFT_NUM: Record<string, number> = { shiftA: 1, shiftB: 2, shiftC: 3 };
    const shift_detail = isIntraday
      ? (SHIFT_NUM[payload?.shift ?? ""] ?? 4)
      : 5;

    const params = {
      period:      isIntraday ? "day" : "week",
      start_date:  payload?.dateRange.from,
      end_date:    payload?.dateRange.to,
      shift_detail,
    };

    console.log("[Energy Monitoring] GET /energy-monitoring params →", params);
    try {
      const res = await execClient.get("/energy-monitoring", { params });
      console.log("[Energy Monitoring] Response →", res.data);
      const { tree, slotLabels, shiftLabels } = transformEnergyResponse(res.data);
      const { summaryMetrics } = PAGE_DATA.energyMonitoring;
      return { energyTree: tree, summaryMetrics, hourLabels: slotLabels, shiftLabels };
    } catch (err) {
      console.warn("[Energy Monitoring] API unavailable, falling back to mock data", err);
      const { summaryMetrics, hourLabels } = PAGE_DATA.energyMonitoring;
      return { energyTree: energyTreeMock, summaryMetrics, hourLabels, shiftLabels: [] };
    }
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

  // ── Blend Configurator ────────────────────────────────────────────────────
  async fetchBlendFamilies() {
    // apiClient.baseURL is already "/api", so paths start after that prefix
    const res = await apiClient.get("/configurator/families");
    return res.data as Array<{ familyId: number; familyName: string }>;
  },

  async fetchBlends() {
    const res = await apiClient.get("/configurator/blend");
    return res.data as Array<{
      blendId: number;
      blendName: string;
      blendDescription: string;
      familyId: number;
      familyName: string;
    }>;
  },

  async upsertBlend(payload: {
    action: 1 | 2 | 3;
    blendId?: number | null;
    blendName?: string;
    blendDescription?: string | null;
    familyId?: number;
  }) {
    const res = await apiClient.post("/configurator/blend/upsert", payload);
    return res.data;
  },

  async downloadBlends() {
    const res = await apiClient.get("/configurator/blend/download", { responseType: "blob" });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Blends_${today}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async uploadBlends(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post("/configurator/blend/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as { inserted: number; updated: number; skipped: number; errors: string[] };
  },

  // ── Production Upload ─────────────────────────────────────────────────────
  async downloadProductionTemplate(date: string) {
    const res = await apiClient.get("/production/template", { params: { date }, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Production_Template_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async uploadProductionData(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post("/production/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as { message?: string; inserted?: number; updated?: number; errors?: string[] };
  },

  async fetchProductionData(date: string) {
    const res = await apiClient.get("/production", { params: { date } });
    return res.data;
  },
};

export default apiClient;
