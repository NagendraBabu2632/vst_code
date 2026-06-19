import './EnergyMonitoring.css';
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Loader from "@/components/Loader/Loader";
import { motion } from "framer-motion";
import Dropdown from "@/components/Dropdown";
import EnergyTreeTable from "@/components/EnergyTreeTable";
import type { EnergyPeriod } from "@/components/EnergyTreeTable";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchEnergyMonitoringData,
  selectEnergyLoading,
  selectEnergyError,
} from "@/redux/slices/energyMonitoringSlice";
import {
  setDropdownSelection,
  resetPageSelections,
  selectDropdownSelections,
  buildEnergyPayload,
} from "@/redux/slices/dropdownSlice";

type PeriodOption = EnergyPeriod;

const periodLabels: Record<PeriodOption, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  month: "This Month",
};

const EnergyMonitoring = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectEnergyLoading);
  const error = useAppSelector(selectEnergyError);
  const selections = useAppSelector(selectDropdownSelections);
  const period = (selections.period as PeriodOption) ?? "today";

  // Reset this page's dropdowns to defaults on every mount
  useEffect(() => {
    dispatch(resetPageSelections({ period: "today" }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchEnergyMonitoringData(buildEnergyPayload(selections)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selections.period]);

  if (error) return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="energy-topbar">
        <h2 className="page-title">Energy Monitoring &amp; Efficiency</h2>
        <div className="energy-topbar-right">
          <div className="energy-field">
            <label className="energy-field-label">Period</label>
            <Dropdown
              value={period}
              onValueChange={(v) => dispatch(setDropdownSelection({ key: "period", value: v }))}
              triggerClassName="w-[150px]"
              options={(Object.keys(periodLabels) as PeriodOption[]).map((k) => ({
                value: k,
                label: periodLabels[k],
              }))}
            />
          </div>
        </div>
      </div>

      {loading ? <Loader message="Loading Energy Data…" /> : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="chart-container">
          <div className="energy-chart-head">
            <h3 className="energy-chart-title">
              {period === "today" || period === "yesterday"
                ? "Hourly Consumption (kWh) — Unit › Line › Asset"
                : "Daily Consumption (kWh) — Unit › Line › Asset"}
            </h3>
          </div>
          <EnergyTreeTable period={period} />
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default EnergyMonitoring;
