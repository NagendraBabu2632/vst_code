import './AlertsPage.css';
import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Loader from "@/components/Loader/Loader";
import type { Alert } from "@/data/mockData";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import {
  fetchAlertsData,
  acknowledgeAlert,
  selectAlertsLoading,
  selectAlertsError,
  selectAlerts,
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
  AlertTriangle, CheckCircle, XCircle, Eye, ExternalLink, Clock, User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Dropdown from "@/components/Dropdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const parameters = ["All", "Moisture", "Humidity", "Temperature"];

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "Critical") return <XCircle className="severity-icon severity-icon--critical" />;
  if (severity === "Warning")  return <AlertTriangle className="severity-icon severity-icon--warning" />;
  return <CheckCircle className="severity-icon severity-icon--ok" />;
};

const rowClass = (alert: Alert) => {
  if (alert.acknowledged) return "alert-row alert-row--ack";
  if (alert.severity === "Critical") return "alert-row alert-row--critical";
  return "alert-row alert-row--warning";
};

const AlertRow = ({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: (alert: Alert) => void }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={rowClass(alert)}>
          <div className="alert-row-inner">
            <SeverityIcon severity={alert.severity} />
            <div className="alert-row-body">
              <div className="alert-row-titleline">
                <span className="alert-row-message">{alert.message}</span>
                <div className="alert-badge-group">
                  <span className={alert.severity === "Critical" ? "status-critical" : "status-warning"}>
                    {alert.severity}
                  </span>
                  {alert.acknowledged ? (
                    <span className="alert-badge alert-badge--ack">
                      <CheckCircle /> Acknowledged
                    </span>
                  ) : (
                    <span className="alert-badge alert-badge--active">Active</span>
                  )}
                </div>
              </div>
              <div className="alert-row-meta">
                <span className="mono">{alert.id}</span>
                <span>{alert.equipment || "—"}</span>
                <span>{alert.productionLine}</span>
                <span>{alert.parameter}</span>
                {alert.currentValue != null && (
                  <span className="meta-strong">
                    {alert.currentValue} {alert.unit} / {alert.threshold} {alert.unit}
                  </span>
                )}
                <span className="mono">{alert.timestamp}</span>
                {alert.parameter === "Energy" && alert.costImpact != null && alert.costImpact > 0 && (
                  <span className="meta-warn">₹{alert.costImpact.toLocaleString()}</span>
                )}
              </div>
              {alert.acknowledged && alert.acknowledgedBy && (
                <div className="alert-row-ack-line">
                  <span><User />{alert.acknowledgedBy}</span>
                  <span><Clock />{alert.acknowledgedAt}</span>
                  {alert.acknowledgedComment && <span className="italic">"{alert.acknowledgedComment}"</span>}
                </div>
              )}
            </div>
            <div className="alert-row-actions">
              {!alert.acknowledged && (
                <Button size="sm" variant="outline" className="alerts-btn-ack" onClick={(e) => { e.stopPropagation(); onAcknowledge(alert); }}>
                  Acknowledge
                </Button>
              )}
              {alert.parameter === "Energy" && (
                <Button size="icon" variant="ghost" className="alerts-btn-icon-sm" title="View in Energy Monitoring">
                  <ExternalLink />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="alert-ack-tooltip">
        <p className="alert-ack-tooltip-title">{alert.parameter} — {alert.equipment || alert.productionLine}</p>
        {alert.currentValue != null && (
          <>
            <p>Actual: <span className="mono">{alert.currentValue} {alert.unit}</span></p>
            <p>Threshold: <span className="mono">{alert.threshold} {alert.unit}</span></p>
            <p>Deviation: <span className="mono alert-ack-tooltip-deviation">
              {alert.threshold ? ((alert.currentValue - alert.threshold)).toFixed(1) : "—"} {alert.unit}
            </span></p>
          </>
        )}
        <p>Time: {alert.timestamp}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const AlertsPage = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAlertsLoading);
  const error   = useAppSelector(selectAlertsError);
  const alerts  = useAppSelector(selectAlerts);
  const selections = useAppSelector(selectDropdownSelections);
  const dropdownData = useAppSelector(selectDropdownData);

  const [ackAlert, setAckAlert]     = useState<Alert | null>(null);
  const [ackComment, setAckComment] = useState("");

  // Page-specific display filters (not synced to global state)
  const [filterParam,   setFilterParam]   = useState("All");
  const [statusFilter,  setStatusFilter]  = useState<"all" | "active" | "acknowledged">("all");
  const [severityTab,   setSeverityTab]   = useState("all");

  // Resolve option lists from DROPDOWN_DATA
  const unitOpts    = (dropdownData?.common?.units    ?? [{ value: "PMD", label: "PMD" }, { value: "SMD", label: "SMD" }]) as { value: string; label: string }[];
  const periodOpts  = (dropdownData?.alertsPage?.period?.options  ?? [
    { value: "last1h",  label: "Last One Hour" },
    { value: "last24h", label: "Last 24 Hours" },
    { value: "last1m",  label: "Last One Month" },
  ]) as { value: string; label: string }[];

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
    (value: string) => dispatch(setDropdownSelection({ key, value }));

  // Reset this page's dropdowns once dropdown data is available
  useEffect(() => {
    if (!dropdownData) return;
    const firstUnit = unitOpts[0]?.value ?? "PMD";
    const firstLine = unitToLineMap[firstUnit]?.[0]?.value ?? "";
    const firstMachine = lineToMachineMap[firstLine]?.[0]?.value ?? "";
    dispatch(resetPageSelections({ unit: firstUnit, line: firstLine, machine: firstMachine, period: "last24h" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, dropdownData]);

  useEffect(() => {
    dispatch(fetchAlertsData(buildAlertsPayload(selections)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selections.unit, selections.line, selections.machine, selections.shift, selections.period]);

  // Map the global selection values back to display labels for client-side filtering
  const unitLabel    = unitOpts.find((o) => o.value === selections.unit)?.label    ?? selections.unit;
  const lineLabel    = lineOpts.find((o) => o.value === selections.line)?.label    ?? selections.line;
  const machineLabel = machineOpts.find((o) => o.value === selections.machine)?.label ?? selections.machine;

  const filtered = useMemo(() => {
    let list = alerts;
    if (selections.unit && unitOpts.length)
      list = list.filter((a) => a.unitName === unitLabel || a.unitName === selections.unit);
    if (selections.line && lineOpts.length)
      list = list.filter((a) => a.productionLine === lineLabel || a.productionLine === selections.line);
    if (selections.machine && machineOpts.length)
      list = list.filter((a) => a.equipment === machineLabel || a.equipment === selections.machine);
    if (filterParam   !== "All") list = list.filter((a) => a.parameter === filterParam);
    if (statusFilter  === "active")       list = list.filter((a) => !a.acknowledged);
    if (statusFilter  === "acknowledged") list = list.filter((a) => a.acknowledged);
    if (severityTab   === "critical") list = list.filter((a) => a.severity === "Critical");
    if (severityTab   === "warning")  list = list.filter((a) => a.severity === "Warning");
    return list;
  }, [alerts, selections.unit, selections.line, selections.machine, unitLabel, lineLabel, machineLabel, unitOpts, lineOpts, machineOpts, filterParam, statusFilter, severityTab]);

  const kpi = useMemo(() => ({
    total:        filtered.length,
    critical:     filtered.filter((a) => a.severity === "Critical").length,
    warning:      filtered.filter((a) => a.severity === "Warning").length,
    acknowledged: filtered.filter((a) => a.acknowledged).length,
  }), [filtered]);

  const handleAcknowledge = () => {
    if (!ackAlert || !ackComment.trim()) return;
    dispatch(
      acknowledgeAlert({
        id: ackAlert.id,
        acknowledgedBy: "Current User",
        acknowledgedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        acknowledgedComment: ackComment.trim(),
      })
    );
    setAckAlert(null);
    setAckComment("");
  };

  if (loading) return <DashboardLayout><Loader message="Loading Alerts…" /></DashboardLayout>;
  if (error)   return <DashboardLayout><div className="page-error">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header-row">
        <h2 className="page-title">Alerts Management</h2>
        <div className="alerts-filters">
          {/* Global filters — stored in Redux */}
          {[
            { label: "Unit",    value: selections.unit,    setter: (v: string) => { const fl = unitToLineMap[v]?.[0]?.value ?? ""; const fm = lineToMachineMap[fl]?.[0]?.value ?? ""; set("unit")(v); set("line")(fl); set("machine")(fm); }, opts: unitOpts },
            { label: "Line",    value: selections.line,    setter: (v: string) => { set("line")(v); set("machine")(lineToMachineMap[v]?.[0]?.value ?? ""); }, opts: lineOpts },
            { label: "Machine", value: selections.machine, setter: set("machine"), opts: machineOpts },
          ].map((f) => (
            <div key={f.label} className="alerts-filter">
              <label className="alerts-filter-label">{f.label}</label>
              <Dropdown value={f.value} onValueChange={f.setter} options={f.opts} />
            </div>
          ))}

          {/* Parameter — page-level display filter */}
          <div className="alerts-filter">
            <label className="alerts-filter-label">Parameter</label>
            <Dropdown value={filterParam} onValueChange={setFilterParam} options={parameters} />
          </div>

          {/* Period — stored in Redux */}
          <div className="alerts-filter">
            <label className="alerts-filter-label">Period</label>
            <Dropdown value={selections.period} onValueChange={set("period")} options={periodOpts} />
          </div>

          {/* Status — page-level display filter */}
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

      <div className="alerts-kpi-grid">
        {[
          { label: "Total Alerts", value: kpi.total,        icon: <Eye />,           mod: "primary" },
          { label: "Critical",     value: kpi.critical,     icon: <XCircle />,       mod: "critical" },
          { label: "Warning",      value: kpi.warning,      icon: <AlertTriangle />, mod: "warning" },
          { label: "Acknowledged", value: kpi.acknowledged, icon: <CheckCircle />,   mod: "success" },
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
          <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({alerts.filter((a) => a.severity === "Critical").length})</TabsTrigger>
          <TabsTrigger value="warning">Warning ({alerts.filter((a) => a.severity === "Warning").length})</TabsTrigger>
        </TabsList>
        {["all", "critical", "warning"].map((tab) => (
          <TabsContent key={tab} value={tab} className="alerts-tabs-content">
            {filtered.length === 0 ? (
              <div className="alerts-empty">No alerts match filters</div>
            ) : (
              filtered.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onAcknowledge={setAckAlert} />
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
              {ackAlert?.id} — {ackAlert?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="alert-ack-modal-section">
            <div className="alert-ack-modal-grid">
              <div><span className="muted">Equipment:</span> {ackAlert?.equipment}</div>
              <div><span className="muted">Line:</span> {ackAlert?.productionLine}</div>
              <div><span className="muted">Value:</span> {ackAlert?.currentValue} {ackAlert?.unit}</div>
              <div><span className="muted">Threshold:</span> {ackAlert?.threshold} {ackAlert?.unit}</div>
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
            <Button onClick={handleAcknowledge} disabled={!ackComment.trim()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AlertsPage;
