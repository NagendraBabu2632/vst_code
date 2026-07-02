import './AlertsPage.css';
import { useState, useMemo, useEffect } from "react";
import { format, subMonths } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Loader from "@/components/Loader/Loader";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchAlertsData,
  acknowledgeAlertAsync,
  selectAlertsLoading,
  selectAlertsError,
  selectAlerts,
  selectAlertsKpi,
  selectAckLoading,
  type AlertItem,
} from "@/redux/slices/alertsSlice";
import {
  setDropdownSelection,
  resetPageSelections,
  selectDropdownSelections,
  selectDropdownData,
  buildAlertsPayload,
} from "@/redux/slices/dropdownSlice";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle, XCircle, Eye, Clock, User, CalendarIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Dropdown from "@/components/Dropdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const PARAMETERS = ["All", "Temperature", "Humidity"];

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "Critical") return <XCircle className="severity-icon severity-icon--critical" />;
  if (severity === "Warning")  return <AlertTriangle className="severity-icon severity-icon--warning" />;
  return <CheckCircle className="severity-icon severity-icon--ok" />;
};

const rowClass = (alert: AlertItem) => {
  if (alert.isAcknowledged) return "alert-row alert-row--ack";
  if (alert.severity === "Critical") return "alert-row alert-row--critical";
  return "alert-row alert-row--warning";
};

const AlertRow = ({ alert, onAcknowledge }: { alert: AlertItem; onAcknowledge: (alert: AlertItem) => void }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={rowClass(alert)}>
          <div className="alert-row-inner">
            <SeverityIcon severity={alert.severity} />
            <div className="alert-row-body">
              <div className="alert-row-titleline">
                <span className="alert-row-message">{alert.ruleName}</span>
                <div className="alert-badge-group">
                  <span className={alert.severity === "Critical" ? "status-critical" : "status-warning"}>
                    {alert.severity}
                  </span>
                  {alert.isAcknowledged ? (
                    <span className="alert-badge alert-badge--ack">
                      <CheckCircle /> Acknowledged
                    </span>
                  ) : (
                    <span className="alert-badge alert-badge--active">Active</span>
                  )}
                </div>
              </div>
              <div className="alert-row-meta">
                <span className="mono">#{alert.alertId}</span>
                <span>{alert.unit}</span>
                <span>{alert.parameterType}</span>
                <span>{alert.tagName}</span>
                <span className="meta-strong">
                  {alert.value} / LSL {alert.lsl} – USL {alert.usl}
                </span>
                <span className="mono">{alert.timestamp}</span>
              </div>
              {alert.isAcknowledged && alert.acknowledgedBy && (
                <div className="alert-row-ack-line">
                  <span><User />{alert.acknowledgedBy}</span>
                  <span><Clock />{alert.acknowledgedAt}</span>
                  {alert.acknowledgedComment && <span className="italic">"{alert.acknowledgedComment}"</span>}
                </div>
              )}
            </div>
            <div className="alert-row-actions">
              {!alert.isAcknowledged && (
                <Button size="sm" variant="outline" className="alerts-btn-ack" onClick={(e) => { e.stopPropagation(); onAcknowledge(alert); }}>
                  Acknowledge
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="alert-ack-tooltip">
        <p className="alert-ack-tooltip-title">{alert.parameterType} — {alert.tagName}</p>
        <p>Value: <span className="mono">{alert.value}</span></p>
        <p>LSL: <span className="mono">{alert.lsl}</span> &nbsp; USL: <span className="mono">{alert.usl}</span></p>
        <p>Deviation: <span className="mono alert-ack-tooltip-deviation">
          {alert.value > alert.usl
            ? `+${(alert.value - alert.usl).toFixed(2)} above USL`
            : alert.value < alert.lsl
              ? `${(alert.value - alert.lsl).toFixed(2)} below LSL`
              : "Within limits"}
        </span></p>
        <p>Time: {alert.timestamp}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const AlertsPage = () => {
  const dispatch = useAppDispatch();
  const loading    = useAppSelector(selectAlertsLoading);
  const error      = useAppSelector(selectAlertsError);
  const ackLoading = useAppSelector(selectAckLoading);
  const alerts   = useAppSelector(selectAlerts);
  const kpiData  = useAppSelector(selectAlertsKpi);
  const selections   = useAppSelector(selectDropdownSelections);
  const dropdownData = useAppSelector(selectDropdownData);

  const [ackAlert,  setAckAlert]  = useState<AlertItem | null>(null);
  const [ackComment, setAckComment] = useState("");

  const [filterParam,  setFilterParam]  = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "acknowledged">("all");
  const [severityTab,  setSeverityTab]  = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate,   setEndDate]   = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen,   setEndOpen]   = useState(false);

  const unitOpts   = (dropdownData?.common?.units   ?? [{ value: "PMD", label: "PMD" }, { value: "SMD", label: "SMD" }]) as { value: string; label: string }[];
  const basePeriodOpts = (dropdownData?.alertsPage?.period?.options ?? [
    { value: "last1h",  label: "Last One Hour" },
    { value: "last24h", label: "Last 24 Hours" },
    { value: "last1m",  label: "Last One Month" },
  ]) as { value: string; label: string }[];
  const periodOpts = [...basePeriodOpts, { value: "custom", label: "Custom Range" }];

  const set = (key: Parameters<typeof setDropdownSelection>[0]["key"]) =>
    (value: string) => dispatch(setDropdownSelection({ key, value }));

  useEffect(() => {
    if (!dropdownData) return;
    const firstUnit = unitOpts[0]?.value ?? "PMD";
    dispatch(resetPageSelections({ unit: firstUnit, line: "", machine: "", period: "last24h" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownData]);

  useEffect(() => {
    if (selections.period === "custom" && startDate)
      dispatch(setDropdownSelection({ key: "dateRangeFrom", value: format(startDate, "yyyy-MM-dd") }));
  }, [dispatch, selections.period, startDate]);

  useEffect(() => {
    if (selections.period === "custom" && endDate)
      dispatch(setDropdownSelection({ key: "dateRangeTo", value: format(endDate, "yyyy-MM-dd") }));
  }, [dispatch, selections.period, endDate]);

  useEffect(() => {
    if (!dropdownData) return;
    if (selections.period === "custom" && (!startDate || !endDate)) return;
    dispatch(fetchAlertsData(buildAlertsPayload(selections, filterParam)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownData, selections.unit, selections.period, selections.dateRangeFrom, selections.dateRangeTo, filterParam, startDate, endDate]);

  const filtered = useMemo(() => {
    let list = alerts;
    if (statusFilter === "active")       list = list.filter((a) => !a.isAcknowledged);
    if (statusFilter === "acknowledged") list = list.filter((a) => a.isAcknowledged);
    if (severityTab  === "critical")     list = list.filter((a) => a.severity === "Critical");
    if (severityTab  === "warning")      list = list.filter((a) => a.severity === "Warning");
    return list;
  }, [alerts, statusFilter, severityTab]);

  const handleAcknowledge = async () => {
    if (!ackAlert || !ackComment.trim()) return;
    const result = await dispatch(
      acknowledgeAlertAsync({ alertId: ackAlert.alertId, comment: ackComment.trim() })
    );
    if (acknowledgeAlertAsync.fulfilled.match(result)) {
      setAckAlert(null);
      setAckComment("");
    }
  };

  if (error) return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header-row">
        <h2 className="page-title">Alerts Management</h2>
        <div className="alerts-filters">
          <div className="alerts-filter">
            <label className="alerts-filter-label">Unit</label>
            <Dropdown value={selections.unit} onValueChange={set("unit")} options={unitOpts} />
          </div>

          <div className="alerts-filter">
            <label className="alerts-filter-label">Parameter</label>
            <Dropdown value={filterParam} onValueChange={setFilterParam} options={PARAMETERS} />
          </div>

          <div className="alerts-filter">
            <label className="alerts-filter-label">Period</label>
            <Dropdown value={selections.period} onValueChange={set("period")} options={periodOpts} />
          </div>

          {selections.period === "custom" && (
            <>
              <div className="alerts-filter">
                <label className="alerts-filter-label">Start Date</label>
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
              <div className="alerts-filter">
                <label className="alerts-filter-label">End Date</label>
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

          <div className="alerts-filter">
            <label className="alerts-filter-label">Status</label>
            <Dropdown
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as any)}
              options={[
                { value: "all",          label: "All" },
                { value: "active",       label: "Active" },
                { value: "acknowledged", label: "Acknowledged" },
              ]}
            />
          </div>
        </div>
      </div>

      {loading ? <Loader message="Loading Alerts…" /> : <>
      <div className="alerts-kpi-grid">
        {[
          { label: "Total Alerts", value: kpiData.totalAlerts,    icon: <Eye />,           mod: "primary" },
          { label: "Critical",     value: kpiData.criticalAlerts, icon: <XCircle />,       mod: "critical" },
          { label: "Warning",      value: kpiData.warningAlerts,  icon: <AlertTriangle />, mod: "warning" },
          { label: "Acknowledged", value: kpiData.acknowledged,   icon: <CheckCircle />,   mod: "success" },
        ].map((c) => (
          <div key={c.label} className="kpi-card alerts-kpi-row">
            <div className={`alerts-kpi-icon alerts-kpi-icon--${c.mod}`}>{c.icon}</div>
            <div>
              <div className="alerts-kpi-value">{c.value}</div>
              <div className="alerts-kpi-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={severityTab} onValueChange={setSeverityTab}>
        <TabsList>
          <TabsTrigger value="all">All ({kpiData.totalAlerts})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({kpiData.criticalAlerts})</TabsTrigger>
          <TabsTrigger value="warning">Warning ({kpiData.warningAlerts})</TabsTrigger>
        </TabsList>
        {["all", "critical", "warning"].map((tab) => (
          <TabsContent key={tab} value={tab} className="alerts-tabs-content">
            {filtered.length === 0 ? (
              <div className="alerts-empty">No alerts match filters</div>
            ) : (
              filtered.map((alert) => (
                <AlertRow key={alert.alertId} alert={alert} onAcknowledge={setAckAlert} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!ackAlert} onOpenChange={(open) => !open && setAckAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Alert</DialogTitle>
            <DialogDescription>
              #{ackAlert?.alertId} — {ackAlert?.ruleName}
            </DialogDescription>
          </DialogHeader>
          <div className="alert-ack-modal-section">
            <div className="alert-ack-modal-grid">
              <div><span className="muted">Unit:</span> {ackAlert?.unit}</div>
              <div><span className="muted">Parameter:</span> {ackAlert?.parameterType}</div>
              <div><span className="muted">Value:</span> {ackAlert?.value}</div>
              <div><span className="muted">LSL / USL:</span> {ackAlert?.lsl} / {ackAlert?.usl}</div>
            </div>
            <div>
              <label className="alert-ack-modal-label">Comment <span className="alert-ack-modal-required">*</span></label>
              <Textarea
                placeholder="Enter acknowledgement comment…"
                value={ackComment}
                onChange={(e) => setAckComment(e.target.value)}
                className="alert-ack-textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckAlert(null)}>Cancel</Button>
            <Button onClick={handleAcknowledge} disabled={!ackComment.trim() || ackLoading}>
              {ackLoading ? "Confirming…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>}
    </DashboardLayout>
  );
};

export default AlertsPage;
