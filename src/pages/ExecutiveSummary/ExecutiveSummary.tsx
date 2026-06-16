import './ExecutiveSummary.css';
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import KpiCard from "@/components/KpiCard/KpiCard";
import ExecutiveFilter, { type ExecFilterValue } from "@/components/ExecutiveFilter";
import Loader from "@/components/Loader/Loader";
import { format, addDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchExecutiveSummaryData,
  selectExecLoading,
  selectExecError,
  selectKpiData,
  selectEnergyTrend,
  selectEquipmentEnergy,
  selectExecAlerts,
} from "@/redux/slices/executiveSummarySlice";
import {
  Zap, IndianRupee, Gauge, Droplets, Wind, AlertTriangle,
  Trophy, TrendingUp, TrendingDown, BarChart3, Table2, Factory,
} from "lucide-react";
import { motion } from "framer-motion";
import { EnergyTrendAreaChart } from "../../components/charts/AreaChart/AreaChart";
import { Top5BarChart } from "../../components/charts/BarChart/BarChart";

const MOISTURE_SPEC = { lsl: 11.5, target: 12.5, usl: 13.5 };

const getMoistureStatus = (v: number) => {
  if (v < MOISTURE_SPEC.lsl || v > MOISTURE_SPEC.usl) return "critical";
  const nearBand = (MOISTURE_SPEC.usl - MOISTURE_SPEC.lsl) * 0.15;
  if (v <= MOISTURE_SPEC.lsl + nearBand || v >= MOISTURE_SPEC.usl - nearBand) return "warning";
  return "ok";
};


const buildExecApiPayload = (filter: ExecFilterValue) => {
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  if (filter.mode === "day") {
    return {
      dateRange: { from: fmt(filter.date), to: fmt(filter.date) },
      dateFilter: "day",
      shifts: filter.shifts,
    };
  }
  if (filter.mode === "week") {
    const weekIndex = parseInt(filter.week.replace("W", ""), 10) - 1;
    const from = addDays(startOfMonth(filter.date), weekIndex * 7);
    const to = addDays(from, 6);
    const monthEnd = endOfMonth(filter.date);
    return {
      dateRange: { from: fmt(from), to: fmt(to > monthEnd ? monthEnd : to) },
      dateFilter: "week",
    };
  }
  const monthDate = parseISO(filter.month + "-01");
  return {
    dateRange: { from: fmt(startOfMonth(monthDate)), to: fmt(endOfMonth(monthDate)) },
    dateFilter: "month",
  };
};

type Top5Mode = "consumption" | "cost";
type Top5View = "chart" | "table";

const ExecutiveSummary = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const loading = useAppSelector(selectExecLoading);
  const error = useAppSelector(selectExecError);
  const kpiData = useAppSelector(selectKpiData);
  const energyTrendData = useAppSelector(selectEnergyTrend);
  const equipmentEnergyData = useAppSelector(selectEquipmentEnergy);
  const alertsData = useAppSelector(selectExecAlerts);

  const [execFilter, setExecFilter] = useState<ExecFilterValue>({
    mode: "day",
    date: new Date(),
    shifts: ["A"],
    week: "W1",
    month: format(new Date(), "yyyy-MM"),
  });
  const [top5Mode, setTop5Mode] = useState<Top5Mode>("consumption");
  const [top5View, setTop5View] = useState<Top5View>("chart");

  const handleExecFilterChange = (v: ExecFilterValue) => setExecFilter(v);

  useEffect(() => {
    dispatch(fetchExecutiveSummaryData(buildExecApiPayload(execFilter)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, execFilter.mode, execFilter.date.getTime(), execFilter.week, execFilter.month, execFilter.shifts.join(",")]);

  // Derived values — computed only when data is available
  const { top5Consumers, secSmdValue, secPmdValue, secUtilityValue, moistureSensors, moistureMax } =
    useMemo(() => {
      if (!kpiData || !equipmentEnergyData.length) {
        return {
          top5Consumers: [], secSmdValue: 0, secPmdValue: 0,
          secUtilityValue: 0, moistureSensors: [], moistureMax: 15,
        };
      }
      const totalConsumption = equipmentEnergyData.reduce((s, e) => s + e.consumption, 0);
      const totalCost = equipmentEnergyData.reduce((s, e) => s + e.cost, 0);
      const top5 = [...equipmentEnergyData]
        .sort((a, b) => b.consumption - a.consumption)
        .slice(0, 5)
        .map((eq, i) => ({
          rank: i + 1,
          name: eq.equipment,
          consumption: eq.consumption,
          cost: eq.cost,
          line: eq.line,
          status: eq.status,
          contribution: +((eq.consumption / totalConsumption) * 100).toFixed(1),
          costContribution: +((eq.cost / totalCost) * 100).toFixed(1),
          trend: eq.consumption - eq.prevConsumption,
          trendPct: +(((eq.consumption - eq.prevConsumption) / eq.prevConsumption) * 100).toFixed(1),
        }));

      const pmdProductionTons = Math.max(1, +(kpiData.productionOutput / 5).toFixed(0));
      const sensors = [
        { name: "M1", value: +(kpiData.avgMoisture - 0.4).toFixed(2) },
        { name: "M2", value: +(kpiData.avgMoisture - 0.1).toFixed(2) },
        { name: "M3", value: +(kpiData.avgMoisture + 0.2).toFixed(2) },
        { name: "M4", value: +(kpiData.avgMoisture + 0.6).toFixed(2) },
      ];

      return {
        top5Consumers: top5,
        secSmdValue: +(kpiData.totalEnergy / kpiData.productionOutput).toFixed(2),
        secPmdValue: +(kpiData.totalEnergy / pmdProductionTons).toFixed(2),
        secUtilityValue: +(kpiData.totalEnergy * 0.22).toFixed(0),
        moistureSensors: sensors,
        moistureMax: Math.max(...sensors.map((s) => s.value), MOISTURE_SPEC.usl),
      };
    }, [kpiData, equipmentEnergyData]);

  const chartTitle =
    execFilter.mode === "day" ? "Energy Consumption Trend (Day)" :
    execFilter.mode === "week" ? "Energy Consumption Trend (Weekly)" :
    "Energy Consumption Trend (Monthly)";

  const sortedTop5 = useMemo(() => {
    const key = top5Mode === "consumption" ? "consumption" : "cost";
    return [...top5Consumers].sort((a, b) => (b as any)[key] - (a as any)[key]).map((item, i) => ({ ...item, rank: i + 1 }));
  }, [top5Mode, top5Consumers]);

  const validAlerts = useMemo(
    () => alertsData.filter((a) => ["Moisture", "Humidity", "Temperature"].includes(a.parameter as string)),
    [alertsData]
  );
  const alertCounts = useMemo(() => ({
    total: validAlerts.length,
    critical: validAlerts.filter((a) => a.severity === "Critical").length,
    warning: validAlerts.filter((a) => a.severity === "Warning").length,
  }), [validAlerts]);

  if (loading) return <DashboardLayout><Loader message="Loading Executive Summary…" /></DashboardLayout>;
  if (error) return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;
  if (!kpiData) return null;

  return (
    <DashboardLayout>
      <div className="exec-filter-bar">
        <h2 className="page-title">Executive Summary</h2>
        <div className="exec-filter-bar-right">
          <ExecutiveFilter value={execFilter} onChange={handleExecFilterChange} />
        </div>
      </div>

      <div className="exec-kpi-grid">
        <KpiCard title="Total Energy Consumption" value={kpiData.totalEnergy} unit="kWh" icon={Zap} accentColor="primary" trend={{ value: 3.2, label: "vs yesterday" }} />
        <KpiCard title="Total Energy Cost" value={`₹${kpiData.energyCost.toLocaleString()}`} icon={IndianRupee} accentColor="warning" trend={{ value: 2.8, label: "vs yesterday" }} />
        <KpiCard title="SEC (SMD)" value={secSmdValue} unit="kWh / Million Sticks" subtitle="Unit: SMD" icon={Gauge} accentColor="info" trend={{ value: -1.5, label: "improving" }} />
        <KpiCard title="SEC (PMD)" value={secPmdValue} unit="kWh / ton" subtitle="Unit: PMD" icon={Factory} accentColor="success" trend={{ value: -0.8, label: "improving" }} />
      </div>

      <div className="exec-kpi-grid">
        <KpiCard title="SEC (Utility)" value={secUtilityValue} unit="kWh" subtitle="Total Utility Energy" icon={Zap} accentColor="primary" trend={{ value: -1.2, label: "improving" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/process")}
          className="kpi-card exec-kpi-card-wide"
        >
          <div className="exec-card-head">
            <span className="exec-card-label">Moisture Sensors Overview</span>
            <div className="exec-card-icon-wrap"><Droplets className="exec-card-icon" /></div>
          </div>
          <div className="exec-moisture-list">
            {moistureSensors.map((s) => {
              const status = getMoistureStatus(s.value);
              const pct = Math.min(100, (s.value / moistureMax) * 100);
              return (
                <div key={s.name} className="exec-moisture-row">
                  <span className="exec-moisture-name">{s.name}</span>
                  <div className="exec-moisture-bar">
                    <div className={`exec-moisture-fill exec-moisture-fill--${status}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`exec-moisture-value exec-moisture-value--${status}`}>{s.value}%</span>
                </div>
              );
            })}
          </div>
          <p className="exec-drill-hint">click for Process Analysis →</p>
        </motion.div>

        <KpiCard title="Avg Humidity" value={kpiData.avgHumidity} unit="% RH" icon={Wind} accentColor="humidity" />
      </div>

      <div className="exec-kpi-grid exec-full-row">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="kpi-card exec-kpi-card-wide">
          <div className="exec-card-head">
            <span className="exec-card-label">Active Alerts</span>
            <div className="exec-card-icon-wrap exec-card-icon-wrap--warning">
              <AlertTriangle className="exec-card-icon exec-card-icon--warning" />
              <span className="exec-alert-badge">{alertCounts.total}</span>
            </div>
          </div>
          <div className="exec-alert-grid">
            <div className="exec-alert-tile exec-alert-tile--total">
              <div className="exec-alert-tile-value">{alertCounts.total}</div>
              <div className="exec-alert-tile-label">Total</div>
            </div>
            <div className="exec-alert-tile exec-alert-tile--critical">
              <div className="exec-alert-tile-value exec-alert-tile-value--critical">{alertCounts.critical}</div>
              <div className="exec-alert-tile-label">Critical</div>
            </div>
            <div className="exec-alert-tile exec-alert-tile--warning">
              <div className="exec-alert-tile-value exec-alert-tile-value--warning">{alertCounts.warning}</div>
              <div className="exec-alert-tile-label">Warning</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="exec-kpi-grid exec-full-row">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="chart-container">
          <h3 className="exec-chart-title">{chartTitle}</h3>
          <EnergyTrendAreaChart data={energyTrendData} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="chart-container">
        <div className="exec-top5-head">
          <div className="exec-top5-titlewrap">
            <Trophy />
            <h3 className="exec-chart-title exec-chart-title--no-margin">Top 5 Electricity Consumers</h3>
          </div>
          <div className="exec-top5-controls">
            <div className="exec-top5-pill">
              <button type="button" onClick={() => setTop5Mode("consumption")} className={top5Mode === "consumption" ? "is-active" : ""}>kWh</button>
              <button type="button" onClick={() => setTop5Mode("cost")} className={top5Mode === "cost" ? "is-active" : ""}>₹ Cost</button>
            </div>
            <div className="exec-top5-pill exec-top5-iconpill">
              <button type="button" onClick={() => setTop5View("chart")} className={top5View === "chart" ? "is-active" : ""} aria-label="Chart view"><BarChart3 /></button>
              <button type="button" onClick={() => setTop5View("table")} className={top5View === "table" ? "is-active" : ""} aria-label="Table view"><Table2 /></button>
            </div>
          </div>
        </div>

        {top5View === "chart" ? (
          <Top5BarChart data={sortedTop5} mode={top5Mode} />
        ) : (
          <div className="exec-top5-tablelist">
            {sortedTop5.map((item) => {
              const isUp = item.trendPct >= 0;
              return (
                <div key={item.name} className="exec-top5-row">
                  <div className="exec-top5-row-left">
                    <span className="exec-rank-pill">#{item.rank}</span>
                    <div>
                      <span className="exec-top5-row-name">{item.name}</span>
                      <span className="exec-top5-row-line">{item.line}</span>
                    </div>
                  </div>
                  <div className="exec-top5-row-right">
                    <span className="exec-top5-row-pct">{top5Mode === "consumption" ? `${item.contribution}%` : `${item.costContribution}%`}</span>
                    <div className="exec-trend-cell">
                      {isUp ? <TrendingUp /> : <TrendingDown />}
                      <span className={isUp ? "exec-up" : "exec-down"}>{item.trendPct > 0 ? "+" : ""}{item.trendPct}%</span>
                    </div>
                    <span className="exec-top5-row-val">{top5Mode === "cost" ? `₹${item.cost.toLocaleString()}` : `${item.consumption.toLocaleString()} kWh`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default ExecutiveSummary;
