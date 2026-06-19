// ─── Executive Summary API Endpoint Configurations ───────────────────────────

export const EXEC_ENDPOINTS = {
  SUMMARY:       '/executive/summary',
  SEC:           '/executive/sec',
  TREND:         '/executive/trend',
  TOP_CONSUMERS: '/executive/top-consumers',
} as const;

// A=1, B=2, C=3, Daily(D)=4
const SHIFT_NUMBER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };

interface ExecPayload {
  dateFilter: string;
  dateRange?: { from?: string; to?: string };
  shifts?: string[];
}

/**
 * Build flat query params for day/week/month mode endpoints.
 * Maps ExecApiPayload → { period, start_date, end_date, shift_detail }
 * Shifts encoded as numbers: A→1, B→2, C→3, Daily→4
 */
export const buildExecParams = (payload: ExecPayload): Record<string, any> => {
  const params: Record<string, any> = {
    period:     payload.dateFilter,
    start_date: payload.dateRange?.from,
    end_date:   payload.dateRange?.to,
  };
  if (payload.dateFilter === "day") {
    // Day mode: encode selected shifts (A→1, B→2, C→3, D→4)
    if (payload.shifts?.length) {
      params.shift_detail = payload.shifts
        .map((s) => SHIFT_NUMBER[s] ?? s)
        .join('');
    }
  } else {
    // Week / month mode: always send 4 (all shifts + summary)
    params.shift_detail = 4;
  }
  return params;
};

// ─── Mock responses (used while real backend is unavailable) ─────────────────

const _trend48 = Array.from({ length: 48 }, (_, i) => ({
  label: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
  kwh:   +(290 + Math.sin(i / 4) * 90 + (i >= 16 && i <= 36 ? 60 : 0)).toFixed(1),
}));

const _trendDaily = Array.from({ length: 30 }, (_, i) => ({
  label: `Day ${i + 1}`,
  kwh:   +(620 + Math.sin(i / 3) * 120 + (i % 7 < 5 ? 80 : 0)).toFixed(1),
}));

export const EXEC_MOCK = {
  summary: {
    totalKWH:            24580,
    totalCost:           196640,
    utilityKWH:          5408,
    kwhChangePct:        3.2,
    costChangePct:       2.8,
    utilityKwhChangePct: 4.2,
    isTotalKwhUp:        true,
    isTotalCostUp:       true,
    isUtilityKwhUp:      false,
    avgMoisture:         12.4,
    avgHumidity:         58.2,
    avgTemperature:      30.8,
  },

  sec: {
    pmdSEC:           8.45,
    smdSEC:           12.30,
    pmdSECChangePct:  0.8,
    smdSECChangePct:  1.5,
    isPmdSECUp:       false,
    isSmdSECUp:       false,
  },

  trendDay: {
    granularity: 'hourly',
    data: _trend48,
  },

  trendWeekMonth: {
    granularity: 'daily',
    data: _trendDaily,
  },

  top5: {
    kpiType: 'top5',
    items: [
      { rank: 1, feederName: 'Mixer-01',       zone: 'PMD-L1', kwh: 4800, cost: 38400 },
      { rank: 2, feederName: 'Dryer-02',        zone: 'PMD-L2', kwh: 3920, cost: 31360 },
      { rank: 3, feederName: 'Compressor-01',   zone: 'SMD-L1', kwh: 3450, cost: 27600 },
      { rank: 4, feederName: 'Oven-01',         zone: 'SMD-L2', kwh: 2870, cost: 22960 },
      { rank: 5, feederName: 'Conveyor-03',     zone: 'PMD-L3', kwh: 2100, cost: 16800 },
    ],
  },

  pollution: {
    kpiType: 'pollution',
    items: [
      { rank: 1, feederName: 'STP-01',          zone: 'Utility', kwh: 320,  cost: 2560 },
      { rank: 2, feederName: 'Scrubber-01',     zone: 'Utility', kwh: 210,  cost: 1680 },
      { rank: 3, feederName: 'Incinerator-01',  zone: 'Utility', kwh: 175,  cost: 1400 },
      { rank: 4, feederName: 'STP-02',          zone: 'Utility', kwh: 145,  cost: 1160 },
    ],
  },

};
