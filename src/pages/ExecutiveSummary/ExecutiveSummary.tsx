import './ExecutiveSummary.css';
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import KpiCard from "@/components/KpiCard/KpiCard";
import ExecutiveFilter, { type ExecFilterValue, type WeekOption, type MonthOption } from "@/components/ExecutiveFilter";
import Loader from "@/components/Loader/Loader";
import { format, addDays } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchExecutiveSummaryData,
  selectExecLoading,
  selectExecError,
  selectSummaryKpi,
  selectSecData,
  selectTrendData,
  selectTop5Data,
  selectAlertSummary,
  selectHumidityMoisture,
} from "@/redux/slices/executiveSummarySlice";
import type { ExecApiPayload } from "@/redux/slices/dropdownSlice";
import { apiService } from "@/services/api";
import {
  Zap, IndianRupee, Gauge, Droplets, Wind,
  Trophy, TrendingDown, BarChart3, Table2, Factory, Bell,
} from "lucide-react";
import { motion } from "framer-motion";
import { EnergyTrendAreaChart } from "../../components/charts/AreaChart/AreaChart";
import { Top5BarChart, MoistureBarChart, HumidityBarChart } from "../../components/charts/BarChart/BarChart";

const MOISTURE_SPEC = { lsl: 11.5, target: 12.5, usl: 13.5 };

const buildExecApiPayload = (filter: ExecFilterValue): ExecApiPayload => {
  const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");
  if (filter.mode === "day") {
    return {
      dateRange: { from: fmtDate(filter.date), to: fmtDate(filter.date) },
      dateFilter: "day",
      shifts: filter.shifts,
    };
  }
  if (filter.mode === "week") {
    const from = filter.week    || fmtDate(new Date());
    const to   = filter.weekEnd || fmtDate(addDays(new Date(), 6));
    return { dateRange: { from, to }, dateFilter: "week" };
  }
  // month mode — use API-provided dates directly
  const from = filter.month    || fmtDate(new Date());
  const to   = filter.monthEnd || fmtDate(new Date());
  return { dateRange: { from, to }, dateFilter: "month" };
};

type Top5Mode = "consumption" | "cost";
type Top5View = "chart" | "table";

const ExecutiveSummary = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const loading           = useAppSelector(selectExecLoading);
  const error             = useAppSelector(selectExecError);
  const summaryKpi        = useAppSelector(selectSummaryKpi);
  const secData           = useAppSelector(selectSecData);
  const trendData         = useAppSelector(selectTrendData);
  const top5Data          = useAppSelector(selectTop5Data);
  const alertSummary      = useAppSelector(selectAlertSummary);
  const humidityMoisture  = useAppSelector(selectHumidityMoisture);

  const [weeksData,  setWeeksData]  = useState<WeekOption[]>([]);
  const [monthsData, setMonthsData] = useState<MonthOption[]>([]);
  const [dropdownsReady, setDropdownsReady] = useState(false);

  const [execFilter, setExecFilter] = useState<ExecFilterValue>({
    mode: "day",
    date: new Date(),
    shifts: ["A"],
    week: "",
    weekEnd: "",
    month: "",
    monthEnd: "",
  });

  // Load week/month dropdown data first; only once both have settled do we
  // allow the Executive Summary API to be called (even for the default "day" mode).
  useEffect(() => {
    Promise.allSettled([
      apiService.fetchWeekOptions().then((data) => {
        setWeeksData(data);
        const current = data.find((w: WeekOption) => w.isCurrent);
        if (current) {
          setExecFilter((prev) => ({ ...prev, week: current.weekStartDate, weekEnd: current.weekEndDate }));
        }
      }),
      apiService.fetchMonthOptions().then((data) => {
        setMonthsData(data);
        const current = data.find((m: MonthOption) => m.isCurrent);
        if (current) {
          setExecFilter((prev) => ({ ...prev, month: current.monthStartDate, monthEnd: current.monthEndDate }));
        }
      }),
    ]).finally(() => setDropdownsReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [top5Mode, setTop5Mode] = useState<Top5Mode>("consumption");
  const [top5View, setTop5View] = useState<Top5View>("chart");

  useEffect(() => {
    if (!dropdownsReady) return;
    dispatch(fetchExecutiveSummaryData(buildExecApiPayload(execFilter)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownsReady, execFilter.mode, execFilter.date.getTime(), execFilter.week, execFilter.weekEnd, execFilter.month, execFilter.monthEnd, execFilter.shifts.join(",")]);


  // ── Derived values ────────────────────────────────────────────────────────

  // Trend chart data: map { label, kwh } → { time, actual, target }
  const trendChartData = useMemo(
    () => (trendData?.data ?? []).map((p) => ({ time: p.label, actual: p.kwh, target: 380 })),
    [trendData]
  );

  // Top-5 items enriched with contribution % and trend placeholders
  const top5Items = useMemo(() => {
    const items = top5Data?.items ?? [];
    const totalKwh  = items.reduce((s, i) => s + i.kwh, 0) || 1;
    const totalCost = items.reduce((s, i) => s + i.cost, 0) || 1;
    return items.map((item) => ({
      rank: item.rank,
      name: item.feederName,
      line: item.zone,
      consumption: item.kwh,
      cost: item.cost,
      contribution:     +((item.kwh  / totalKwh)  * 100).toFixed(1),
      costContribution: +((item.cost / totalCost) * 100).toFixed(1),
      trend: 0,
      trendPct: 0,
      status: "Running",
    }));
  }, [top5Data]);

  const sortedTop5 = useMemo(() => {
    const key = top5Mode === "consumption" ? "consumption" : "cost";
    return [...top5Items].sort((a, b) => (b as any)[key] - (a as any)[key]).map((item, i) => ({ ...item, rank: i + 1 }));
  }, [top5Mode, top5Items]);

  const moistureSensors = humidityMoisture?.moisture ?? [];

  const alertKpi = useMemo(() => ({
    total:        alertSummary?.total        ?? 0,
    critical:     alertSummary?.critical     ?? 0,
    warning:      alertSummary?.warning      ?? 0,
    acknowledged: alertSummary?.acknowledged ?? 0,
  }), [alertSummary]);

  const chartTitle =
    execFilter.mode === "day"   ? "Energy Consumption Trend (Day)"     :
    execFilter.mode === "week"  ? "Energy Consumption Trend (Weekly)"  :
    "Energy Consumption Trend (Monthly)";

  if (error)   return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="exec-filter-bar">
        <h2 className="page-title">Executive Summary</h2>
        <div className="exec-filter-bar-right">
          <ExecutiveFilter
            value={execFilter}
            onChange={setExecFilter}
            weeks={weeksData}
            months={monthsData}
          />
        </div>
      </div>

      {loading || !summaryKpi ? <Loader message="Loading Executive Summary…" /> : <>
      {/* ── KPI Row 1: Energy + SEC ──────────────────────────────────────── */}
      <div className="exec-kpi-grid">
        <KpiCard
          title="Total Energy Consumption"
          value={summaryKpi.totalKWH.toLocaleString()}
          unit="kWh"
          icon={Zap}
          accentColor="primary"
          trend={{
            value: summaryKpi.isTotalKwhUp ? summaryKpi.kwhChangePct : -summaryKpi.kwhChangePct,
            label: "vs yesterday",
            isPositive: !summaryKpi.isTotalKwhUp,
          }}
        />
        <KpiCard
          title="Total Energy Cost"
          value={`₹${summaryKpi.totalCost.toLocaleString()}`}
          icon={IndianRupee}
          accentColor="warning"
          trend={{
            value: summaryKpi.isTotalCostUp ? summaryKpi.costChangePct : -summaryKpi.costChangePct,
            label: "vs yesterday",
            isPositive: !summaryKpi.isTotalCostUp,
          }}
        />
        <KpiCard
          title="SEC (SMD)"
          value={secData?.smdSEC ?? "—"}
          unit="kWh / Million Sticks"
          subtitle="Unit: SMD"
          icon={Gauge}
          accentColor="info"
          trend={secData ? {
            value: secData.isSmdSECUp ? secData.smdSECChangePct : -secData.smdSECChangePct,
            label: secData.isSmdSECUp ? "worsening" : "improving",
            isPositive: !secData.isSmdSECUp,
          } : undefined}
        />
        <KpiCard
          title="SEC (PMD)"
          value={secData?.pmdSEC ?? "—"}
          unit="kWh / ton"
          subtitle="Unit: PMD"
          icon={Factory}
          accentColor="success"
          trend={secData ? {
            value: secData.isPmdSECUp ? secData.pmdSECChangePct : -secData.pmdSECChangePct,
            label: secData.isPmdSECUp ? "worsening" : "improving",
            isPositive: !secData.isPmdSECUp,
          } : undefined}
        />
      </div>

      {/* ── KPI Row 2: Utility + Moisture + Humidity ─────────────────────── */}
      <div className="exec-kpi-grid">
        <KpiCard
          title="Utility Energy"
          value={summaryKpi.utilityKWH.toLocaleString()}
          unit="kWh"
          subtitle="Total Utility Energy"
          icon={Zap}
          accentColor="primary"
        />

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
          <MoistureBarChart
            data={moistureSensors}
            lsl={MOISTURE_SPEC.lsl}
            target={MOISTURE_SPEC.target}
            usl={MOISTURE_SPEC.usl}
          />
          <p className="exec-drill-hint">click for Process Analysis →</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="kpi-card"
        >
          <div className="exec-card-head">
            <span className="exec-card-label">Avg Humidity</span>
            <div className="exec-card-icon-wrap exec-card-icon-wrap--humidity">
              <Wind className="exec-card-icon" />
            </div>
          </div>
          <HumidityBarChart data={humidityMoisture?.humidity} />
        </motion.div>
      </div>

      {/* ── Alerts Summary ───────────────────────────────────────────────── */}
      <div className="exec-kpi-grid exec-full-row">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/alerts")}
          className="kpi-card exec-alerts-summary-card"
        >
          <div className="exec-card-head">
            <span className="exec-card-label">Alerts Summary</span>
            <div className="exec-card-icon-wrap exec-card-icon-wrap--warning">
              <Bell className="exec-card-icon exec-card-icon--warning" />
              {alertKpi.critical > 0 && <span className="exec-alert-badge">{alertKpi.critical}</span>}
            </div>
          </div>
          <div className="exec-alert-grid exec-alert-grid--4col">
            <div className="exec-alert-tile exec-alert-tile--total">
              <div className="exec-alert-tile-value">{alertKpi.total}</div>
              <div className="exec-alert-tile-label">Total</div>
            </div>
            <div className="exec-alert-tile exec-alert-tile--critical">
              <div className="exec-alert-tile-value exec-alert-tile-value--critical">{alertKpi.critical}</div>
              <div className="exec-alert-tile-label">Critical</div>
            </div>
            <div className="exec-alert-tile exec-alert-tile--warning">
              <div className="exec-alert-tile-value exec-alert-tile-value--warning">{alertKpi.warning}</div>
              <div className="exec-alert-tile-label">Warning</div>
            </div>
            <div className="exec-alert-tile exec-alert-tile--acknowledged">
              <div className="exec-alert-tile-value exec-alert-tile-value--acknowledged">{alertKpi.acknowledged}</div>
              <div className="exec-alert-tile-label">Acknowledged</div>
            </div>
          </div>
          <p className="exec-drill-hint">click to manage alerts →</p>
        </motion.div>
      </div>

      {/* ── Trend Chart ──────────────────────────────────────────────────── */}
      <div className="exec-kpi-grid exec-full-row">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="chart-container">
          <h3 className="exec-chart-title">{chartTitle}</h3>
          <EnergyTrendAreaChart data={trendChartData} />
        </motion.div>
      </div>

      {/* ── Top 5 Electricity Consumers ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="chart-container">
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
            {sortedTop5.map((item) => (
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
                    <TrendingDown />
                    <span className="exec-down">—</span>
                  </div>
                  <span className="exec-top5-row-val">{top5Mode === "cost" ? `₹${item.cost.toLocaleString()}` : `${item.consumption.toLocaleString()} kWh`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      </>}
    </DashboardLayout>
  );
};

export default ExecutiveSummary;
