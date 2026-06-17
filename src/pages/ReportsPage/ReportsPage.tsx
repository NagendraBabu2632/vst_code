import './ReportsPage.css';
import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Loader from "@/components/Loader/Loader";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchReportsData,
  selectReportsLoading,
  selectReportsError,
  selectReportsEnergyTrend,
  selectReportsEquipmentEnergy,
  selectReportsProcessData,
  selectReportsAlerts,
} from "@/redux/slices/reportsSlice";
import {
  setDropdownSelection,
  resetPageSelections,
  selectDropdownSelections,
  selectDropdownData,
  buildReportsPayload,
} from "@/redux/slices/dropdownSlice";
import {
  FileText, CalendarIcon, Search, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Dropdown from "@/components/Dropdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReportType   = "energy" | "process" | "alerts" | "production";
type PeriodOption = "today" | "yesterday" | "7days" | "30days" | "month" | "custom";

const periodLabels: Record<PeriodOption, string> = {
  today: "Today", yesterday: "Yesterday", "7days": "Last 7 Days",
  "30days": "Last 30 Days", month: "This Month", custom: "Custom Range",
};

const PAGE_SIZE = 10;

const statusClass = (status: string) =>
  status === "Normal" || status === "Acknowledged"
    ? "status-normal"
    : status === "Critical"
    ? "status-critical"
    : "status-warning";

const ReportsPage = () => {
  const dispatch = useAppDispatch();
  const loading         = useAppSelector(selectReportsLoading);
  const error           = useAppSelector(selectReportsError);
  const energyTrendData = useAppSelector(selectReportsEnergyTrend);
  const equipmentData   = useAppSelector(selectReportsEquipmentEnergy);
  const processData     = useAppSelector(selectReportsProcessData);
  const alertsData      = useAppSelector(selectReportsAlerts);
  const selections      = useAppSelector(selectDropdownSelections);
  const dropdownData    = useAppSelector(selectDropdownData);

  // Page-level display state
  const [reportType, setReportType] = useState<ReportType>("energy");
  const [startDate, setStartDate]   = useState<Date | undefined>();
  const [endDate, setEndDate]       = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage]             = useState(1);
  const [exporting, setExporting]   = useState(false);
  // Page-level parameter filter (not global)
  const [filterParam, setFilterParam] = useState("All");

  // Resolve option lists from DROPDOWN_DATA
  const unitOpts   = (dropdownData?.common?.units      ?? []) as { value: string; label: string }[];
  const familyOpts = (dropdownData?.common?.families   ?? []) as { value: string; label: string }[];
  const shiftOpts  = (dropdownData?.common?.shifts     ?? []) as { value: string; label: string }[];
  const unitToParamMap = (dropdownData?.common?.unitToParamMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const paramOpts = (
    selections.unit && unitToParamMap[selections.unit]?.length
      ? unitToParamMap[selections.unit]
      : (dropdownData?.common?.parameters ?? [])
  ) as { value: string; label: string }[];

  // Line options cascade from selected unit
  const unitToLineMap = (dropdownData?.common?.unitToLineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lineOpts = (
    selections.unit && unitToLineMap[selections.unit]
      ? unitToLineMap[selections.unit]
      : (dropdownData?.common?.lines ?? [])
  ) as { value: string; label: string }[];

  // Machine options cascade from selected line
  const lineToMachineMap = (dropdownData?.common?.lineToMachineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const machineOpts = (
    selections.line && lineToMachineMap[selections.line]
      ? lineToMachineMap[selections.line]
      : (dropdownData?.common?.machines ?? [])
  ) as { value: string; label: string }[];

  const set = (key: Parameters<typeof setDropdownSelection>[0]["key"]) =>
    (value: string) => { dispatch(setDropdownSelection({ key, value })); setPage(1); };

  const period = selections.period as PeriodOption;

  // Sync custom date range back into Redux when user picks dates
  useEffect(() => {
    if (period === "custom" && startDate)
      dispatch(setDropdownSelection({ key: "dateRangeFrom", value: format(startDate, "yyyy-MM-dd") }));
  }, [dispatch, period, startDate]);

  useEffect(() => {
    if (period === "custom" && endDate)
      dispatch(setDropdownSelection({ key: "dateRangeTo", value: format(endDate, "yyyy-MM-dd") }));
  }, [dispatch, period, endDate]);

  // Auto-select first parameter when unit changes
  useEffect(() => {
    if (!dropdownData) return;
    const first = paramOpts[0]?.value;
    if (first) setFilterParam(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections.unit, dropdownData]);

  // Reset this page's dropdowns once dropdown data is available
  useEffect(() => {
    if (!dropdownData) return;
    const firstUnit = unitOpts[0]?.value ?? "PMD";
    const firstLine = unitToLineMap[firstUnit]?.[0]?.value ?? "";
    const firstMachine = lineToMachineMap[firstLine]?.[0]?.value ?? "";
    const firstFamily = familyOpts[0]?.value ?? "";
    const firstShift  = shiftOpts[0]?.value  ?? "";
    dispatch(resetPageSelections({ unit: firstUnit, line: firstLine, machine: firstMachine, family: firstFamily, shift: firstShift, period: "today" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownData]);

  useEffect(() => {
    dispatch(fetchReportsData(buildReportsPayload(selections)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selections.unit, selections.line, selections.machine, selections.family, selections.shift, selections.period]);

  const energyTableData = useMemo(() => {
    let data = equipmentData.map((eq) => ({
      timestamp: "2026-03-10 14:00",
      machine: eq.equipment,
      line: eq.line,
      consumption: eq.consumption,
      cost: eq.cost,
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.machine.toLowerCase().includes(q) || d.line.toLowerCase().includes(q));
    }
    return data;
  }, [equipmentData, searchQuery]);

  const processTableData = useMemo(() => {
    let data = processData.map((d) => ({
      timestamp: format(new Date(d.timestamp), "yyyy-MM-dd HH:mm"),
      parameter: "Moisture",
      value: d.moisture,
      lsl: d.moistureLSL,
      usl: d.moistureUSL,
      status: d.moisture >= d.moistureLSL && d.moisture <= d.moistureUSL ? "Normal" : d.moisture > d.moistureUCL || d.moisture < d.moistureLCL ? "Critical" : "Warning",
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.parameter.toLowerCase().includes(q) || d.status.toLowerCase().includes(q));
    }
    return data;
  }, [processData, searchQuery]);

  const alertsTableData = useMemo(() => {
    let data = alertsData.map((a) => ({
      timestamp: a.timestamp,
      parameter: a.parameter,
      severity: a.severity,
      status: a.acknowledged ? "Acknowledged" : "Active",
      comment: a.acknowledgedComment || "—",
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.parameter.toLowerCase().includes(q) || d.severity.toLowerCase().includes(q));
    }
    return data;
  }, [alertsData, searchQuery]);

  const productionTableData = useMemo(() => {
    let data = energyTrendData.map((d, i) => ({
      timestamp: `2026-03-10 ${d.time}`,
      production: Math.round(180 + (i % 10) * 4),
      consumption: d.actual,
      energyPerUnit: +(d.actual / (180 + i * 0.5)).toFixed(2),
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.timestamp.toLowerCase().includes(q));
    }
    return data;
  }, [energyTrendData, searchQuery]);

  const currentTableData =
    reportType === "energy"     ? energyTableData :
    reportType === "process"    ? processTableData :
    reportType === "production" ? productionTableData :
    alertsTableData;

  const totalPages = Math.max(1, Math.ceil(currentTableData.length / PAGE_SIZE));
  const pagedData  = currentTableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getFileName = useCallback(() => {
    const typeLabel  = reportType.charAt(0).toUpperCase() + reportType.slice(1);
    const unitPart   = selections.unit ? `_${selections.unit.replace(/\s/g, "")}` : "";
    const linePart   = selections.line ? `_${selections.line.replace(/\s/g, "")}` : "";
    const datePart   = `_${format(new Date(), "yyyyMMdd")}`;
    return `${typeLabel}Report${unitPart}${linePart}${datePart}`;
  }, [reportType, selections.unit, selections.line]);

  const buildCSVContent = useCallback(() => {
    if (reportType === "energy") {
      return ["Timestamp,Machine,Line,Consumption (kWh),Cost (₹)", ...energyTableData.map((d) => `${d.timestamp},${d.machine},${d.line},${d.consumption},${d.cost}`)].join("\n");
    } else if (reportType === "process") {
      return ["Timestamp,Parameter,Value,LSL,USL,Status", ...processTableData.map((d) => `${d.timestamp},${d.parameter},${d.value},${d.lsl},${d.usl},${d.status}`)].join("\n");
    } else if (reportType === "production") {
      return ["Timestamp,Production (units),Consumption (kWh),Energy/Unit", ...productionTableData.map((d) => `${d.timestamp},${d.production},${d.consumption},${d.energyPerUnit}`)].join("\n");
    } else {
      return ["Timestamp,Parameter,Severity,Status,Comment", ...alertsTableData.map((d) => `${d.timestamp},${d.parameter},${d.severity},${d.status},${d.comment}`)].join("\n");
    }
  }, [reportType, energyTableData, processTableData, alertsTableData, productionTableData]);

  const handleExportExcel = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      const csv  = buildCSVContent();
      const blob = new Blob([csv], { type: "application/vnd.ms-excel" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${getFileName()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success("Report downloaded successfully", { description: `${getFileName()}.xlsx` });
    }, 600);
  }, [buildCSVContent, getFileName]);

  const handleExportPDF = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      const csv      = buildCSVContent();
      const csvLines = csv.split("\n");
      const header   = csvLines[0];
      const content  = `${reportType.toUpperCase()} REPORT\n\nFilters: Unit=${selections.unit}, Line=${selections.line}, Machine=${selections.machine}, Family=${selections.family}, Shift=${selections.shift}, Period=${periodLabels[period] ?? period}\nGenerated: ${format(new Date(), "dd MMM yyyy HH:mm")}\n\n${header}\n${"─".repeat(80)}\n${csvLines.slice(1).join("\n")}`;
      const blob     = new Blob([content], { type: "application/pdf" });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `${getFileName()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success("Report downloaded successfully", { description: `${getFileName()}.pdf` });
    }, 800);
  }, [buildCSVContent, getFileName, reportType, selections, period]);

  const renderTable = (headers: { label: string; align?: string }[], renderRow: (d: any, i: number) => React.ReactNode) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container">
      <div className="reports-table-head">
        <h3 className="reports-table-title">Detailed Data</h3>
        <div className="reports-table-actions">
          <div className="reports-search">
            <Search />
            <Input placeholder="Search…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="reports-search-input" />
          </div>
          <Button variant="outline" size="sm" className="reports-btn-sm" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <FileText />}PDF
          </Button>
          <Button variant="outline" size="sm" className="reports-btn-sm" onClick={handleExportExcel} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}Excel
          </Button>
        </div>
      </div>
      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h.label} className={h.align === "right" ? "text-right" : "text-left"}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>{pagedData.map((d, i) => renderRow(d, i))}</tbody>
        </table>
      </div>
      <div className="reports-pager">
        <span className="reports-pager-info">Page {page} of {totalPages} ({currentTableData.length} records)</span>
        <div className="reports-pager-controls">
          <Button variant="ghost" size="icon" className="reports-pager-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" className="reports-pager-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight /></Button>
        </div>
      </div>
    </motion.div>
  );

  if (loading) return <DashboardLayout><Loader message="Loading Reports…" /></DashboardLayout>;
  if (error)   return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header-row">
        <h2 className="page-title">Reports</h2>
        <div className="reports-filters">
          {/* Global filters — stored in Redux */}
          {[
            { label: "Unit",    value: selections.unit,    setter: (v: string) => { const fl = unitToLineMap[v]?.[0]?.value ?? ""; const fm = lineToMachineMap[fl]?.[0]?.value ?? ""; set("unit")(v); set("line")(fl); set("machine")(fm); }, opts: unitOpts.length   ? unitOpts   : [{ value: "PMD", label: "PMD" }] },
            { label: "Line",    value: selections.line,    setter: (v: string) => { set("line")(v); set("machine")(lineToMachineMap[v]?.[0]?.value ?? ""); }, opts: lineOpts.length   ? lineOpts   : [{ value: "All", label: "All" }] },
            { label: "Machine", value: selections.machine, setter: set("machine"), opts: machineOpts.length ? machineOpts : [{ value: "All", label: "All" }] },
            { label: "Family",  value: selections.family,  setter: set("family"),  opts: familyOpts.length ? familyOpts : [{ value: "CFT", label: "CFT" }] },
            { label: "Shift",   value: selections.shift,   setter: set("shift"),   opts: shiftOpts.length  ? shiftOpts  : [{ value: "All", label: "All" }] },
          ].map((f) => (
            <div key={f.label} className="reports-filter">
              <label className="reports-filter-label">{f.label}</label>
              <Dropdown value={f.value} onValueChange={f.setter} options={f.opts} />
            </div>
          ))}

          {/* Parameter — page-level display filter */}
          <div className="reports-filter">
            <label className="reports-filter-label">Parameter</label>
            <Dropdown
              value={filterParam}
              onValueChange={(v) => { setFilterParam(v); setPage(1); }}
              options={paramOpts.length ? paramOpts : ["All", "Energy", "Moisture", "Humidity"]}
            />
          </div>

          {/* Period — stored in Redux */}
          <div className="reports-filter">
            <label className="reports-filter-label">Period</label>
            <Dropdown
              value={period}
              onValueChange={(v) => { set("period")(v); setPage(1); }}
              options={(Object.keys(periodLabels) as PeriodOption[]).map((k) => ({
                value: k,
                label: periodLabels[k],
              }))}
            />
          </div>

          {period === "custom" && (
            <>
              <div className="reports-date-field">
                <label className="reports-filter-label">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="reports-date-btn">
                      <CalendarIcon className="reports-cal-icon" />
                      {startDate ? format(startDate, "dd MMM yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="reports-date-field">
                <label className="reports-filter-label">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="reports-date-btn">
                      <CalendarIcon className="reports-cal-icon" />
                      {endDate ? format(endDate, "dd MMM yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      </div>

      <Tabs value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setPage(1); setSearchQuery(""); }}>
        <TabsList>
          <TabsTrigger value="energy">Energy Reports</TabsTrigger>
          <TabsTrigger value="process">Process (SPC) Reports</TabsTrigger>
          <TabsTrigger value="alerts">Alerts Reports</TabsTrigger>
          <TabsTrigger value="production">Production Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="energy">
          {renderTable(
            [{ label: "Timestamp" }, { label: "Machine" }, { label: "Line" }, { label: "Consumption (kWh)", align: "right" }, { label: "Cost (₹)", align: "right" }],
            (d: any, i: number) => (
              <tr key={i}>
                <td className="mono">{d.timestamp}</td>
                <td className="medium">{d.machine}</td>
                <td>{d.line}</td>
                <td className="mono-strong right">{d.consumption?.toLocaleString()}</td>
                <td className="mono-strong right">₹{d.cost?.toLocaleString()}</td>
              </tr>
            )
          )}
        </TabsContent>

        <TabsContent value="process">
          {renderTable(
            [{ label: "Timestamp" }, { label: "Parameter" }, { label: "Value", align: "right" }, { label: "LSL", align: "right" }, { label: "USL", align: "right" }, { label: "Status" }],
            (d: any, i: number) => (
              <tr key={i}>
                <td className="mono">{d.timestamp}</td>
                <td className="medium">{d.parameter}</td>
                <td className="mono-strong right">{d.value}</td>
                <td className="mono-strong right">{d.lsl}</td>
                <td className="mono-strong right">{d.usl}</td>
                <td><span className={statusClass(d.status)}>{d.status}</span></td>
              </tr>
            )
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {renderTable(
            [{ label: "Timestamp" }, { label: "Parameter" }, { label: "Severity" }, { label: "Status" }, { label: "Comment" }],
            (d: any, i: number) => (
              <tr key={i}>
                <td className="mono">{d.timestamp}</td>
                <td className="medium">{d.parameter}</td>
                <td><span className={statusClass(d.severity)}>{d.severity}</span></td>
                <td><span className={statusClass(d.status)}>{d.status}</span></td>
                <td className="mono">{d.comment}</td>
              </tr>
            )
          )}
        </TabsContent>

        <TabsContent value="production">
          {renderTable(
            [{ label: "Timestamp" }, { label: "Output", align: "right" }, { label: "Energy (kWh)", align: "right" }, { label: "Energy/Unit", align: "right" }],
            (d: any, i: number) => (
              <tr key={i}>
                <td className="mono">{d.timestamp}</td>
                <td className="mono-strong right">{d.production}</td>
                <td className="mono-strong right">{d.consumption?.toLocaleString()}</td>
                <td className="mono-strong right">{d.energyPerUnit}</td>
              </tr>
            )
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ReportsPage;
