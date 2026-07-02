import './EnergyMonitoring.css';
import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Loader from "@/components/Loader/Loader";
import { motion } from "framer-motion";
import { CalendarIcon } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import EnergyTreeTable from "@/components/EnergyTreeTable";
import type { EnergyPeriod } from "@/components/EnergyTreeTable";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

type PeriodOption = EnergyPeriod | "custom";

const periodLabels: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  month: "This Month",
  custom: "Custom Range",
};

const EnergyMonitoring = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectEnergyLoading);
  const error = useAppSelector(selectEnergyError);
  const selections = useAppSelector(selectDropdownSelections);
  const period = (selections.period as PeriodOption) ?? "today";

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate,   setEndDate]   = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen,   setEndOpen]   = useState(false);

  // Reset this page's dropdowns to defaults on every mount
  useEffect(() => {
    dispatch(resetPageSelections({ period: "today" }));
  }, [dispatch]);

  useEffect(() => {
    if (period === "custom" && startDate)
      dispatch(setDropdownSelection({ key: "dateRangeFrom", value: format(startDate, "yyyy-MM-dd") }));
  }, [dispatch, period, startDate]);

  useEffect(() => {
    if (period === "custom" && endDate)
      dispatch(setDropdownSelection({ key: "dateRangeTo", value: format(endDate, "yyyy-MM-dd") }));
  }, [dispatch, period, endDate]);

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return;
    dispatch(fetchEnergyMonitoringData(buildEnergyPayload(selections)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selections.period, selections.dateRangeFrom, selections.dateRangeTo, startDate, endDate]);

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
              options={Object.keys(periodLabels).map((k) => ({
                value: k,
                label: periodLabels[k],
              }))}
            />
          </div>

          {period === "custom" && (
            <>
              <div className="energy-field">
                <label className="energy-field-label">Start Date</label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="reports-date-btn">
                      <CalendarIcon className="reports-cal-icon" />
                      {startDate ? format(startDate, "dd MMM yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={startDate} autoFocus
                      fromDate={subMonths(new Date(), 6)} toDate={new Date()}
                      disabled={(d) => d > new Date() || d < subMonths(new Date(), 6)}
                      onSelect={(date) => { setStartDate(date); if (date && endDate && endDate < date) setEndDate(undefined); setStartOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="energy-field">
                <label className="energy-field-label">End Date</label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="reports-date-btn">
                      <CalendarIcon className="reports-cal-icon" />
                      {endDate ? format(endDate, "dd MMM yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={endDate} autoFocus
                      fromDate={startDate ?? subMonths(new Date(), 6)} toDate={new Date()}
                      disabled={(d) => d > new Date() || d < (startDate ?? subMonths(new Date(), 6))}
                      onSelect={(date) => { setEndDate(date); setEndOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
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
          <EnergyTreeTable period={period as EnergyPeriod} />
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default EnergyMonitoring;
