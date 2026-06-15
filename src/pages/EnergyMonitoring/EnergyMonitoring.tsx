import './EnergyMonitoring.css';
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import { motion } from "framer-motion";
import Dropdown from "@/components/Dropdown";
import EnergyTreeTable from "@/components/EnergyTreeTable";
import type { EnergyPeriod } from "@/components/EnergyTreeTable";

type PeriodOption = EnergyPeriod;

const periodLabels: Record<PeriodOption, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  month: "This Month",
};

const EnergyMonitoring = () => {
  const [period, setPeriod] = useState<PeriodOption>("today");
  const [shift, setShift] = useState<string>("All Shifts");

  return (
    <DashboardLayout>
      <div className="energy-topbar">
        <h2 className="page-title">Energy Monitoring &amp; Efficiency</h2>
        <div className="energy-topbar-right">
          <div className="energy-field">
            <label className="energy-field-label">Period</label>
            <Dropdown
              value={period}
              onValueChange={(v) => setPeriod(v as PeriodOption)}
              triggerClassName="w-[150px]"
              options={(Object.keys(periodLabels) as PeriodOption[]).map((k) => ({
                value: k,
                label: periodLabels[k],
              }))}
            />
          </div>
          <div className="energy-field">
            <label className="energy-field-label">Shift</label>
            <Dropdown
              value={shift}
              onValueChange={setShift}
              triggerClassName="w-[140px]"
              options={["All Shifts", "Shift A", "Shift B", "Shift C"]}
            />
          </div>
        </div>
      </div>

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
    </DashboardLayout>
  );
};

export default EnergyMonitoring;
