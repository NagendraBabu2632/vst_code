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
import type { ApiPayload, ExecApiPayload, EnergyApiPayload, ProcessApiPayload } from "@/redux/slices/dropdownSlice";

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
  const machineIdMap: Record<string, number> = {};
  for (const m of raw.machines) {
    machineToBlendMapping[m.name] = [...families];
    const id = m.id ?? m.machineId;
    if (id !== undefined && id !== null) machineIdMap[m.name] = Number(id);
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
    machineIdMap,
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

// ─── Alerts Types ────────────────────────────────────────────────────────────

export interface AlertApiItem {
  alertId: number;
  ruleId: number;
  ruleName: string;
  unit: string;
  parameterType: string;
  tagName: string;
  timestamp: string;
  value: number;
  lsl: number;
  usl: number;
  severity: "Critical" | "Warning" | "Info";
  isAcknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface AlertsResponse {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  acknowledged: number;
  total: number;
  page: number;
  pageSize: number;
  items: AlertApiItem[];
}

export interface AcknowledgeAlertResponse {
  alertId: number;
  isAcknowledged: boolean;
  acknowledgedBy: string;
  acknowledgedAt: string;
}

// ─── Reports Types ────────────────────────────────────────────────────────────

export interface EnergyReportItem {
  timestamp: string;
  feederName: string;
  consumption: number;
  cost: number;
}

export interface AlertReportItem {
  timestamp: string;
  parameter: string;
  severity: string;
  status: string;
  comments: string;
  acknowledgedBy: string;
  acknowledgedOn: string;
}

export interface ProductionReportItem {
  date: string;
  outputMSticks: number;
  energyKWH: number;
  energyPerUnit: number;
}

// ─── Alert Rules Types ────────────────────────────────────────────────────────

export interface AlertRuleApi {
  ruleId: number;
  ruleName: string;
  unit: string;
  line: string;
  machine: string;
  parameterType: string;
  useLslUsl: boolean;
  lsl?: number | null;
  usl?: number | null;
  severity: "Info" | "Warning" | "Critical";
  alertIntervalMinutes: number;
  emailRecipients?: string | string[];
  dailySummaryEnabled: boolean;
  dailySummaryTime?: string | null;
  dailySummaryRecipients?: string | string[];
  shiftSummaryEnabled: boolean;
  shiftSummaryShiftNo?: number | null;
  shiftNo?: number | null;
  shiftSummaryRecipients?: string | string[];
  isEnabled: boolean;
}

export interface AlertRulePayload {
  ruleName: string;
  unit: string;
  line: string;
  machine: string;
  parameterType: string;
  useLslUsl: boolean;
  lsl?: number | null;
  usl?: number | null;
  severity: "Info" | "Warning" | "Critical";
  alertIntervalMinutes: number;
  emailRecipients?: string;
  dailySummaryEnabled: boolean;
  dailySummaryTime?: string | null;
  dailySummaryRecipients?: string;
  shiftSummaryEnabled: boolean;
  shiftNo?: number | null;
  shiftSummaryRecipients?: string;
  isEnabled: boolean;
}

// ─── Moisture / Blend Override Types ─────────────────────────────────────────

export interface MoisturePosition {
  machineId: number;
  blendId: number | null;
  blendName: string;
  source: 'Auto' | 'Manual' | 'Unknown';
  since: string | null;
}

export interface BlendRunLog {
  id: number;
  blendName: string;
  blendId: number;
  startTime: string;
  endTime: string | null;
  machine: string;
  machineId: number;
  overrideStatus?: boolean;
}

// ─── Sensor Target Types ──────────────────────────────────────────────────────

export interface SensorTarget {
  parameterType: string;
  lsl: number;
  usl: number;
  target: number;
}

// ─── Tariff Types ─────────────────────────────────────────────────────────────

export interface TariffBand {
  bandId: number;
  tariffMasterId: number;
  bandName: "Normal" | "Peak" | "OffPeak" | "HalfPeak";
  startHour: number;
  endHour: number;
  ratePerKWH: number;
  timeRange: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface TariffMaster {
  tariffID: number;
  tariffCode: string;
  tariffType: string;
  ratePerKWH: number;
  fixedCharges: number;
  dutyChargePerKWH: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  bands: TariffBand[];
}

export interface CreateTariffPayload {
  tariffCode: string;
  tariffType: string;
  ratePerKWH: number;
  fixedCharges: number;
  dutyChargePerKWH: number;
  startDate: string;
  endDate: string | null;
  closeActiveMaster: boolean;
  bands: { bandName: string; startHour: number; endHour: number; ratePerKWH: number }[];
}

export interface UpdateTariffPayload {
  tariffCode: string;
  tariffType: string;
  ratePerKWH: number;
  fixedCharges: number;
  dutyChargePerKWH: number;
  startDate: string;
  endDate: string | null;
  bands: { bandName: string; startHour: number; endHour: number; ratePerKWH: number }[];
}

export interface TariffBandPayload {
  bandName: string;
  startHour: number;
  endHour: number;
  ratePerKWH: number;
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

  // ── Process Analysis — download ──────────────────────────────────────────
  async downloadProcessAnalysisData(payload?: ProcessApiPayload) {
    const now         = new Date();
    const defaultFrom = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    const defaultTo   = now.toISOString().slice(0, 10);

    const toEpochFrom = (s: string): number =>
      new Date(s.includes(" ") ? s.replace(" ", "T") : `${s}T00:00:00`).getTime();
    const toEpochTo   = (s: string): number =>
      new Date(s.includes(" ") ? s.replace(" ", "T") : `${s}T23:59:59`).getTime();

    const fromStr = payload?.dateRange?.from ?? defaultFrom;
    const toStr   = payload?.dateRange?.to   ?? defaultTo;

    const params = {
      unit:          payload?.unit            ?? "PMD",
      parameterType: payload?.processParameter ?? "Temperature",
      startDate:     toEpochFrom(fromStr),
      endDate:       toEpochTo(toStr),
      machine:       payload?.machine         ?? "all",
      line:          payload?.line            ?? "all",
    };

    console.log("[Process Analysis] GET /sensor/data/download params →", params);
    const res = await execClient.get("/sensor/data/download", { params, responseType: "blob" });

    const disposition = res.headers["content-disposition"] ?? "";
    const match       = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    const filename    = match?.[1]?.replace(/['"]/g, "")
      ?? `${payload?.processParameter ?? "sensor"}_data_${fromStr}_${toStr}.csv`;

    const url = URL.createObjectURL(new Blob([res.data]));
    const a   = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Process Analysis ─────────────────────────────────────────────────────
  async fetchProcessAnalysisData(payload?: ProcessApiPayload) {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 29 * 86400000);

    // Date-only strings map to midnight for start, end-of-day for end
    const toEpochFrom = (s: string): number =>
      new Date(s.includes(" ") ? s.replace(" ", "T") : `${s}T00:00:00`).getTime();
    const toEpochTo   = (s: string): number =>
      new Date(s.includes(" ") ? s.replace(" ", "T") : `${s}T23:59:59`).getTime();

    const fromStr = payload?.dateRange?.from ?? defaultFrom.toISOString().slice(0, 10);
    const toStr   = payload?.dateRange?.to   ?? now.toISOString().slice(0, 10);

    const params = {
      unit:          payload?.unit            ?? "PMD",
      parameterType: payload?.processParameter ?? "Temperature",
      startDate:     toEpochFrom(fromStr),
      endDate:       toEpochTo(toStr),
      machine:       payload?.machine         ?? "all",
      line:          payload?.line            ?? "all",
      family:        payload?.family          ?? "null",
    };

    console.log("[Process Analysis] GET /sensor/data params →", params);
    try {
      const res = await execClient.get("/sensor/data", { params });
      const raw = res.data;
      const paramKey = (raw.parameterType as string).toLowerCase();

      const pd: any[] = (raw.timeSeries ?? []).map((p: any, i: number) => ({
        time: String(i + 1),
        timestamp: p.timestamp,
        moisture: 0,
        humidity: 0,
        temperature: 0,
        [paramKey]: p.value,
        moistureTarget: 12.5, moistureLSL: 11, moistureUSL: 14, moistureLCL: 11.5, moistureUCL: 13.5,
        humidityTarget: 58, humidityLSL: 50, humidityUSL: 65, humidityLCL: 52, humidityUCL: 63,
        temperatureTarget: 31, temperatureLSL: 27, temperatureUSL: 35, temperatureLCL: 28, temperatureUCL: 34,
      }));

      const limit = { target: raw.target, lsl: raw.lsl, usl: raw.usl, lcl: raw.lcl, ucl: raw.ucl };
      const controlLimits = {
        moisture:    paramKey === "moisture"    ? limit : { target: 12.5, lsl: 11, usl: 14, lcl: 11.5, ucl: 13.5 },
        temperature: paramKey === "temperature" ? limit : { target: 31, lsl: 27, usl: 35, lcl: 28, ucl: 34 },
        humidity:    paramKey === "humidity"    ? limit : { target: 58, lsl: 50, usl: 65, lcl: 52, ucl: 63 },
      };
      const sensorStats = { avg: raw.avg, sigma: raw.sigma, pp: raw.pp, ppk: raw.ppk, dataPointCount: raw.dataPointCount };
      const { parameters } = PAGE_DATA.processAnalysis;
      return { processData: pd, parameters, controlLimits, sensorStats };
    } catch (err) {
      console.warn("[Process Analysis] API unavailable, falling back to mock data", err);
      const { parameters, controlLimits } = PAGE_DATA.processAnalysis;
      return { processData, parameters, controlLimits, sensorStats: null };
    }
  },

  // ── Alerts ───────────────────────────────────────────────────────────────
  async fetchAlertsData(payload?: { unit?: string; parameterType?: string; startDate?: number; endDate?: number }) {
    const params: Record<string, any> = {};
    if (payload?.unit) params.unit = payload.unit;
    if (payload?.parameterType) params.parameterType = payload.parameterType;
    if (payload?.startDate) params.startDate = payload.startDate;
    if (payload?.endDate) params.endDate = payload.endDate;
    const res = await apiClient.get("/alerts", { params });
    return res.data as AlertsResponse;
  },

  async acknowledgeAlert(alertId: number) {
    const res = await apiClient.post(`/alerts/${alertId}/acknowledge`, {});
    return res.data as AcknowledgeAlertResponse;
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  async fetchReportData(params: {
    reportName: string;
    unit: string;
    startDate: number;
    endDate: number;
    parameter?: string;
  }) {
    const { reportName, unit, startDate, endDate, parameter } = params;
    const p: Record<string, any> = { reportName, unit, startDate, endDate };
    if (parameter && parameter !== "All") p.parameter = parameter;
    const res = await apiClient.get("/reports", { params: p });
    return res.data;
  },

  async downloadReport(params: {
    reportName: string;
    unit: string;
    startDate: number;
    endDate: number;
    parameter?: string;
  }) {
    const { reportName, unit, startDate, endDate, parameter } = params;
    const p: Record<string, any> = { reportName, unit, startDate, endDate };
    if (parameter && parameter !== "All") p.parameter = parameter;
    const res = await apiClient.get("/reports/download", { params: p, responseType: "blob" });
    return res.data as Blob;
  },

  // ── Moisture / Blend Override ─────────────────────────────────────────────
  async fetchMoisturePositions(params?: { unit?: string; line?: string }) {
    const res = await apiClient.get("/moisture/positions", { params });
    return res.data as MoisturePosition[];
  },

  async fetchBlendRunLogs(params?: { unit?: string; machine?: string }) {
    const res = await apiClient.get("/moisture/blend-run", { params });
    return res.data as BlendRunLog[];
  },

  async addBlendRunLog(payload: {
    machineId: number;
    blendId: number;
    blendName: string;
    startDate: string;
    endDate?: string;
    overrideStatus?: boolean;
  }) {
    const res = await apiClient.post("/moisture/blend-run", payload);
    return res.data;
  },

  async applyBlendOverride(machineId: number, payload: { blendId: number; blendName: string }) {
    const res = await apiClient.put(`/moisture/blend-run/${machineId}`, payload);
    return res.data;
  },

  async cancelBlendOverride(machineId: number) {
    const res = await apiClient.delete(`/moisture/blend-run/${machineId}/manual`);
    return res.data;
  },

  // ── Settings — Sensor Targets ─────────────────────────────────────────────
  async fetchSensorTargets() {
    const res = await apiClient.get("/sensor/targets");
    return res.data as SensorTarget[];
  },

  async saveSensorTargets(payload: SensorTarget[]) {
    const res = await apiClient.put("/sensor/targets", payload);
    return res.data;
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

  // ── Alert Rules ───────────────────────────────────────────────────────────
  async fetchAlertRules(params?: { unit?: string; parameterType?: string; isEnabled?: boolean }) {
    const res = await apiClient.get("/alert-rules", { params });
    return res.data as AlertRuleApi[];
  },

  async createAlertRule(payload: AlertRulePayload) {
    const res = await apiClient.post("/alert-rules", payload);
    return res.data as { ruleId: number; message: string };
  },

  async updateAlertRule(id: number, payload: AlertRulePayload) {
    const res = await apiClient.put(`/alert-rules/${id}`, payload);
    return res.data as { message: string };
  },

  async toggleAlertRule(id: number) {
    const res = await apiClient.patch(`/alert-rules/${id}/toggle`);
    return res.data as { ruleId: number; isEnabled: boolean };
  },

  async deleteAlertRule(id: number) {
    const res = await apiClient.delete(`/alert-rules/${id}`);
    return res.data as { message: string };
  },

  // ── Tariff Master ─────────────────────────────────────────────────────────
  async fetchAllTariffs() {
    const res = await apiClient.get("/tariff");
    return res.data as TariffMaster[];
  },

  async fetchActiveTariff() {
    const res = await apiClient.get("/tariff/active");
    return res.data as TariffMaster;
  },

  async fetchTariffById(id: number) {
    const res = await apiClient.get(`/tariff/${id}`);
    return res.data as TariffMaster;
  },

  async createTariff(payload: CreateTariffPayload) {
    const res = await apiClient.post("/tariff", payload);
    return res.data as { tariffID: number; message: string };
  },

  async updateTariff(id: number, payload: UpdateTariffPayload) {
    const res = await apiClient.put(`/tariff/${id}`, payload);
    return res.data as { message: string };
  },

  async deleteTariff(id: number) {
    const res = await apiClient.delete(`/tariff/${id}`);
    return res.data as { message: string };
  },

  // ── Tariff Bands ─────────────────────────────────────────────────────────
  async fetchTariffBands(tariffId: number) {
    const res = await apiClient.get(`/tariff/${tariffId}/bands`);
    return res.data as TariffBand[];
  },

  async addTariffBand(tariffId: number, payload: TariffBandPayload) {
    const res = await apiClient.post(`/tariff/${tariffId}/bands`, payload);
    return res.data as TariffBand;
  },

  async updateTariffBand(tariffId: number, bandId: number, payload: TariffBandPayload) {
    const res = await apiClient.put(`/tariff/${tariffId}/bands/${bandId}`, payload);
    return res.data as TariffBand;
  },

  async deleteTariffBand(tariffId: number, bandId: number) {
    const res = await apiClient.delete(`/tariff/${tariffId}/bands/${bandId}`);
    return res.data as { message: string };
  },
};

export default apiClient;
