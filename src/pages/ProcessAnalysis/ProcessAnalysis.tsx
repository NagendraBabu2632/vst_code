import './ProcessAnalysis.css';
import { useMemo, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import ProcessFilters from "@/components/ProcessFilters";
import { processData } from "@/data/mockData";
import { motion } from "framer-motion";
import { Droplets, Thermometer, Wind, BarChart3, TrendingUp, Download, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { SPCTimeseriesChart, type SPCLineConfig } from "@/components/charts/LineChart";
import { SPCHistogramChart } from "@/components/charts/BarChart";

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

interface SPCChartProps { config: ChartConfig; delay: number; }

const SPCChart = ({ config, delay }: SPCChartProps) => {
  const [viewMode, setViewMode] = useState<"timeseries" | "histogram">("timeseries");
  const [showLimits, setShowLimits] = useState(true);
  const [showSPCRules, setShowSPCRules] = useState(true);
  const [xAxisMode, setXAxisMode] = useState<"sample" | "time">("time");

  const values = processData.map((d) => d[config.dataKey as keyof typeof d] as number);
  const stats = useMemo(() => calcStats(values, config.target, config.lsl, config.usl), []);
  const histogramData = useMemo(() => buildHistogramData(values), []);

  // Derive USL/LSL from ±3σ of the average for all charts
  const useSigma = true;
  const effectiveConfig: ChartConfig = useMemo(() => {
    if (!useSigma) return config;
    const a = stats.avg, s = stats.sigma;
    return {
      ...config,
      lsl: +(a - 3 * s).toFixed(3),
      usl: +(a + 3 * s).toFixed(3),
      lcl: +(a - 2 * s).toFixed(3),
      ucl: +(a + 2 * s).toFixed(3),
      yDomain: [+(a - 3.5 * s).toFixed(3), +(a + 3.5 * s).toFixed(3)] as [number, number],
    };
  }, [useSigma, stats.avg, stats.sigma]);

  const spanHours = useMemo(() => {
    if (processData.length < 2) return 0;
    const first = new Date(processData[0].timestamp).getTime();
    const last = new Date(processData[processData.length - 1].timestamp).getTime();
    return (last - first) / (1000 * 60 * 60);
  }, []);

  const timeTickFormatter = (v: string) => {
    const d = new Date(v);
    if (spanHours <= 24) return format(d, "HH:mm");
    if (spanHours <= 24 * 7) return format(d, "dd MMM HH:mm");
    return format(d, "dd MMM");
  };

  const handleDownload = useCallback(() => {
    const csv = ["Timestamp,Sample,Value", ...processData.map((d) => `${d.timestamp},${d.time},${d[config.dataKey as keyof typeof d]}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.dataKey}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config.dataKey]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0];
    const dataPoint = processData.find((d) => (xAxisMode === "time" ? format(new Date(d.timestamp), "HH:mm") : d.time) === label);
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
            <Button variant={viewMode === "timeseries" ? "default" : "ghost"} size="sm" className="process-btn-view" onClick={() => setViewMode("timeseries")}>
              <TrendingUp /> Timeseries
            </Button>
            <Button variant={viewMode === "histogram" ? "default" : "ghost"} size="sm" className="process-btn-view" onClick={() => setViewMode("histogram")}>
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

          <Button variant="ghost" size="icon" className="process-btn-icon" onClick={handleDownload} title="Export CSV">
            <Download />
          </Button>
        </div>
      </div>

      <div className="process-summary">
        {[
          { label: "Points", value: stats.points },
          { label: "Std", value: stats.sigma },
          { label: "Pp", value: stats.pp },
          { label: "Ppk", value: stats.ppk },
          { label: "Avg", value: stats.avg },
        ].map((s) => (
          <div key={s.label} className="process-summary-item">
            <span className="process-summary-label">{s.label}:</span>
            <span className="process-summary-val">{s.value}</span>
          </div>
        ))}
      </div>

      {viewMode === "timeseries" && (
        <div className="process-xaxis-toggle">
          <Button variant={xAxisMode === "time" ? "secondary" : "ghost"} size="sm" className="process-btn-xs" onClick={() => setXAxisMode("time")}>Time View</Button>
          <Button variant={xAxisMode === "sample" ? "secondary" : "ghost"} size="sm" className="process-btn-xs" onClick={() => setXAxisMode("sample")}>Sample View</Button>
        </div>
      )}

      {viewMode === "timeseries" ? (
        <SPCTimeseriesChart
          data={processData}
          config={effectiveConfig}
          xAxisMode={xAxisMode}
          showLimits={showLimits}
          showSPCRules={showSPCRules}
          avg={stats.avg}
          sigmaBands={useSigma ? { avg: stats.avg, sigma: stats.sigma } : undefined}
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
          showLimits={showLimits}
          tooltip={<HistogramTooltip />}
        />
      )}

      <div className="process-legend">
        <span className="process-legend-strong">Lines:</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--usl" /> USL / LSL</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--ucl" /> UCL / LCL</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--target" /> Target</span>
        <span className="process-legend-item"><span className="process-legend-line process-legend-line--avg" /> Average</span>
      </div>
    </motion.div>
  );
};

const ProcessAnalysis = () => {
  return (
    <DashboardLayout title="Process Analysis">
      <ProcessFilters />
      <div className="process-list">
        {chartConfigs.map((config, i) => (
          <SPCChart key={config.dataKey} config={config} delay={i * 0.1} />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ProcessAnalysis;
