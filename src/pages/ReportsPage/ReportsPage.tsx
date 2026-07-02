import './ReportsPage.css';
import { useState, useMemo, useCallback, useEffect } from "react";
import { format, subMonths } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Loader from "@/components/Loader/Loader";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchReportData,
  fetchProcessParamReportData,
  selectReportsLoading,
  selectReportsError,
  selectEnergyReportItems,
  selectAlertReportItems,
  selectProductionReportItems,
  selectProcessParamReportItems,
} from "@/redux/slices/reportsSlice";
import {
  setDropdownSelection,
  resetPageSelections,
  selectDropdownSelections,
  selectDropdownData,
  buildReportsEpochPayload,
} from "@/redux/slices/dropdownSlice";
import { apiService } from "@/services/api";
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
    : status === "Critical" || status === "Breach"
    ? "status-critical"
    : "status-warning";

const REPORT_NAME_MAP: Record<ReportType, string | null> = {
  energy: "energy",
  alerts: "alerts",
  production: "production",
  process: null,
};

const ReportsPage = () => {
  const dispatch = useAppDispatch();
  const loading          = useAppSelector(selectReportsLoading);
  const error            = useAppSelector(selectReportsError);
  const energyItems      = useAppSelector(selectEnergyReportItems);
  const alertItems       = useAppSelector(selectAlertReportItems);
  const productionItems  = useAppSelector(selectProductionReportItems);
  const processParamItems = useAppSelector(selectProcessParamReportItems);
  const selections       = useAppSelector(selectDropdownSelections);
  const dropdownData     = useAppSelector(selectDropdownData);

  const [reportType, setReportType] = useState<ReportType>("energy");
  const [startDate, setStartDate]   = useState<Date | undefined>();
  const [endDate,   setEndDate]     = useState<Date | undefined>();
  const [startOpen, setStartOpen]   = useState(false);
  const [endOpen,   setEndOpen]     = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage]             = useState(1);
  const [exporting, setExporting]   = useState(false);
  const [filterParam, setFilterParam] = useState("All");

  const unitOpts   = (dropdownData?.common?.units      ?? []) as { value: string; label: string }[];
  const familyOpts = (dropdownData?.common?.families   ?? []) as { value: string; label: string }[];
  const shiftOpts  = (dropdownData?.common?.shifts     ?? []) as { value: string; label: string }[];
  const unitToParamMap = (dropdownData?.common?.unitToParamMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const paramOpts = (
    selections.unit && unitToParamMap[selections.unit]?.length
      ? unitToParamMap[selections.unit]
      : (dropdownData?.common?.parameters ?? [])
  ) as { value: string; label: string }[];

  const unitToLineMap = (dropdownData?.common?.unitToLineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lineOpts = (
    selections.unit && unitToLineMap[selections.unit]
      ? unitToLineMap[selections.unit]
      : (dropdownData?.common?.lines ?? [])
  ) as { value: string; label: string }[];

  const unitLineToMachineMap = (dropdownData?.common?.unitLineToMachineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lineToMachineMap     = (dropdownData?.common?.lineToMachineMapping     ?? {}) as Record<string, { value: string; label: string }[]>;
  const machineIdMap         = (dropdownData?.common?.machineIdMap             ?? {}) as Record<string, number>;
  const machineOpts = (
    selections.unit && selections.line && unitLineToMachineMap[`${selections.unit}:${selections.line}`]
      ? unitLineToMachineMap[`${selections.unit}:${selections.line}`]
      : selections.line && lineToMachineMap[selections.line]
        ? lineToMachineMap[selections.line]
        : (dropdownData?.common?.machines ?? [])
  ) as { value: string; label: string }[];

  const set = (key: Parameters<typeof setDropdownSelection>[0]["key"]) =>
    (value: string) => { dispatch(setDropdownSelection({ key, value })); setPage(1); };

  const period = selections.period as PeriodOption;

  useEffect(() => {
    if (period === "custom" && startDate)
      dispatch(setDropdownSelection({ key: "dateRangeFrom", value: format(startDate, "yyyy-MM-dd") }));
  }, [dispatch, period, startDate]);

  useEffect(() => {
    if (period === "custom" && endDate)
      dispatch(setDropdownSelection({ key: "dateRangeTo", value: format(endDate, "yyyy-MM-dd") }));
  }, [dispatch, period, endDate]);

  useEffect(() => {
    if (!dropdownData) return;
    const first = paramOpts[0]?.value;
    if (first) setFilterParam(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections.unit, dropdownData]);

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

  // Fetch active report on tab/filter/period/unit change
  useEffect(() => {
    if (!dropdownData) return;
    if (period === "custom" && (!startDate || !endDate)) return;
    const reportName = REPORT_NAME_MAP[reportType];
    if (!reportName || !selections.unit) return;
    const { unit, startDate: sd, endDate: ed } = buildReportsEpochPayload(selections);
    dispatch(fetchReportData({
      reportName,
      unit,
      startDate: sd,
      endDate: ed,
      parameter: filterParam,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownData, reportType, selections.unit, selections.period, selections.dateRangeFrom, selections.dateRangeTo, filterParam, startDate, endDate]);

  // Fetch process params report (temperature / humidity / moisture)
  useEffect(() => {
    if (!dropdownData) return;
    if (period === "custom" && (!startDate || !endDate)) return;
    if (reportType !== "process" || !filterParam) return;
    const { startDate: sd, endDate: ed } = buildReportsEpochPayload(selections);
    const isMoisture = filterParam.toLowerCase() === "moisture";
    if (isMoisture) {
      const machineId = machineIdMap[selections.machine];
      if (machineId === undefined) return;
      dispatch(fetchProcessParamReportData({ parameter: "moisture", machineId, startDate: sd, endDate: ed }));
    } else {
      if (!selections.unit) return;
      dispatch(fetchProcessParamReportData({ parameter: filterParam.toLowerCase(), unit: selections.unit, startDate: sd, endDate: ed }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownData, reportType, filterParam, selections.unit, selections.machine, selections.period, selections.dateRangeFrom, selections.dateRangeTo, startDate, endDate]);

  const energyTableData = useMemo(() => {
    let data = energyItems.map((item) => ({
      timestamp:  item.timestamp,
      feederName: item.feederName,
      consumption: item.consumption,
      cost: item.cost,
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.feederName.toLowerCase().includes(q) || d.timestamp.toLowerCase().includes(q));
    }
    return data;
  }, [energyItems, searchQuery]);

  const alertsTableData = useMemo(() => {
    let data = alertItems.map((item) => ({
      timestamp:      item.timestamp,
      parameter:      item.parameter,
      severity:       item.severity,
      status:         item.status,
      comments:       item.comments,
      acknowledgedBy: item.acknowledgedBy,
      acknowledgedOn: item.acknowledgedOn,
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.parameter.toLowerCase().includes(q) || d.severity.toLowerCase().includes(q));
    }
    return data;
  }, [alertItems, searchQuery]);

  const productionTableData = useMemo(() => {
    let data = productionItems.map((item) => ({
      date:          item.date,
      outputMSticks: item.outputMSticks,
      energyKWH:     item.energyKWH,
      energyPerUnit: item.energyPerUnit,
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.date.toLowerCase().includes(q));
    }
    return data;
  }, [productionItems, searchQuery]);

  const processTableData = useMemo(() => {
    let data = processParamItems
      .filter((item) => item.status !== "No Spec")
      .map((item) => ({
        timestamp: item.timestamp,
        parameter: item.parameter,
        blendName: item.blendName,
        value:     item.value,
        lsl:       item.lsl,
        usl:       item.usl,
        target:    item.target,
        status:    item.status,
      }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) =>
        d.timestamp.toLowerCase().includes(q) ||
        d.parameter.toLowerCase().includes(q) ||
        (d.blendName ?? "").toLowerCase().includes(q)
      );
    }
    return data;
  }, [processParamItems, searchQuery]);

  const currentTableData =
    reportType === "energy"     ? energyTableData :
    reportType === "alerts"     ? alertsTableData :
    reportType === "production" ? productionTableData :
    reportType === "process"    ? processTableData :
    [];

  const totalPages = Math.max(1, Math.ceil(currentTableData.length / PAGE_SIZE));
  const pagedData  = currentTableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getFileName = useCallback(() => {
    const typeLabel = reportType.charAt(0).toUpperCase() + reportType.slice(1);
    const unitPart  = selections.unit ? `_${selections.unit.replace(/\s/g, "")}` : "";
    const datePart  = `_${format(new Date(), "yyyyMMdd")}`;
    return `${typeLabel}Report${unitPart}${datePart}`;
  }, [reportType, selections.unit]);

  const handleDownloadExcel = useCallback(async () => {
    setExporting(true);
    try {
      const { unit, startDate: sd, endDate: ed } = buildReportsEpochPayload(selections);
      if (reportType === "process") {
        const isMoisture = filterParam.toLowerCase() === "moisture";
        const blob = await apiService.downloadProcessParamReport({
          parameter:  filterParam.toLowerCase(),
          unit:       !isMoisture ? unit : undefined,
          machineId:  isMoisture ? machineIdMap[selections.machine] : undefined,
          startDate:  sd,
          endDate:    ed,
        });
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = `${getFileName()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const reportName = REPORT_NAME_MAP[reportType];
        if (!reportName) return;
        const blob = await apiService.downloadReport({ reportName, unit, startDate: sd, endDate: ed, parameter: filterParam });
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = `${getFileName()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("Report downloaded", { description: `${getFileName()}.xlsx` });
    } catch {
      toast.error("Download failed");
    } finally {
      setExporting(false);
    }
  }, [reportType, selections, filterParam, machineIdMap, getFileName]);

  const buildCSVContent = useCallback(() => {
    if (reportType === "energy") {
      return ["Timestamp,Feeder Name,Consumption (kWh),Cost (₹)",
        ...energyTableData.map((d) => `${d.timestamp},${d.feederName},${d.consumption},${d.cost}`)].join("\n");
    } else if (reportType === "alerts") {
      return ["Timestamp,Parameter,Severity,Status,Comments,Acknowledged By,Acknowledged On",
        ...alertsTableData.map((d) => `${d.timestamp},${d.parameter},${d.severity},${d.status},${d.comments},${d.acknowledgedBy},${d.acknowledgedOn}`)].join("\n");
    } else if (reportType === "production") {
      return ["Date,Output (M-Sticks),Energy (kWh),Energy/Unit",
        ...productionTableData.map((d) => `${d.date},${d.outputMSticks},${d.energyKWH},${d.energyPerUnit}`)].join("\n");
    } else if (reportType === "process") {
      const isMoisture = filterParam.toLowerCase() === "moisture";
      if (isMoisture) {
        return ["Timestamp,Parameter,Blend,Value,LSL,USL,Target,Status",
          ...processTableData.map((d: any) => `${d.timestamp},${d.parameter},${d.blendName ?? ""},${d.value},${d.lsl ?? ""},${d.usl ?? ""},${d.target ?? ""},${d.status}`)].join("\n");
      }
      return ["Timestamp,Parameter,Value,LSL,USL,Target,Status",
        ...processTableData.map((d: any) => `${d.timestamp},${d.parameter},${d.value},${d.lsl ?? ""},${d.usl ?? ""},${d.target ?? ""},${d.status}`)].join("\n");
    }
    return "";
  }, [reportType, energyTableData, alertsTableData, productionTableData, processTableData, filterParam]);

  const handleExportPDF = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      const csv      = buildCSVContent();
      const csvLines = csv.split("\n");
      const header   = csvLines[0];
      const content  = `${reportType.toUpperCase()} REPORT\n\nFilters: Unit=${selections.unit}, Period=${periodLabels[period] ?? period}\nGenerated: ${format(new Date(), "dd MMM yyyy HH:mm")}\n\n${header}\n${"─".repeat(80)}\n${csvLines.slice(1).join("\n")}`;
      const blob     = new Blob([content], { type: "application/pdf" });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `${getFileName()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success("Report downloaded", { description: `${getFileName()}.pdf` });
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
          <Button variant="outline" size="sm" className="reports-btn-sm" onClick={handleDownloadExcel} disabled={exporting || (!REPORT_NAME_MAP[reportType] && reportType !== "process")}>
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
          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="reports-table-empty">
                  No data found
                </td>
              </tr>
            ) : (
              pagedData.map((d, i) => renderRow(d, i))
            )}
          </tbody>
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


  return (
    <DashboardLayout>
      <h2 className="page-title">Reports</h2>

      <Tabs value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setPage(1); setSearchQuery(""); }}>

        <TabsList className="reports-tabs-list">
          <TabsTrigger value="energy">Energy Reports</TabsTrigger>
          <TabsTrigger value="process">Process (SPC) Reports</TabsTrigger>
          <TabsTrigger value="alerts">Alerts Reports</TabsTrigger>
          <TabsTrigger value="production">Production Reports</TabsTrigger>
        </TabsList>

        {/* Filters row — below the tabs */}
        <div className="reports-filters-row">
          {/* Unit — always visible */}
          <div className="reports-filter">
            <label className="reports-filter-label">Unit</label>
            <Dropdown
              value={selections.unit}
              onValueChange={(v) => { const fl = unitToLineMap[v]?.[0]?.value ?? ""; const fm = lineToMachineMap[fl]?.[0]?.value ?? ""; set("unit")(v); set("line")(fl); set("machine")(fm); }}
              options={unitOpts.length ? unitOpts : [{ value: "PMD", label: "PMD" }]}
            />
          </div>

          {/* Line — process and alerts only */}
          {(reportType === "process" || reportType === "alerts") && (
            <div className="reports-filter">
              <label className="reports-filter-label">Line</label>
              <Dropdown
                value={selections.line}
                onValueChange={(v) => { set("line")(v); set("machine")(lineToMachineMap[v]?.[0]?.value ?? ""); }}
                options={lineOpts.length ? lineOpts : [{ value: "All", label: "All" }]}
              />
            </div>
          )}

          {/* Machine — process and alerts only */}
          {(reportType === "process" || reportType === "alerts") && (
            <div className="reports-filter">
              <label className="reports-filter-label">Machine</label>
              <Dropdown value={selections.machine} onValueChange={set("machine")} options={machineOpts.length ? machineOpts : [{ value: "All", label: "All" }]} />
            </div>
          )}

          {/* Parameter — process and alerts only */}
          {(reportType === "process" || reportType === "alerts") && (
            <div className="reports-filter">
              <label className="reports-filter-label">Parameter</label>
              <Dropdown
                value={filterParam}
                onValueChange={(v) => { setFilterParam(v); setPage(1); }}
                options={paramOpts.length ? paramOpts : ["All", "Temperature", "Humidity"]}
              />
            </div>
          )}

          {/* Family — process + moisture only */}
          {reportType === "process" && filterParam.toLowerCase() === "moisture" && (
            <div className="reports-filter">
              <label className="reports-filter-label">Family</label>
              <Dropdown value={selections.family} onValueChange={set("family")} options={familyOpts.length ? familyOpts : [{ value: "CFT", label: "CFT" }]} />
            </div>
          )}

          {/* Period — always visible */}
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
              <div className="reports-date-field">
                <label className="reports-filter-label">End Date</label>
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

        {/* Tab content */}
        {loading ? <Loader message="Loading Reports…" /> : error ? (
          <div className="chart-container alerts-empty">
            Failed to load report data. Please adjust the filters and try again.
          </div>
        ) : (
          <>
            <TabsContent value="energy">
              {renderTable(
                [{ label: "Timestamp" }, { label: "Feeder Name" }, { label: "Consumption (kWh)", align: "right" }, { label: "Cost (₹)", align: "right" }],
                (d: any, i: number) => (
                  <tr key={i}>
                    <td className="mono">{d.timestamp}</td>
                    <td className="medium">{d.feederName}</td>
                    <td className="mono-strong right">{d.consumption?.toLocaleString()}</td>
                    <td className="mono-strong right">₹{d.cost?.toLocaleString()}</td>
                  </tr>
                )
              )}
            </TabsContent>

            <TabsContent value="process">
              {filterParam.toLowerCase() === "moisture"
                ? renderTable(
                    [
                      { label: "Timestamp" }, { label: "Parameter" }, { label: "Blend" },
                      { label: "Value", align: "right" }, { label: "LSL", align: "right" },
                      { label: "USL", align: "right" }, { label: "Target", align: "right" },
                      { label: "Status" },
                    ],
                    (d: any, i: number) => (
                      <tr key={i}>
                        <td className="mono">{d.timestamp}</td>
                        <td className="medium">{d.parameter}</td>
                        <td className="medium">{d.blendName ?? "—"}</td>
                        <td className="mono-strong right">{d.value?.toFixed(4)}</td>
                        <td className="mono right">{d.lsl ?? "—"}</td>
                        <td className="mono right">{d.usl ?? "—"}</td>
                        <td className="mono right">{d.target ?? "—"}</td>
                        <td><span className={statusClass(d.status)}>{d.status}</span></td>
                      </tr>
                    )
                  )
                : renderTable(
                    [
                      { label: "Timestamp" }, { label: "Parameter" },
                      { label: "Value", align: "right" }, { label: "LSL", align: "right" },
                      { label: "USL", align: "right" }, { label: "Target", align: "right" },
                      { label: "Status" },
                    ],
                    (d: any, i: number) => (
                      <tr key={i}>
                        <td className="mono">{d.timestamp}</td>
                        <td className="medium">{d.parameter}</td>
                        <td className="mono-strong right">{d.value?.toFixed(4)}</td>
                        <td className="mono right">{d.lsl ?? "—"}</td>
                        <td className="mono right">{d.usl ?? "—"}</td>
                        <td className="mono right">{d.target ?? "—"}</td>
                        <td><span className={statusClass(d.status)}>{d.status}</span></td>
                      </tr>
                    )
                  )
              }
            </TabsContent>

            <TabsContent value="alerts">
              {renderTable(
                [
                  { label: "Timestamp" }, { label: "Parameter" }, { label: "Severity" },
                  { label: "Status" }, { label: "Comments" }, { label: "Acknowledged By" }, { label: "Acknowledged On" },
                ],
                (d: any, i: number) => (
                  <tr key={i}>
                    <td className="mono">{d.timestamp}</td>
                    <td className="medium">{d.parameter}</td>
                    <td><span className={statusClass(d.severity)}>{d.severity}</span></td>
                    <td><span className={statusClass(d.status)}>{d.status}</span></td>
                    <td className="mono">{d.comments || "—"}</td>
                    <td>{d.acknowledgedBy || "—"}</td>
                    <td className="mono">{d.acknowledgedOn || "—"}</td>
                  </tr>
                )
              )}
            </TabsContent>

            <TabsContent value="production">
              {renderTable(
                [{ label: "Date" }, { label: "Output (M-Sticks)", align: "right" }, { label: "Energy (kWh)", align: "right" }, { label: "Energy/Unit", align: "right" }],
                (d: any, i: number) => (
                  <tr key={i}>
                    <td className="mono">{d.date}</td>
                    <td className="mono-strong right">{d.outputMSticks?.toLocaleString()}</td>
                    <td className="mono-strong right">{d.energyKWH?.toLocaleString()}</td>
                    <td className="mono-strong right">{d.energyPerUnit}</td>
                  </tr>
                )
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default ReportsPage;
