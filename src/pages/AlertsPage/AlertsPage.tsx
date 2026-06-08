import './AlertsPage.css';
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import { alertsData, Alert } from "@/data/mockData";
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

const units = ["All", "PMD", "SMD"];
const lines = ["All", "Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
const machines = ["All", "Compressor A", "Dryer B", "Motor C", "Furnace D", "Pump E", "Conveyor F"];
const parameters = ["All", "Moisture", "Humidity", "Temperature"];
const periods = ["Last One Hour", "Last 24 Hours", "Last One Month"];

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "Critical") return <XCircle className="severity-icon severity-icon--critical" />;
  if (severity === "Warning") return <AlertTriangle className="severity-icon severity-icon--warning" />;
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
  const [alerts, setAlerts] = useState<Alert[]>(
    alertsData.filter((a) => ["Moisture", "Humidity", "Temperature"].includes(a.parameter as string))
  );
  const [ackAlert, setAckAlert] = useState<Alert | null>(null);
  const [ackComment, setAckComment] = useState("");

  const [filterUnit, setFilterUnit] = useState("All");
  const [filterLine, setFilterLine] = useState("All");
  const [filterMachine, setFilterMachine] = useState("All");
  const [filterParam, setFilterParam] = useState("All");
  const [filterPeriod, setFilterPeriod] = useState("Last One Hour");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "acknowledged">("all");
  const [severityTab, setSeverityTab] = useState("all");

  const filtered = useMemo(() => {
    let list = alerts;
    if (filterUnit !== "All") list = list.filter((a) => a.unitName === filterUnit);
    if (filterLine !== "All") list = list.filter((a) => a.productionLine === filterLine);
    if (filterMachine !== "All") list = list.filter((a) => a.equipment === filterMachine);
    if (filterParam !== "All") list = list.filter((a) => a.parameter === filterParam);
    if (statusFilter === "active") list = list.filter((a) => !a.acknowledged);
    if (statusFilter === "acknowledged") list = list.filter((a) => a.acknowledged);
    if (severityTab === "critical") list = list.filter((a) => a.severity === "Critical");
    if (severityTab === "warning") list = list.filter((a) => a.severity === "Warning");
    return list;
  }, [alerts, filterUnit, filterLine, filterMachine, filterParam, statusFilter, severityTab]);

  const kpi = useMemo(() => ({
    total: filtered.length,
    critical: filtered.filter((a) => a.severity === "Critical").length,
    warning: filtered.filter((a) => a.severity === "Warning").length,
    acknowledged: filtered.filter((a) => a.acknowledged).length,
  }), [filtered]);

  const handleAcknowledge = () => {
    if (!ackAlert || !ackComment.trim()) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === ackAlert.id
          ? {
              ...a,
              acknowledged: true,
              acknowledgedBy: "Current User",
              acknowledgedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
              acknowledgedComment: ackComment.trim(),
            }
          : a
      )
    );
    setAckAlert(null);
    setAckComment("");
  };

  return (
    <DashboardLayout title="Alerts Management">
      <div className="alerts-filters">
        {[
          { label: "Unit", value: filterUnit, setter: setFilterUnit, opts: units },
          { label: "Line", value: filterLine, setter: setFilterLine, opts: lines },
          { label: "Machine", value: filterMachine, setter: setFilterMachine, opts: machines },
          { label: "Parameter", value: filterParam, setter: setFilterParam, opts: parameters },
          { label: "Period", value: filterPeriod, setter: setFilterPeriod, opts: periods },
        ].map((f) => (
          <div key={f.label} className="alerts-filter">
            <label className="alerts-filter-label">{f.label}</label>
            <Dropdown value={f.value} onValueChange={f.setter} options={f.opts} />
          </div>
        ))}
        <div className="alerts-filter">
          <label className="alerts-filter-label">Status</label>
          <Dropdown
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "acknowledged", label: "Acknowledged" },
            ]}
          />
        </div>
      </div>

      <div className="alerts-kpi-grid">
        {[
          { label: "Total Alerts", value: kpi.total, icon: <Eye />, mod: "primary" },
          { label: "Critical", value: kpi.critical, icon: <XCircle />, mod: "critical" },
          { label: "Warning", value: kpi.warning, icon: <AlertTriangle />, mod: "warning" },
          { label: "Acknowledged", value: kpi.acknowledged, icon: <CheckCircle />, mod: "success" },
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
