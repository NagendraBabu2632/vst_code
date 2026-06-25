import './ProcessAnalysis.css';
import { useMemo, useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import ProcessFilters from "@/components/ProcessFilters";
import Loader from "@/components/Loader/Loader";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchProcessAnalysisData,
  selectProcessLoading,
  selectProcessError,
  selectProcessData,
  selectControlLimits,
  selectSensorStats,
} from "@/redux/slices/processAnalysisSlice";
import {
  resetPageSelections,
  selectDropdownSelections,
  selectDropdownData,
  buildProcessPayload,
} from "@/redux/slices/dropdownSlice";
import { apiService } from "@/services/api";
import { motion } from "framer-motion";
import { Droplets, Thermometer, Wind, BarChart3, TrendingUp, Download, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { SPCTimeseriesChart, type SPCLineConfig } from "../../components/charts/LineChart/LineChart";
import { SPCHistogramChart } from "../../components/charts/BarChart/BarChart";

const calcStats = (values: number[], _target: number, lsl: number, usl: number) => {
  const n = values.length;
  const avg = values.reduce((s, v) => s + v, 0) / n;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / (n - 1));
  const pp = +((usl - lsl) / (6 * stdDev)).toFixed(3);
  const ppk = +(Math.min(usl - avg, avg - lsl) / (3 * stdDev)).toFixed(3);
  return { avg: +avg.toFixed(2), sigma: +stdDev.toFixed(3), pp, ppk, points: n };
};

const buildHistogramData = (values: number[], bins: number = 15) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins;
  return Array.from({ length: bins }, (_, i) => {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = values.filter((v) => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)).length;
    return { range: +((binStart + binEnd) / 2).toFixed(2), count, binStart: +binStart.toFixed(2), binEnd: +binEnd.toFixed(2) };
  });
};

interface ChartConfig extends SPCLineConfig {
  icon: React.ElementType;
  iconColor: string;
  tagId: string;
}

const chartConfigs: ChartConfig[] = [
  { title: "Moisture Control Chart", icon: Droplets, iconColor: "text-chart-moisture", dataKey: "moisture", lineColor: "hsl(170, 70%, 45%)", target: 12.5, lsl: 11.0, usl: 14.0, lcl: 11.5, ucl: 13.5, unit: "%", tagId: "MC", yDomain: [10, 15] },
  { title: "Temperature Control Chart", icon: Thermometer, iconColor: "text-critical", dataKey: "temperature", lineColor: "hsl(0, 72%, 55%)", target: 31, lsl: 27, usl: 35, lcl: 28, ucl: 34, unit: "°C", tagId: "TC", yDomain: [25, 38] },
  { title: "Humidity Control Chart", icon: Wind, iconColor: "text-chart-humidity", dataKey: "humidity", lineColor: "hsl(290, 60%, 55%)", target: 58, lsl: 50, usl: 65, lcl: 52, ucl: 63, unit: "% RH", tagId: "HC", yDomain: [45, 70] },
];

interface SPCChartProps {
  config: ChartConfig;
  delay: number;
  period: string;
}

const isMultiDayPeriod = (p: string) => p === "customLast7" || p === "customHistorical";

const PAGE_SIZE = 288;

const SPCChart = ({ config, delay, period }: SPCChartProps) => {
  const processData   = useAppSelector(selectProcessData);
  const controlLimits = useAppSelector(selectControlLimits);
  const sensorStats   = useAppSelector(selectSensorStats);
  const selections    = useAppSelector(selectDropdownSelections);

  const [viewMode, setViewMode]         = useState<"timeseries" | "histogram">("timeseries");
  const [showLimits, setShowLimits]     = useState(true);
  const [showSPCRules, setShowSPCRules] = useState(true);
  const multiDay = isMultiDayPeriod(period);
  const [xAxisMode, setXAxisMode]       = useState<"sample" | "time">("time");
  const effectiveXAxisMode: "sample" | "time" = multiDay ? "time" : xAxisMode;

  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [processData]);

  const totalPages = Math.max(1, Math.ceil(processData.length / PAGE_SIZE));
  const pagedData = useMemo(
    () => processData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [processData, page]
  );

  const allValues = useMemo(
    () => processData.map((d) => d[config.dataKey as keyof typeof d] as number).filter((v) => v !== 0),
    [processData, config.dataKey]
  );

  const stats = useMemo(() => {
    if (sensorStats) {
      return { avg: sensorStats.avg, sigma: sensorStats.sigma, pp: sensorStats.pp, ppk: sensorStats.ppk, points: sensorStats.dataPointCount };
    }
    return allValues.length >= 2 ? { ...calcStats(allValues, config.target, config.lsl, config.usl), points: allValues.length } : { avg: 0, sigma: 0, pp: 0, ppk: 0, points: 0 };
  }, [sensorStats, allValues, config.target, config.lsl, config.usl]);

  const apiLimits = controlLimits?.[config.dataKey as keyof typeof controlLimits];

  const histogramData = useMemo(() => buildHistogramData(allValues.length ? allValues : [0]), [allValues]);

  const effectiveConfig: ChartConfig = useMemo(() => {
    if (apiLimits) {
      const a = stats.avg, s = stats.sigma;
      const sigmaMin = s > 0 ? a - 3.5 * s : a - 1;
      const sigmaMax = s > 0 ? a + 3.5 * s : a + 1;
      const domainMin = +(Math.min(sigmaMin, apiLimits.lsl) - 0.5).toFixed(3);
      const domainMax = +(Math.max(sigmaMax, apiLimits.usl) + 0.5).toFixed(3);
      return {
        ...config,
        target: apiLimits.target,
        lsl:    apiLimits.lsl,
        usl:    apiLimits.usl,
        lcl:    apiLimits.lcl,
        ucl:    apiLimits.ucl,
        yDomain: [domainMin, domainMax] as [number, number],
      };
    }
    const a = stats.avg, s = stats.sigma;
    if (s <= 0) return config;
    return {
      ...config,
      lsl: +(a - 3 * s).toFixed(3),
      usl: +(a + 3 * s).toFixed(3),
      lcl: +(a - 2 * s).toFixed(3),
      ucl: +(a + 2 * s).toFixed(3),
      yDomain: [+(a - 3.5 * s).toFixed(3), +(a + 3.5 * s).toFixed(3)] as [number, number],
    };
  }, [config, apiLimits, stats.avg, stats.sigma]);

  const displayData = useMemo(() => pagedData, [pagedData]);

  const spanHours = useMemo(() => {
    if (displayData.length < 2) return 0;
    const first = new Date(displayData[0].timestamp).getTime();
    const last  = new Date(displayData[displayData.length - 1].timestamp).getTime();
    return (last - first) / (1000 * 60 * 60);
  }, [displayData]);

  const timeTickFormatter = (v: string) => {
    const d = new Date(v);
    return `${format(d, "dd MMM")}\n${format(d, "HH:mm")}`;
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await apiService.downloadProcessAnalysisData(buildProcessPayload(selections));
    } catch (err) {
      console.error("[Process Analysis] Download failed", err);
    } finally {
      setDownloading(false);
    }
  }, [selections]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0];
    const dataPoint = displayData.find((d) =>
      (effectiveXAxisMode === "time"
        ? (multiDay ? format(new Date(d.timestamp), "dd MMM") : format(new Date(d.timestamp), "HH:mm"))
        : d.time) === label
    );
    return (
      <div className="process-tooltip">
        <p className="process-tooltip-time">
          {dataPoint ? format(new Date(dataPoint.timestamp), "dd MMM yyyy, HH:mm") : label}
        </p>
        <p className="process-tooltip-value">
          {config.title.split(" ")[0]}: <span className="mono">{point.value} {config.unit}</span>
        </p>
      </div>
    );
  };

  const HistogramTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="process-tooltip">
        <p className="process-tooltip-time">Range: {d.binStart} – {d.binEnd} {config.unit}</p>
        <p className="process-tooltip-value">Count: <span className="mono">{d.count}</span></p>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }} className="chart-container">
      <div className="process-chart-head">
        <div className="process-chart-titlewrap">
          <config.icon className={config.iconColor} />
          <div>
            <h3 className="process-chart-title">{config.title}</h3>
            <p className="process-chart-sub">
              Tag: <span className="mono">{config.tagId}</span> · Unit: <span className="mono">{config.unit}</span>
            </p>
          </div>
        </div>

        <div className="process-controls">
          <div className="process-toggle-group">
            <Button variant={viewMode === "timeseries" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setViewMode("timeseries")}>
              <TrendingUp /> Timeseries
            </Button>
            <Button variant={viewMode === "histogram" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setViewMode("histogram")}>
              <BarChart3 /> Histogram
            </Button>
          </div>

          <div className="process-switch-row">
            {showLimits ? <Eye /> : <EyeOff />}
            <span>Limits</span>
            <Switch checked={showLimits} onCheckedChange={setShowLimits} />
          </div>

          <div className="process-switch-row">
            <span>SPC Zones</span>
            <Switch checked={showSPCRules} onCheckedChange={setShowSPCRules} />
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download" disabled={downloading}>
            <Download />
          </Button>
        </div>
      </div>

      <div className="process-summary">
        {[
          { label: "Points", value: stats.points },
          { label: "Std",    value: stats.sigma },
          { label: "Pp",     value: stats.pp },
          { label: "Ppk",    value: stats.ppk },
          { label: "Avg",    value: stats.avg },
        ].map((s) => (
          <div key={s.label} className="process-summary-item">
            <span className="process-summary-label">{s.label}:</span>
            <span className="process-summary-val">{s.value}</span>
          </div>
        ))}
      </div>

      {viewMode === "timeseries" && !multiDay && (
        <div className="process-xaxis-toggle">
          <Button variant={xAxisMode === "time"   ? "secondary" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setXAxisMode("time")}>Time View</Button>
          <Button variant={xAxisMode === "sample" ? "secondary" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setXAxisMode("sample")}>Sample View</Button>
        </div>
      )}

      {viewMode === "timeseries" ? (
        <SPCTimeseriesChart
          data={displayData}
          config={effectiveConfig}
          xAxisMode={effectiveXAxisMode}
          showLimits={showLimits}
          showSPCRules={showSPCRules}
          avg={stats.avg}
          sigmaBands={stats.sigma > 0 ? { avg: stats.avg, sigma: stats.sigma } : undefined}
          tooltip={<CustomTooltip />}
          timeTickFormatter={timeTickFormatter}
        />
      ) : (
        <SPCHistogramChart
          data={histogramData}
          lineColor={effectiveConfig.lineColor}
          unit={effectiveConfig.unit}
          lsl={effectiveConfig.lsl}
          usl={effectiveConfig.usl}
          target={effectiveConfig.target}
          lcl={effectiveConfig.lcl}
          ucl={effectiveConfig.ucl}
          showLimits={showLimits}
          tooltip={<HistogramTooltip />}
        />
      )}

      <div className="process-legend">
        <span className="process-legend-strong">Lines:</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--usl process-legend-line--thick" /> USL / LSL</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--ucl process-legend-line--dotted" /> UCL / LCL</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--target" /> Target</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--avg" /> Average</span>
      </div>

      {totalPages > 1 && (
        <div className="process-pagination">
          <button
            type="button"
            className="process-pagination-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </button>
          <span className="process-pagination-info">
            Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
            <span className="process-pagination-range">
              &nbsp;(points {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, processData.length)} of {processData.length})
            </span>
          </span>
          <button
            type="button"
            className="process-pagination-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </motion.div>
  );
};

const ProcessAnalysis = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectProcessLoading);
  const error = useAppSelector(selectProcessError);
  const processData = useAppSelector(selectProcessData);
  const selections = useAppSelector(selectDropdownSelections);
  const dropdownData = useAppSelector(selectDropdownData);

  const period = selections.period;

  // On mount: set default selections from loaded dropdown data, then fire the initial fetch.
  // After this, the API is only called when the user clicks Apply.
  useEffect(() => {
    const unitList             = (dropdownData?.common?.units                    ?? []) as { value: string; label: string }[];
    const unitToLineMap        = (dropdownData?.common?.unitToLineMapping         ?? {}) as Record<string, { value: string; label: string }[]>;
    const unitLineToMachineMap = (dropdownData?.common?.unitLineToMachineMapping  ?? {}) as Record<string, { value: string; label: string }[]>;
    const lineToMachMap        = (dropdownData?.common?.lineToMachineMapping      ?? {}) as Record<string, { value: string; label: string }[]>;
    const machineToBlendMap    = (dropdownData?.common?.machineToBlendMapping     ?? {}) as Record<string, { value: string; label: string }[]>;
    const unitToParamMap       = (dropdownData?.common?.unitToParamMapping        ?? {}) as Record<string, { value: string; label: string }[]>;

    const firstUnit = unitList[0]?.value ?? "PMD";
    const firstLine = unitToLineMap[firstUnit]?.[0]?.value ?? "";

    // Pick the first machine in the line that has blends (unit-aware lookup)
    const machinesInLine = unitLineToMachineMap[`${firstUnit}:${firstLine}`] ?? lineToMachMap[firstLine] ?? [];
    const firstMachine = (
      machinesInLine.find((m) => (machineToBlendMap[m.value] ?? []).length > 0) ??
      machinesInLine[0]
    )?.value ?? "";

    const firstFamily = (machineToBlendMap[firstMachine] ?? [])[0]?.value ?? "CFT";
    const firstParam  = unitToParamMap[firstUnit]?.[0]?.value ?? "Moisture";

    const defaults = {
      unit: firstUnit, line: firstLine, machine: firstMachine,
      processParameter: firstParam, family: firstFamily, period: "lastHour",
    };

    dispatch(resetPageSelections(defaults));
    dispatch(fetchProcessAnalysisData(buildProcessPayload({ ...selections, ...defaults })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  if (error) return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header-row">
        <h2 className="page-title">Process Analysis</h2>
        <ProcessFilters />
      </div>
      {loading ? (
        <Loader message="Loading Process Data…" />
      ) : processData.length ? (
        <div className="process-list">
          {(() => {
            const activeConfig = chartConfigs.find(
              (c) => c.dataKey.toLowerCase() === selections.processParameter?.toLowerCase()
            ) ?? chartConfigs[0];
            return <SPCChart key={activeConfig.dataKey} config={activeConfig} delay={0} period={period} />;
          })()}
        </div>
      ) : (
        <div className="process-no-data">
          <BarChart3 className="process-no-data__icon" />
          <p className="process-no-data__title">No Data Available</p>
          <p className="process-no-data__sub">No records found for the selected filters. Try adjusting the period or parameters.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProcessAnalysis;
