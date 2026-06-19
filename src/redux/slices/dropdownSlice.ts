import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";
import { format, subDays, startOfMonth } from "date-fns";

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
  unit: string;
  line: string;
  machine: string;
  dateRange: { from: string; to: string };
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
export const buildProcessPayload = (s: DropdownSelections): ProcessApiPayload => ({
  unit: s.unit,
  line: s.line,
  machine: s.machine,
  processParameter: s.processParameter,
  family: s.family,
  dateRange: getDateRangeFromPeriod(s.period),
});

/** Alerts: unit, line, machine + dateRange */
export const buildAlertsPayload = (s: DropdownSelections): AlertsApiPayload => ({
  unit: s.unit,
  line: s.line,
  machine: s.machine,
  dateRange: getDateRangeFromPeriod(s.period),
});

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
