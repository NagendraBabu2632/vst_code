// Hierarchical energy consumption dataset: Unit → Line → Asset
// 24 hour-wise consumption values (kWh) per row, starting at 06:00.

export interface EnergyTreeAsset {
  id: string;
  name: string;
  hourly: number[]; // length 24, ordered to match HOUR_LABELS
}

export interface EnergyTreeLine {
  id: string;
  name: string;
  assets: EnergyTreeAsset[];
}

export interface EnergyTreeUnit {
  id: string;
  name: string;
  lines: EnergyTreeLine[];
}

// Hour labels starting at 06:00 AM through to 05:00 the next morning.
const formatHour = (n: number) => {
  const period = n < 12 || n === 24 ? "AM" : "PM";
  const h = n % 12 === 0 ? 12 : n % 12;
  return `${String(h).padStart(2, "0")} ${period}`;
};
export const HOUR_LABELS: string[] = Array.from({ length: 24 }, (_, i) => {
  const start = (6 + i) % 24;
  const end = (start + 1) % 24;
  return `${formatHour(start)} - ${formatHour(end)}`;
});


// Deterministic pseudo-random so values are stable across renders.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hourlyFor(seed: number, base: number, peak: number): number[] {
  const rnd = seeded(seed);
  return Array.from({ length: 24 }, (_, i) => {
    // i=0 corresponds to 06-07 (start of day shift), peak hours roughly 06-18 local.
    const hourOfDay = (6 + i) % 24;
    const dayBoost = hourOfDay >= 6 && hourOfDay <= 18 ? peak : 0;
    return +(base + rnd() * (peak * 0.3) + dayBoost).toFixed(1);
  });
}

export const energyTree: EnergyTreeUnit[] = [
  {
    id: "PMD",
    name: "PMD",
    lines: [
      {
        id: "PMD-L1",
        name: "Line 1",
        assets: [
          { id: "PMD-L1-A1", name: "Compressor A", hourly: hourlyFor(11, 30, 25) },
          { id: "PMD-L1-A2", name: "Dryer B", hourly: hourlyFor(12, 22, 18) },
          { id: "PMD-L1-A3", name: "Motor 1", hourly: hourlyFor(13, 14, 10) },
        ],
      },
      {
        id: "PMD-L2",
        name: "Line 2",
        assets: [
          { id: "PMD-L2-A1", name: "Motor C", hourly: hourlyFor(21, 38, 24) },
          { id: "PMD-L2-A2", name: "Conveyor 2", hourly: hourlyFor(22, 12, 8) },
        ],
      },
    ],
  },
  {
    id: "SMD",
    name: "SMD",
    lines: [
      {
        id: "SMD-L3",
        name: "Line 3",
        assets: [
          { id: "SMD-L3-A1", name: "Furnace D", hourly: hourlyFor(31, 55, 30) },
          { id: "SMD-L3-A2", name: "Pump 3", hourly: hourlyFor(32, 18, 12) },
          { id: "SMD-L3-A3", name: "Blower 3", hourly: hourlyFor(33, 20, 14) },
        ],
      },
      {
        id: "SMD-L4",
        name: "Line 4",
        assets: [
          { id: "SMD-L4-A1", name: "Pump E", hourly: hourlyFor(41, 12, 9) },
          { id: "SMD-L4-A2", name: "Mixer 4", hourly: hourlyFor(42, 24, 16) },
        ],
      },
      {
        id: "SMD-L5",
        name: "Line 5",
        assets: [
          { id: "SMD-L5-A1", name: "Conveyor F", hourly: hourlyFor(51, 8, 6) },
          { id: "SMD-L5-A2", name: "Sealer 5", hourly: hourlyFor(52, 16, 11) },
        ],
      },
    ],
  },
];

export function sumHourly(rows: { hourly: number[] }[]): number[] {
  return Array.from({ length: 24 }, (_, i) =>
    +rows.reduce((s, r) => s + (r.hourly[i] ?? 0), 0).toFixed(1),
  );
}
