import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import { format, subDays, subHours, startOfMonth } from "date-fns";

// ─── Selections shape ─────────────────────────────────────────────────────────
export interface DropdownSelections {
  unit: string;
  line: string;
  machine: string;
  shift: string;
  period: string;
  parameter: string;
  family: string;
  processParameter: string;
  alertStatus: string;
  dateRangeFrom: string;
  dateRangeTo: string;
  /** Executive Summary date mode: "day" | "week" | "month" */
  dateFilter: string;
}

// ─── API payload shape (sent with every page request) ────────────────────────
export interface ApiPayload {
  unit: string;
  line: string;
  machine: string;
  shift: string;
  dateRange: { from: string; to: string };
  /** Executive Summary date filter mode */
  dateFilter?: string;
  parameter?: string;
  family?: string;
  processParameter?: string;
}

// ─── Page-specific payload shapes ─────────────────────────────────────────────
export interface ExecApiPayload {
  dateRange: { from: string; to: string };
  dateFilter: string;
  shifts?: string[];
}

export interface EnergyApiPayload {
  shift: string;
  dateRange: { from: string; to: string };
  /** Page-level period: "today" | "yesterday" | "7days" | "30days" | "month" */
  period: string;
}

export interface ProcessApiPayload {
  unit: string;
  line: string;
  machine: string;
  processParameter: string;
  family: string;
  dateRange: { from: string; to: string };
}

export interface AlertsApiPayload {
  unit?: string;
  parameterType?: string;
  startDate?: number;
  endDate?: number;
}

export interface ReportsApiPayload {
  unit: string;
  line: string;
  machine: string;
  family: string;
  shift: string;
  dateRange: { from: string; to: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const todayStr = () => format(new Date(), "yyyy-MM-dd");

const getDateRangeFromPeriod = (period: string): { from: string; to: string } => {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  switch (period) {
    case "lastHour":    return { from: today, to: today };
    case "today":       return { from: today, to: today };
    case "yesterday": {
      const y = format(subDays(now, 1), "yyyy-MM-dd");
      return { from: y, to: y };
    }
    case "last7":
    case "7days":       return { from: format(subDays(now, 6), "yyyy-MM-dd"), to: today };
    case "last30":
    case "30days":      return { from: format(subDays(now, 29), "yyyy-MM-dd"), to: today };
    case "thisMonth":
    case "month":       return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: today };
    default:            return { from: today, to: today };
  }
};

/** Build the standard API payload from current dropdown selections. */
export const buildApiPayload = (selections: DropdownSelections): ApiPayload => ({
  unit: selections.unit,
  line: selections.line,
  machine: selections.machine,
  shift: selections.shift,
  dateRange:
    selections.period === "custom"
      ? { from: selections.dateRangeFrom, to: selections.dateRangeTo }
      : getDateRangeFromPeriod(selections.period),
  dateFilter: selections.dateFilter || undefined,
  parameter: selections.parameter,
  family: selections.family,
  processParameter: selections.processParameter,
});

/** Energy Monitoring: shift + dateRange + period */
export const buildEnergyPayload = (s: DropdownSelections): EnergyApiPayload => ({
  shift: s.shift,
  period: s.period,
  dateRange:
    s.period === "custom"
      ? { from: s.dateRangeFrom, to: s.dateRangeTo }
      : getDateRangeFromPeriod(s.period),
});

/** Process Analysis: unit, line, machine, processParameter, family + dateRange */
export const buildProcessPayload = (s: DropdownSelections): ProcessApiPayload => {
  let dateRange: { from: string; to: string };
  if (s.period === "customLast7" || s.period === "customHistorical") {
    dateRange = { from: s.dateRangeFrom, to: s.dateRangeTo };
  } else if (s.period === "lastHour") {
    const now = new Date();
    dateRange = {
      from: format(subHours(now, 1), "yyyy-MM-dd HH:mm:ss"),
      to:   format(now,              "yyyy-MM-dd HH:mm:ss"),
    };
  } else {
    dateRange = getDateRangeFromPeriod(s.period);
  }
  return {
    unit: s.unit,
    line: s.line,
    machine: s.machine,
    processParameter: s.processParameter,
    family: s.family,
    dateRange,
  };
};

export const periodToTimestamps = (period: string): { startDate: number; endDate: number } => {
  const now = Date.now();
  switch (period) {
    case "last1h":
    case "lastHour":  return { startDate: now - 60 * 60 * 1000, endDate: now };
    case "last24h":   return { startDate: now - 24 * 60 * 60 * 1000, endDate: now };
    case "last1m":
    case "last30":
    case "30days":    return { startDate: now - 30 * 24 * 60 * 60 * 1000, endDate: now };
    default: {
      const dr = getDateRangeFromPeriod(period);
      return {
        startDate: new Date(dr.from + "T00:00:00").getTime(),
        endDate:   new Date(dr.to   + "T23:59:59").getTime(),
      };
    }
  }
};

/** Alerts: unit, parameterType + timestamp range */
export const buildAlertsPayload = (s: DropdownSelections, parameterType?: string): AlertsApiPayload => {
  let startDate: number;
  let endDate: number;
  if (s.period === "custom" && s.dateRangeFrom && s.dateRangeTo) {
    startDate = new Date(s.dateRangeFrom + "T00:00:00").getTime();
    endDate   = new Date(s.dateRangeTo   + "T23:59:59").getTime();
  } else {
    ({ startDate, endDate } = periodToTimestamps(s.period || "last24h"));
  }
  return {
    unit: s.unit || undefined,
    parameterType: parameterType && parameterType !== "All" ? parameterType : undefined,
    startDate,
    endDate,
  };
};

/** Reports: unit, line, machine, family, shift + dateRange */
export const buildReportsPayload = (s: DropdownSelections): ReportsApiPayload => ({
  unit: s.unit,
  line: s.line,
  machine: s.machine,
  family: s.family,
  shift: s.shift,
  dateRange:
    s.period === "custom"
      ? { from: s.dateRangeFrom, to: s.dateRangeTo }
      : getDateRangeFromPeriod(s.period),
});

/** Reports epoch range: unit + startDate/endDate as epoch ms for the real API */
export const buildReportsEpochPayload = (s: DropdownSelections): { unit: string; startDate: number; endDate: number } => {
  if (s.period === "custom") {
    const now = Date.now();
    return {
      unit: s.unit,
      startDate: s.dateRangeFrom ? new Date(s.dateRangeFrom + "T00:00:00").getTime() : now - 30 * 24 * 60 * 60 * 1000,
      endDate:   s.dateRangeTo   ? new Date(s.dateRangeTo   + "T23:59:59").getTime() : now,
    };
  }
  const { startDate, endDate } = periodToTimestamps(s.period);
  return { unit: s.unit, startDate, endDate };
};

// ─── Slice state ──────────────────────────────────────────────────────────────
interface DropdownState {
  data: Record<string, any> | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  selections: DropdownSelections;
}

const initialState: DropdownState = {
  data: null,
  loading: false,
  error: null,
  loaded: false,
  selections: {
    unit: "all",
    line: "all",
    machine: "all",
    shift: "all",
    period: "today",
    parameter: "all",
    family: "all",
    processParameter: "Moisture",
    alertStatus: "all",
    dateRangeFrom: todayStr(),
    dateRangeTo: todayStr(),
    dateFilter: "day",
  },
};

// ─── Thunk ────────────────────────────────────────────────────────────────────
export const fetchDropdownData = createAsyncThunk(
  "dropdown/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.fetchDropdownData();
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to fetch dropdown data");
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { dropdown: DropdownState };
      return !state.dropdown.loaded && !state.dropdown.loading;
    },
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const dropdownSlice = createSlice({
  name: "dropdown",
  initialState,
  reducers: {
    setDropdownSelection(
      state,
      action: PayloadAction<{ key: keyof DropdownSelections; value: string }>
    ) {
      (state.selections as any)[action.payload.key] = action.payload.value;
    },
    resetPageSelections(
      state,
      action: PayloadAction<Partial<DropdownSelections>>
    ) {
      Object.assign(state.selections, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDropdownData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDropdownData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload as Record<string, any>;
        state.loaded = true;

        // Auto-select first option from each dropdown category once data arrives
        const d = action.payload as any;
        const first = (arr: any[] | undefined) => arr?.[0]?.value;

        const unit       = first(d?.common?.units);
        const line       = first(d?.common?.lines);
        const machine    = first(d?.common?.machines);
        const shift      = first(d?.common?.shifts);
        const param      = first(d?.common?.parameters);
        const family     = first(d?.common?.families);
        const procParam  = first(d?.processAnalysis?.processParameter?.options);
        // Executive Summary date filter: first option from the period tabs (Day/Week/Month)
        const dateFilter = first(d?.executiveSummary?.period?.options);

        if (unit)       state.selections.unit             = unit;
        if (line)       state.selections.line             = line;
        if (machine)    state.selections.machine          = machine;
        if (shift)      state.selections.shift            = shift;
        if (param)      state.selections.parameter        = param;
        if (family)     state.selections.family           = family;
        if (procParam)  state.selections.processParameter = procParam;
        if (dateFilter) state.selections.dateFilter       = dateFilter;
      })
      .addCase(fetchDropdownData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setDropdownSelection, resetPageSelections } = dropdownSlice.actions;
export default dropdownSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectDropdownData      = (state: { dropdown: DropdownState }) => state.dropdown.data;
export const selectDropdownLoaded    = (state: { dropdown: DropdownState }) => state.dropdown.loaded;
export const selectDropdownLoading   = (state: { dropdown: DropdownState }) => state.dropdown.loading;
export const selectDropdownSelections = (state: { dropdown: DropdownState }) => state.dropdown.selections;
