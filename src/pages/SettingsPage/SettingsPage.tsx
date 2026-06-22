import './SettingsPage.css';
import { useState, useRef, useEffect } from "react";
import { useAppSelector } from "@/redux/hooks/reduxHooks";
import { selectDropdownData } from "@/redux/slices/dropdownSlice";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import { motion } from "framer-motion";
import { Bell, Gauge, Package, Upload, Plus, Trash2, Pencil, IndianRupee, FlaskConical, History, Download, Zap, CalendarIcon, AlertTriangle, Mail, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { energyTree } from "@/data/energyTreeData";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Dropdown from "@/components/Dropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiService } from "@/services/api";

const parameters = ["Moisture S1", "Moisture S2", "Moisture S3", "Moisture S4"];

interface BlendFamily { familyId: number; familyName: string; }
interface Blend { blendId: number; blendName: string; blendDescription: string; familyId: number; familyName: string; }
const quarters = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

interface MoistureSpec { family: string; year: number; quarter: string; lsl: number; usl: number; target: number; updatedAt: string; }
type TariffType = "Fixed" | "Slab-based" | "ToD";
interface ToDSlot { label: "Peak" | "Off-Peak"; startTime: string; endTime: string; rate: number; }
interface TariffEntry { id: string; type: TariffType; rate: number; fixedCharges: number; startDate: Date; endDate?: Date; todSlots?: ToDSlot[]; }

const SettingsPage = () => {
  const [blends, setBlends] = useState<Blend[]>([]);
  const [blendFamilies, setBlendFamilies] = useState<BlendFamily[]>([]);
  const [blendLoading, setBlendLoading] = useState(false);
  const [newBlendName, setNewBlendName] = useState("");
  const [newBlendFamilyId, setNewBlendFamilyId] = useState("");
  const [newBlendDescription, setNewBlendDescription] = useState("");
  const [editingBlendId, setEditingBlendId] = useState<number | null>(null);
  const [editBlendName, setEditBlendName] = useState("");
  const [editBlendFamilyId, setEditBlendFamilyId] = useState("");
  const [editBlendDescription, setEditBlendDescription] = useState("");
  const [editBlendStatus, setEditBlendStatus] = useState<"Active" | "Inactive">("Active");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blendFileInputRef = useRef<HTMLInputElement>(null);
  const prodFileInputRef = useRef<HTMLInputElement>(null);

  const [prodDate, setProdDate] = useState<Date>(new Date());
  const [prodDateOpen, setProdDateOpen] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodData, setProdData] = useState<any[]>([]);
  const [prodColumns, setProdColumns] = useState<string[]>([]);
  const [prodUploadResult, setProdUploadResult] = useState<{ message?: string; inserted?: number; updated?: number; errors?: string[] } | null>(null);

  const [tariffs, setTariffs] = useState<TariffEntry[]>([
    { id: "T-001", type: "Fixed", rate: 8.0, fixedCharges: 1500, startDate: new Date(currentYear, 0, 1), endDate: undefined },
  ]);
  const [tariffType, setTariffType] = useState<TariffType>("Fixed");
  const [tariffRate, setTariffRate] = useState<string>("8.0");
  const [tariffFixed, setTariffFixed] = useState<string>("1500");
  const [tariffStart, setTariffStart] = useState<Date | undefined>(new Date());
  const [tariffEnd, setTariffEnd] = useState<Date | undefined>();
  const [tariffStartOpen, setTariffStartOpen] = useState(false);
  const [tariffEndOpen, setTariffEndOpen] = useState(false);

  const [todSlots, setTodSlots] = useState<ToDSlot[]>([
    { label: "Peak", startTime: "18:00", endTime: "22:00", rate: 10.0 },
    { label: "Off-Peak", startTime: "22:00", endTime: "06:00", rate: 6.0 },
  ]);

  const updateSlot = (idx: number, patch: Partial<ToDSlot>) => {
    setTodSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const expandRange = (start: string, end: string): Array<[number, number]> => {
    const s = toMinutes(start); const e = toMinutes(end);
    if (s === e) return [];
    if (e > s) return [[s, e]];
    return [[s, 1440], [0, e]];
  };

  const validateToD = (): string | null => {
    for (const s of todSlots) {
      if (!s.startTime || !s.endTime) return "Each slot needs start and end time";
      if (isNaN(s.rate) || s.rate <= 0) return `${s.label} rate must be greater than 0`;
    }
    const ranges: Array<{ label: string; range: [number, number] }> = [];
    todSlots.forEach((s) => { expandRange(s.startTime, s.endTime).forEach((r) => ranges.push({ label: s.label, range: r })); });
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const [a1, a2] = ranges[i].range; const [b1, b2] = ranges[j].range;
        if (a1 < b2 && b1 < a2) return `Time ranges overlap between ${ranges[i].label} and ${ranges[j].label}`;
      }
    }
    const peak = todSlots.find((s) => s.label === "Peak");
    const off = todSlots.find((s) => s.label === "Off-Peak");
    if (peak && off && peak.rate <= off.rate) return "Peak rate must be higher than Off-Peak rate";
    return null;
  };

  const addTariff = () => {
    const fixed = parseFloat(tariffFixed);
    if (!tariffStart || isNaN(fixed)) { toast.error("Please complete all tariff fields"); return; }
    let entry: TariffEntry;
    if (tariffType === "ToD") {
      const err = validateToD();
      if (err) { toast.error(err); return; }
      const avgRate = todSlots.reduce((sum, s) => sum + s.rate, 0) / todSlots.length;
      entry = { id: `T-${String(tariffs.length + 1).padStart(3, "0")}`, type: "ToD", rate: avgRate, fixedCharges: fixed, startDate: tariffStart, endDate: tariffEnd, todSlots: todSlots.map((s) => ({ ...s })) };
    } else {
      const rate = parseFloat(tariffRate);
      if (isNaN(rate)) { toast.error("Please enter a valid rate"); return; }
      entry = { id: `T-${String(tariffs.length + 1).padStart(3, "0")}`, type: tariffType, rate, fixedCharges: fixed, startDate: tariffStart, endDate: tariffEnd };
    }
    setTariffs([...tariffs, entry]);
    toast.success("Tariff added");
  };

  const deleteTariff = (id: string) => { setTariffs(tariffs.filter((t) => t.id !== id)); toast.info("Tariff removed"); };

  const [specs, setSpecs] = useState<MoistureSpec[]>([
    { family: "Family A", year: currentYear, quarter: "Q1 (Jan–Mar)", lsl: 11.0, usl: 14.0, target: 12.5, updatedAt: new Date().toISOString().slice(0, 10) },
    { family: "Family A", year: currentYear, quarter: "Q2 (Apr–Jun)", lsl: 11.2, usl: 13.8, target: 12.5, updatedAt: new Date().toISOString().slice(0, 10) },
    { family: "Family B", year: currentYear, quarter: "Q1 (Jan–Mar)", lsl: 10.5, usl: 13.5, target: 12.0, updatedAt: new Date().toISOString().slice(0, 10) },
  ]);
  const dropdownData = useAppSelector(selectDropdownData);
  const machineOpts = (dropdownData?.common?.machines ?? []) as { value: string; label: string }[];
  const blendOpts   = (dropdownData?.common?.families ?? []) as { value: string; label: string }[];
  const [specMachine, setSpecMachine] = useState("");
  const [specBlend, setSpecBlend] = useState("");
  const [specYear, setSpecYear] = useState<number>(currentYear);
  const [specQuarter, setSpecQuarter] = useState(quarters[0]);
  const [specLsl, setSpecLsl] = useState("11.0");
  const [specUsl, setSpecUsl] = useState("14.0");
  const [specTarget, setSpecTarget] = useState("12.5");

  const currentSpec = specs.find((s) => s.family === specBlend && s.year === specYear && s.quarter === specQuarter);

  const saveSpec = () => {
    const lsl = parseFloat(specLsl); const usl = parseFloat(specUsl); const target = parseFloat(specTarget);
    if (isNaN(lsl) || isNaN(usl) || isNaN(target)) { toast.error("Enter valid numeric values"); return; }
    if (lsl >= usl) { toast.error("LSL must be less than USL"); return; }
    const updatedAt = new Date().toISOString().slice(0, 10);
    setSpecs((prev) => {
      const filtered = prev.filter((s) => !(s.family === specBlend && s.year === specYear && s.quarter === specQuarter));
      return [...filtered, { family: specBlend, year: specYear, quarter: specQuarter, lsl, usl, target, updatedAt }];
    });
    toast.success(`Spec saved for ${specBlend} · ${specQuarter} ${specYear}`);
  };

  const loadSpec = () => {
    if (currentSpec) { setSpecLsl(String(currentSpec.lsl)); setSpecUsl(String(currentSpec.usl)); setSpecTarget(String(currentSpec.target)); }
  };

  const loadBlends = async () => {
    setBlendLoading(true);
    try {
      const [blendsData, familiesData] = await Promise.all([
        apiService.fetchBlends(),
        apiService.fetchBlendFamilies(),
      ]);
      setBlends(blendsData);
      setBlendFamilies(familiesData);
    } catch {
      toast.error("Failed to load blend data");
    } finally {
      setBlendLoading(false);
    }
  };

  const handleAddBlend = async () => {
    const name = newBlendName.trim();
    if (!name) { toast.error("Blend name is required"); return; }
    if (!newBlendFamilyId) { toast.error("Please select a family"); return; }
    try {
      await apiService.upsertBlend({ action: 1, blendId: null, blendName: name, blendDescription: newBlendDescription.trim() || null, familyId: Number(newBlendFamilyId) });
      toast.success(`Blend "${name}" added`);
      setNewBlendName(""); setNewBlendFamilyId(""); setNewBlendDescription("");
      await loadBlends();
    } catch (e: any) {
      if (e?.response?.status === 409) toast.error("Blend name already exists");
      else toast.error("Failed to add blend");
    }
  };

  const startEditBlend = (blend: Blend) => {
    setEditingBlendId(blend.blendId);
    setEditBlendName(blend.blendName);
    setEditBlendFamilyId(String(blend.familyId));
    setEditBlendDescription(blend.blendDescription ?? "");
    setEditBlendStatus("Active");
  };

  const handleSaveEdit = async () => {
    if (editingBlendId === null) return;
    const name = editBlendName.trim();
    if (!name) { toast.error("Blend name is required"); return; }
    if (!editBlendFamilyId) { toast.error("Please select a family"); return; }
    try {
      if (editBlendStatus === "Inactive") {
        await apiService.upsertBlend({ action: 3, blendId: editingBlendId });
        toast.info("Blend deactivated");
      } else {
        await apiService.upsertBlend({ action: 2, blendId: editingBlendId, blendName: name, blendDescription: editBlendDescription.trim() || null, familyId: Number(editBlendFamilyId) });
        toast.success("Blend updated");
      }
      setEditingBlendId(null);
      await loadBlends();
    } catch {
      toast.error("Failed to update blend");
    }
  };

  const handleDeleteBlend = async (blendId: number) => {
    try {
      await apiService.upsertBlend({ action: 3, blendId });
      toast.info("Blend deactivated");
      await loadBlends();
    } catch {
      toast.error("Failed to delete blend");
    }
  };

  const handleBlendDownload = async () => {
    try {
      await apiService.downloadBlends();
      toast.success("Download started");
    } catch {
      toast.error("Failed to download blends");
    }
  };

  const handleBlendUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext || "")) { toast.error("Please upload an Excel file (.xlsx or .xls)"); return; }
    try {
      const result = await apiService.uploadBlends(file);
      toast.success(`Uploaded: ${result.inserted} inserted, ${result.updated} updated`);
      if (result.errors?.length) result.errors.forEach((err: string) => toast.warning(err));
      await loadBlends();
    } catch {
      toast.error("Failed to upload blends");
    } finally {
      if (blendFileInputRef.current) blendFileInputRef.current.value = "";
    }
  };

  const handleProdDownloadTemplate = async () => {
    try {
      await apiService.downloadProductionTemplate(format(prodDate, "yyyy-MM-dd"));
      toast.success("Template downloaded");
    } catch {
      toast.error("Failed to download template");
    }
  };

  const handleProdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext || "")) { toast.error("Please upload an Excel file (.xlsx or .xls)"); return; }
    try {
      const result = await apiService.uploadProductionData(file);
      setProdUploadResult(result);
      if (result.errors?.length) result.errors.forEach((err) => toast.warning(err));
      else toast.success(result.message ?? "Production data uploaded successfully");
    } catch {
      toast.error("Failed to upload production data");
    } finally {
      if (prodFileInputRef.current) prodFileInputRef.current.value = "";
    }
  };

  const handleProdQuery = async () => {
    setProdLoading(true);
    setProdData([]);
    setProdColumns([]);
    try {
      const data = await apiService.fetchProductionData(format(prodDate, "yyyy-MM-dd"));
      const rows = Array.isArray(data) ? data : [];
      if (rows.length > 0) setProdColumns(Object.keys(rows[0]));
      setProdData(rows);
    } catch {
      toast.error("Failed to fetch production data");
    } finally {
      setProdLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) { toast.error("Please upload a CSV or Excel file"); return; }
    toast.success(`"${file.name}" uploaded successfully`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const location = useLocation();
  const navigate = useNavigate();
  const validTabs = ["sku", "tariff", "moisture-specs", "process", "upload", "ec-losses", "alerts"];
  const urlTab = new URLSearchParams(location.search).get("tab");
  const activeTab = urlTab && validTabs.includes(urlTab) ? urlTab : "sku";

  useEffect(() => {
    if (activeTab === "sku") loadBlends();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardLayout>
      <div className="settings-page">
          <h2 className="page-title">Settings</h2>
          {activeTab === "sku" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
              <div className="settings-section-head settings-section-head--between">
                <div className="settings-head-row"><Package /><h3 className="settings-section-title">Blend Configuration</h3></div>
                <div className="settings-head-row">
                  <Button size="sm" variant="outline" onClick={handleBlendDownload}><Download />Download</Button>
                  <Button size="sm" variant="outline" onClick={() => blendFileInputRef.current?.click()}><Upload />Upload</Button>
                  <input ref={blendFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleBlendUpload} className="settings-file-hidden" aria-label="Upload blends Excel file" />
                </div>
              </div>
              <Separator />
              <div className="settings-blend-add-grid">
                <Input placeholder="Blend name" value={newBlendName} onChange={(e) => setNewBlendName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddBlend()} />
                <Dropdown
                  value={newBlendFamilyId || undefined}
                  onValueChange={setNewBlendFamilyId}
                  placeholder="Select family"
                  options={blendFamilies.map((f) => ({ value: String(f.familyId), label: f.familyName }))}
                />
                <Input placeholder="Description (optional)" value={newBlendDescription} onChange={(e) => setNewBlendDescription(e.target.value)} />
                <Button onClick={handleAddBlend} size="sm"><Plus />Add</Button>
              </div>
              <div className="settings-table-wrap">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th className="text-left">Blend Name</th>
                      <th className="text-left">Family</th>
                      <th className="text-left">Description</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blendLoading ? (
                      <tr><td colSpan={5} className="settings-table-empty">Loading…</td></tr>
                    ) : blends.length === 0 ? (
                      <tr><td colSpan={5} className="settings-table-empty">No blends configured</td></tr>
                    ) : blends.map((blend) => (
                      <tr key={blend.blendId}>
                        {editingBlendId === blend.blendId ? (
                          <>
                            <td><Input value={editBlendName} onChange={(e) => setEditBlendName(e.target.value)} /></td>
                            <td>
                              <Dropdown
                                value={editBlendFamilyId || undefined}
                                onValueChange={setEditBlendFamilyId}
                                options={blendFamilies.map((f) => ({ value: String(f.familyId), label: f.familyName }))}
                              />
                            </td>
                            <td><Input value={editBlendDescription} onChange={(e) => setEditBlendDescription(e.target.value)} /></td>
                            <td>
                              <Dropdown
                                value={editBlendStatus}
                                onValueChange={(v) => setEditBlendStatus(v as "Active" | "Inactive")}
                                options={[
                                  { value: "Active", label: "Active" },
                                  { value: "Inactive", label: "Inactive" },
                                ]}
                              />
                            </td>
                            <td>
                              <div className="settings-actions-cell">
                                <Button size="sm" variant="outline" onClick={handleSaveEdit}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingBlendId(null)}>Cancel</Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="medium">{blend.blendName}</td>
                            <td className="small">{blend.familyName}</td>
                            <td className="small muted">{blend.blendDescription || "—"}</td>
                            <td><Badge variant="outline" className="settings-badge-offpeak settings-badge-sm">Active</Badge></td>
                            <td>
                              <div className="settings-actions-cell">
                                <Button size="icon" variant="ghost" className="settings-btn-icon" onClick={() => startEditBlend(blend)}><Pencil /></Button>
                                <Button size="icon" variant="ghost" className="settings-btn-icon settings-btn--destructive" onClick={() => handleDeleteBlend(blend.blendId)}><Trash2 /></Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "tariff" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
              <div className="settings-section-head"><IndianRupee /><h3 className="settings-section-title">Tariff Settings</h3></div>
              <p className="settings-section-desc">Tariff is used for cost calculations across Energy dashboards and reports.</p>
              <Separator />

              <div className="settings-grid-3">
                <div className="settings-field">
                  <Label>Tariff Type</Label>
                  <Dropdown
                    value={tariffType}
                    onValueChange={(v) => setTariffType(v as TariffType)}
                    options={[
                      { value: "Fixed", label: "Fixed" },
                      { value: "Slab-based", label: "Slab-Based" },
                      { value: "ToD", label: "Time-of-Day (ToD)" },
                    ]}
                  />
                </div>
                {tariffType !== "ToD" && (
                  <div className="settings-field">
                    <Label>Rate (₹ per kWh)</Label>
                    <Input type="number" step="0.01" value={tariffRate} onChange={(e) => setTariffRate(e.target.value)} />
                  </div>
                )}
                <div className="settings-field">
                  <Label>Fixed Charges (₹)</Label>
                  <Input type="number" step="1" value={tariffFixed} onChange={(e) => setTariffFixed(e.target.value)} />
                </div>
                <div className="settings-field">
                  <Label>Effective Start Date</Label>
                  <Popover open={tariffStartOpen} onOpenChange={setTariffStartOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="settings-btn--full-start">
                        <CalendarIcon className="settings-cal-icon" />
                        {tariffStart ? format(tariffStart, "dd MMM yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="popover-content--calendar" align="start">
                      <Calendar mode="single" selected={tariffStart} onSelect={(d) => { if (d) { setTariffStart(d); setTariffStartOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="settings-field">
                  <Label>Effective End Date <span className="settings-optional-muted">(optional)</span></Label>
                  <Popover open={tariffEndOpen} onOpenChange={setTariffEndOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="settings-btn--full-start">
                        <CalendarIcon className="settings-cal-icon" />
                        {tariffEnd ? format(tariffEnd, "dd MMM yyyy") : "No end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="popover-content--calendar" align="start">
                      <Calendar mode="single" selected={tariffEnd} onSelect={(d) => { setTariffEnd(d); setTariffEndOpen(false); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="settings-field-flex-end">
                  <Button onClick={addTariff}><Plus />Add Tariff</Button>
                </div>
              </div>

              {tariffType === "ToD" && (
                <div className="settings-tod-card">
                  <div className="settings-tod-head">
                    <div>
                      <h4 className="settings-tod-title">ToD Charges Configuration</h4>
                      <p className="settings-tod-hint">Define rate per slot. Peak rate must be higher than Off-Peak. Time ranges cannot overlap.</p>
                    </div>
                  </div>
                  <div className="settings-tod-slots">
                    {todSlots.map((slot, idx) => (
                      <div key={slot.label} className="settings-tod-slot">
                        <div className="settings-tod-slot-field">
                          <Label className="settings-tod-slot-label">Slot</Label>
                          <div className="settings-tod-slot-pill">
                            <Badge variant="outline" className={`${slot.label === "Peak" ? "settings-badge-peak" : "settings-badge-offpeak"} settings-badge-sm`}>
                              {slot.label} Hours
                            </Badge>
                          </div>
                        </div>
                        <div className="settings-tod-slot-field">
                          <Label>Start Time</Label>
                          <Input type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, { startTime: e.target.value })} />
                        </div>
                        <div className="settings-tod-slot-field">
                          <Label>End Time</Label>
                          <Input type="time" value={slot.endTime} onChange={(e) => updateSlot(idx, { endTime: e.target.value })} />
                        </div>
                        <div className="settings-tod-slot-field">
                          <Label>Rate (₹ per kWh)</Label>
                          <Input type="number" step="0.01" value={slot.rate} onChange={(e) => updateSlot(idx, { rate: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="settings-section settings-section--gap-sm">
                <h4 className="settings-history-head"><History /> Tariff History</h4>
                <div className="settings-table-wrap">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th className="text-left">ID</th>
                        <th className="text-left">Type</th>
                        <th className="text-right">Rate (₹/kWh)</th>
                        <th className="text-right">Fixed (₹)</th>
                        <th className="text-left">Start</th>
                        <th className="text-left">End</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tariffs.map((t) => (
                        <tr key={t.id}>
                          <td className="mono">{t.id}</td>
                          <td><Badge variant="outline" className="settings-badge-sm">{t.type}</Badge></td>
                          <td className="right mono-strong">
                            {t.type === "ToD" && t.todSlots ? (
                              <div className="settings-tod-summary">
                                {t.todSlots.map((s) => (
                                  <span key={s.label}>
                                    <span className="label">{s.label}:</span> {s.startTime}–{s.endTime} @ {s.rate.toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            ) : (t.rate.toFixed(2))}
                          </td>
                          <td className="right mono-strong">{t.fixedCharges.toLocaleString()}</td>
                          <td className="small">{format(t.startDate, "dd MMM yyyy")}</td>
                          <td className="small">{t.endDate ? format(t.endDate, "dd MMM yyyy") : "—"}</td>
                          <td className="right">
                            <Button size="icon" variant="ghost" className="settings-btn-icon settings-btn--destructive" onClick={() => deleteTariff(t.id)}><Trash2 /></Button>
                          </td>
                        </tr>
                      ))}
                      {tariffs.length === 0 && (
                        <tr><td colSpan={7} className="settings-table-empty">No tariffs configured</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "moisture-specs" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
              <div className="settings-section-head"><FlaskConical /><h3 className="settings-section-title">Moisture Parameter Specifications</h3></div>
              <p className="settings-section-desc">
                Configured by <strong>Family</strong> with a <strong>quarterly view</strong>. Historical changes are tracked automatically.
              </p>
              <Separator />

              <div className="settings-grid-4">
                <div className="settings-field">
                  <Label>Machine</Label>
                  <Dropdown
                    value={specMachine || machineOpts[0]?.value || ""}
                    onValueChange={setSpecMachine}
                    options={machineOpts}
                  />
                </div>
                <div className="settings-field">
                  <Label>Blend</Label>
                  <Dropdown
                    value={specBlend || blendOpts[0]?.value || ""}
                    onValueChange={(v) => { setSpecBlend(v); setTimeout(loadSpec, 0); }}
                    options={blendOpts}
                  />
                </div>
                <div className="settings-field">
                  <Label>Year</Label>
                  <Dropdown
                    value={String(specYear)}
                    onValueChange={(v) => { setSpecYear(Number(v)); setTimeout(loadSpec, 0); }}
                    options={years.map((y) => String(y))}
                  />
                </div>
                <div className="settings-field">
                  <Label>Quarter</Label>
                  <Dropdown
                    value={specQuarter}
                    onValueChange={(v) => { setSpecQuarter(v); setTimeout(loadSpec, 0); }}
                    options={quarters}
                  />
                </div>
              </div>

              <div className="settings-grid-3-cells">
                <div className="settings-field"><Label>LSL (Lower Spec Limit, %)</Label><Input type="number" step="0.1" value={specLsl} onChange={(e) => setSpecLsl(e.target.value)} /></div>
                <div className="settings-field"><Label>USL (Upper Spec Limit, %)</Label><Input type="number" step="0.1" value={specUsl} onChange={(e) => setSpecUsl(e.target.value)} /></div>
                <div className="settings-field"><Label>Target (%)</Label><Input type="number" step="0.1" value={specTarget} onChange={(e) => setSpecTarget(e.target.value)} /></div>
              </div>

              <div className="settings-spec-footer">
                <div className="info">
                  {currentSpec ? (<>Last updated: <strong>{currentSpec.updatedAt}</strong></>) : (<span className="italic">No spec configured for this Family + Quarter — saving will create one.</span>)}
                </div>
                <Button onClick={saveSpec}>Save Spec</Button>
              </div>

              <Separator />

              <div className="settings-section settings-section--gap-sm">
                <h4 className="settings-history-head"><History /> Historical Spec Changes</h4>
                <div className="settings-table-wrap">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th className="text-left">Family</th>
                        <th className="text-left">Year</th>
                        <th className="text-left">Quarter</th>
                        <th className="text-right">LSL</th>
                        <th className="text-right">Target</th>
                        <th className="text-right">USL</th>
                        <th className="text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...specs].sort((a, b) => (a.family + a.year + a.quarter).localeCompare(b.family + b.year + b.quarter)).map((s, i) => (
                        <tr key={i}>
                          <td className="medium">{s.family}</td>
                          <td className="mono-strong">{s.year}</td>
                          <td>{s.quarter}</td>
                          <td className="right mono-strong">{s.lsl.toFixed(2)}</td>
                          <td className="right primary-strong">{s.target.toFixed(2)}</td>
                          <td className="right mono-strong">{s.usl.toFixed(2)}</td>
                          <td className="muted">{s.updatedAt}</td>
                        </tr>
                      ))}
                      {specs.length === 0 && (<tr><td colSpan={7} className="settings-table-empty">No specs configured</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "process" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
              <div className="settings-section-head"><Gauge /><h3 className="settings-section-title">Process Parameter Configuration</h3></div>
              <Separator />

              <div className="settings-process-block">
                <h4 className="settings-process-title">Temperature</h4>
                <div className="settings-grid-3-cells">
                  <div className="settings-field"><Label>Target (°C)</Label><Input defaultValue="85" type="number" /></div>
                  <div className="settings-field"><Label>LSL (°C)</Label><Input defaultValue="75" type="number" /></div>
                  <div className="settings-field"><Label>USL (°C)</Label><Input defaultValue="95" type="number" /></div>
                </div>
              </div>
              <Separator />
              <div className="settings-process-block">
                <h4 className="settings-process-title">Humidity</h4>
                <div className="settings-grid-3-cells">
                  <div className="settings-field"><Label>Target (% RH)</Label><Input defaultValue="58" type="number" /></div>
                  <div className="settings-field"><Label>LSL (% RH)</Label><Input defaultValue="50" type="number" /></div>
                  <div className="settings-field"><Label>USL (% RH)</Label><Input defaultValue="65" type="number" /></div>
                </div>
              </div>
              <div className="settings-save-row"><Button>Save Parameters</Button></div>
            </motion.div>
          )}

          {activeTab === "upload" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
              <div className="settings-section-head"><Upload /><h3 className="settings-section-title">Production Data Upload</h3></div>
              <p className="settings-section-desc">Download the template for a production date, fill in the data, and upload it back. Use Query to verify what was uploaded.</p>
              <Separator />

              <div className="settings-prod-date-row">
                <Label>Production Date</Label>
                <Popover open={prodDateOpen} onOpenChange={setProdDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="settings-btn--full-start settings-prod-date-btn">
                      <CalendarIcon className="settings-cal-icon" />
                      {format(prodDate, "dd MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={prodDate} onSelect={(d) => { if (d) { setProdDate(d); setProdDateOpen(false); } }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="settings-grid-2">
                <div className="settings-ec-card">
                  <div className="settings-ec-card-head"><Download /><h4 className="settings-ec-card-title">Download Template</h4></div>
                  <p className="settings-ec-card-desc">Download the Excel template for {format(prodDate, "dd MMM yyyy")}. Fill in the production data and upload it back.</p>
                  <Button variant="outline" size="sm" onClick={handleProdDownloadTemplate}>
                    <Download /> Download Template
                  </Button>
                </div>

                <div className="settings-ec-card dashed">
                  <Upload className="settings-ec-card-upload-icon" />
                  <p>Upload production data</p>
                  <p className="settings-ec-card-desc">Accepted: XLSX, XLS</p>
                  <input ref={prodFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleProdUpload} aria-label="Upload production data file" />
                  <Button variant="outline" size="sm" onClick={() => prodFileInputRef.current?.click()}>
                    <Upload /> Select File
                  </Button>
                  {prodUploadResult && (
                    <div className="settings-prod-upload-result">
                      {prodUploadResult.message && <span>{prodUploadResult.message}</span>}
                      {typeof prodUploadResult.inserted === "number" && (
                        <span>{prodUploadResult.inserted} inserted, {prodUploadResult.updated ?? 0} updated</span>
                      )}
                      {prodUploadResult.errors?.map((err, i) => (
                        <span key={i} className="settings-prod-upload-error">{err}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="settings-section settings-section--gap-sm">
                <div className="settings-section-head settings-section-head--between">
                  <h4 className="settings-history-head"><History /> Production Data — {format(prodDate, "dd MMM yyyy")}</h4>
                  <Button size="sm" onClick={handleProdQuery} disabled={prodLoading}>
                    {prodLoading ? "Loading…" : "Query Data"}
                  </Button>
                </div>
                <div className="settings-table-wrap">
                  <table className="settings-table">
                    {prodColumns.length > 0 && (
                      <thead>
                        <tr>
                          {prodColumns.map((col) => (
                            <th key={col} className="text-left">{col}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {prodLoading ? (
                        <tr><td colSpan={prodColumns.length || 1} className="settings-table-empty">Loading…</td></tr>
                      ) : prodData.length === 0 ? (
                        <tr><td colSpan={Math.max(prodColumns.length, 1)} className="settings-table-empty">No production data for this date. Click "Query Data" to load, or upload a file first.</td></tr>
                      ) : prodData.map((row, i) => (
                        <tr key={i}>
                          {prodColumns.map((col) => (
                            <td key={col} className="small">{row[col] ?? "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "ec-losses" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
              <div className="settings-section-head"><Zap /><h3 className="settings-section-title">Electricity Consumption Losses</h3></div>
              <p className="settings-section-desc">Download the standard template, fill in your factory's electricity loss data, and upload it back to keep loss calculations up to date.</p>
              <Separator />

              <div className="settings-grid-2">
                <div className="settings-ec-card">
                  <div className="settings-ec-card-head"><Download /><h4 className="settings-ec-card-title">Download Template</h4></div>
                  <p className="settings-ec-card-desc">Standard CSV template with required columns: Equipment, Rated Power (kW), Operating Hours, Loss Type, Loss (kWh).</p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => {
                      const csv = "Equipment,Rated Power (kW),Operating Hours,Loss Type,Loss (kWh)\nDryer-1,75,16,Idle,12\nCompressor-2,55,20,Leakage,8\n";
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "electricity_consumption_losses_template.csv"; a.click();
                      URL.revokeObjectURL(url); toast.success("Template downloaded");
                    }}
                  >
                    <Download /> Download Template
                  </Button>
                </div>

                <div className="settings-ec-card dashed">
                  <Upload className="settings-ec-card-upload-icon" />
                  <p>Upload completed template</p>
                  <p className="settings-ec-card-desc">Accepted: CSV, XLSX, XLS</p>
                  <input id="ec-losses-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} aria-label="Upload electricity consumption losses file" />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("ec-losses-file")?.click()}>
                    <Upload /> Select File
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "alerts" && (
            <AlertConfigurator />
          )}
      </div>
    </DashboardLayout>
  );
};

// ---------------- Alert Configurator ----------------

interface ScheduleRecipients {
  enabled: boolean;
  time: string;
  users: string[];
}
interface ShiftRecipients {
  enabled: boolean;
  shift: "A" | "B" | "C";
  users: string[];
}

interface AlertRule {
  id: string;
  name: string;
  unit: string;
  line: string;
  machine: string;
  parameter: string;
  useLimits: boolean;
  severity: "Critical" | "Warning" | "Info";
  emails: string[];
  alertInterval: string;
  daily: ScheduleRecipients;
  shiftWise: ShiftRecipients;
  enabled: boolean;
  updatedAt: string;
}

const PARAMETERS = ["Energy (kWh)", "Power (kW)", "Current (A)", "Voltage (V)", "Temperature (°C)", "Vibration (mm/s)"];
const SHIFTS: Array<{ value: "A" | "B" | "C"; label: string }> = [
  { value: "A", label: "Shift A (06:00 – 14:00)" },
  { value: "B", label: "Shift B (14:00 – 22:00)" },
  { value: "C", label: "Shift C (22:00 – 06:00)" },
];

const initialRules: AlertRule[] = [
  { id: "AL-001", name: "PMD L1 Mixer Energy", unit: "PMD", line: "PMD-L1", machine: "Mixer-01", parameter: "Energy (kWh)", useLimits: true, severity: "Critical", emails: ["ops@plant.com"], alertInterval: "00:15", daily: { enabled: false, time: "09:00", users: [] }, shiftWise: { enabled: false, shift: "A", users: [] }, enabled: true, updatedAt: new Date().toISOString().slice(0, 10) },
  { id: "AL-002", name: "SMD Oven Temperature", unit: "SMD", line: "SMD-L1", machine: "Oven-01", parameter: "Temperature (°C)", useLimits: true, severity: "Warning", emails: ["maint@plant.com", "lead@plant.com"], alertInterval: "00:30", daily: { enabled: true, time: "08:00", users: ["supervisor@plant.com"] }, shiftWise: { enabled: false, shift: "A", users: [] }, enabled: true, updatedAt: new Date().toISOString().slice(0, 10) },
];

const emptyRule = (): AlertRule => ({
  id: "",
  name: "",
  unit: energyTree[0]?.id ?? "",
  line: energyTree[0]?.lines[0]?.id ?? "",
  machine: energyTree[0]?.lines[0]?.assets[0]?.id ?? "",
  parameter: PARAMETERS[0],
  useLimits: true,
  severity: "Warning",
  emails: [],
  alertInterval: "00:15",
  daily: { enabled: false, time: "09:00", users: [] },
  shiftWise: { enabled: false, shift: "A", users: [] },
  enabled: true,
  updatedAt: new Date().toISOString().slice(0, 10),
});

const AlertConfigurator = () => {
  const [rules, setRules] = useState<AlertRule[]>(initialRules);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AlertRule>(emptyRule());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [dailyUserInput, setDailyUserInput] = useState("");
  const [shiftUserInput, setShiftUserInput] = useState("");

  const dropdownData = useAppSelector(selectDropdownData);
  const unitToParamMap = (dropdownData?.common?.unitToParamMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const paramOpts: { value: string; label: string }[] = unitToParamMap[draft.unit]?.length
    ? unitToParamMap[draft.unit]
    : PARAMETERS.map((p) => ({ value: p, label: p }));

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const addDailyUser = () => {
    const v = dailyUserInput.trim();
    if (!v) return;
    if (!isEmail(v)) { toast.error("Invalid email"); return; }
    if (draft.daily.users.includes(v)) { setDailyUserInput(""); return; }
    setDraft({ ...draft, daily: { ...draft.daily, users: [...draft.daily.users, v] } });
    setDailyUserInput("");
  };
  const removeDailyUser = (u: string) => setDraft({ ...draft, daily: { ...draft.daily, users: draft.daily.users.filter((x) => x !== u) } });
  const addShiftUser = () => {
    const v = shiftUserInput.trim();
    if (!v) return;
    if (!isEmail(v)) { toast.error("Invalid email"); return; }
    if (draft.shiftWise.users.includes(v)) { setShiftUserInput(""); return; }
    setDraft({ ...draft, shiftWise: { ...draft.shiftWise, users: [...draft.shiftWise.users, v] } });
    setShiftUserInput("");
  };
  const removeShiftUser = (u: string) => setDraft({ ...draft, shiftWise: { ...draft.shiftWise, users: draft.shiftWise.users.filter((x) => x !== u) } });

  const unitObj = energyTree.find((u) => u.id === draft.unit) ?? energyTree[0];
  const lineObj = unitObj?.lines.find((l) => l.id === draft.line) ?? unitObj?.lines[0];

  const openCreate = () => {
    setDraft(emptyRule());
    setEditingId(null);
    setEmailInput("");
    setOpen(true);
  };
  const openEdit = (rule: AlertRule) => {
    setDraft({ ...rule });
    setEditingId(rule.id);
    setEmailInput("");
    setOpen(true);
  };
  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.info("Alert removed");
  };
  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const addEmail = () => {
    const v = emailInput.trim();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error("Invalid email"); return; }
    if (draft.emails.includes(v)) { setEmailInput(""); return; }
    setDraft({ ...draft, emails: [...draft.emails, v] });
    setEmailInput("");
  };
  const removeEmail = (e: string) => setDraft({ ...draft, emails: draft.emails.filter((x) => x !== e) });

  const save = () => {
    if (!draft.name.trim()) { toast.error("Alert name is required"); return; }
    if (draft.emails.length === 0) { toast.error("Add at least one notification email"); return; }
    const updatedAt = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setRules((prev) => prev.map((r) => (r.id === editingId ? { ...draft, id: editingId, updatedAt } : r)));
      toast.success("Alert updated");
    } else {
      const id = `AL-${String(rules.length + 1).padStart(3, "0")}`;
      setRules((prev) => [...prev, { ...draft, id, updatedAt }]);
      toast.success("Alert created");
    }
    setOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
      <div className="settings-section-head settings-section-head--between">
        <div className="settings-head-row">
          <AlertTriangle /><h3 className="settings-section-title">Alert Configurator</h3>
        </div>
        <Button size="sm" onClick={openCreate}><Plus />Create Alert</Button>
      </div>
      <p className="settings-section-desc">Configure threshold-based alerts on Units, Lines, and Machines. Notifications are sent to the configured email recipients when values cross UCL or LCL.</p>
      <Separator />

      <div className="settings-table-wrap">
        <table className="settings-table">
          <thead>
            <tr>
              <th className="text-left">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">Scope</th>
              <th className="text-left">Parameter</th>
              <th className="text-left">LSL/USL</th>
              <th className="text-left">Severity</th>
              <th className="text-left">Recipients</th>
              <th className="text-left">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr><td colSpan={9} className="settings-table-empty">No alerts configured. Click "Create Alert" to add one.</td></tr>
            )}
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td className="medium">{r.name}</td>
                <td className="small">{r.unit} › {r.line} › {r.machine}</td>
                <td className="small">{r.parameter}</td>
                <td className="small">{r.useLimits ? "Enabled" : "—"}</td>
                <td>
                  <Badge variant="outline" className={`${r.severity === "Critical" ? "settings-badge-peak" : "settings-badge-offpeak"} settings-badge-sm`}>{r.severity}</Badge>
                </td>
                <td className="small muted">{r.emails.length} recipient{r.emails.length === 1 ? "" : "s"}</td>
                <td><Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} /></td>
                <td>
                  <div className="settings-actions-cell">
                    <Button size="icon" variant="ghost" className="settings-btn-icon" onClick={() => openEdit(r)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" className="settings-btn-icon settings-btn--destructive" onClick={() => removeRule(r.id)}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="settings-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Alert" : "Create Alert"}</DialogTitle>
          </DialogHeader>

          <div className="settings-section">
            <div className="settings-field">
              <Label>Alert Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. PMD L1 Mixer Energy Spike" />
            </div>

            <div className="settings-grid-3">
              <div className="settings-field">
                <Label>Unit</Label>
                <Dropdown value={draft.unit} onValueChange={(v) => {
                  const u = energyTree.find((x) => x.id === v);
                  const firstLine = u?.lines[0];
                  const firstParam = (unitToParamMap[v]?.[0]?.value) ?? PARAMETERS[0];
                  setDraft({ ...draft, unit: v, line: firstLine?.id ?? "", machine: firstLine?.assets[0]?.id ?? "", parameter: firstParam });
                }} options={energyTree.map((u) => ({ value: u.id, label: u.name }))} />
              </div>
              <div className="settings-field">
                <Label>Line</Label>
                <Dropdown value={draft.line} onValueChange={(v) => {
                  const l = unitObj?.lines.find((x) => x.id === v);
                  setDraft({ ...draft, line: v, machine: l?.assets[0]?.id ?? "" });
                }} options={(unitObj?.lines ?? []).map((l) => ({ value: l.id, label: l.name }))} />
              </div>
              <div className="settings-field">
                <Label>Machine</Label>
                <Dropdown value={draft.machine} onValueChange={(v) => setDraft({ ...draft, machine: v })} options={(lineObj?.assets ?? []).map((a) => ({ value: a.id, label: a.name }))} />
              </div>
            </div>

            <div className="settings-field">
              <Label>Parameter</Label>
              <Dropdown value={draft.parameter} onValueChange={(v) => setDraft({ ...draft, parameter: v })} options={paramOpts} />
            </div>
            <div className="settings-label-checkbox-row settings-field">
              <Checkbox id="useLimits" checked={draft.useLimits} onCheckedChange={(v) => setDraft({ ...draft, useLimits: v === true })} />
              <Label htmlFor="useLimits" className="settings-checkbox-label">LSL/USL</Label>
            </div>

            <div className="settings-field">
              <Label>Severity</Label>
              <Dropdown value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v as AlertRule["severity"] })} options={[
                { value: "Critical", label: "Critical" },
                { value: "Warning", label: "Warning" },
                { value: "Info", label: "Info" },
              ]} />
            </div>

            <Separator />

            <div className="settings-field">
              <Label className="settings-mail-label"><Mail className="settings-mail-icon" /> Email Notification Recipients</Label>
              <div className="settings-add-row">
                <Input placeholder="name@company.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())} />
                <Button onClick={addEmail} size="sm" variant="outline"><Plus />Add</Button>
              </div>
              <div className="settings-chip-row">
                {draft.emails.length === 0 && <span className="settings-section-desc">No recipients added yet.</span>}
                {draft.emails.map((e) => (
                  <Badge key={e} variant="outline" className="settings-chip">
                    {e}
                    <button type="button" onClick={() => removeEmail(e)} className="settings-chip-remove" aria-label="Remove email recipient">
                      <X className="settings-chip-remove-icon" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <Label>Alert Interval (HH:MM)</Label>
              <Input type="time" value={draft.alertInterval} onChange={(e) => setDraft({ ...draft, alertInterval: e.target.value })} />
              <span className="settings-section-desc">Minimum gap between consecutive alerts for this rule.</span>
            </div>

            <Separator />

            <div className="settings-field">
              <Label>Scheduled Summary Notifications</Label>

              <div className="settings-notif-box">
                <div className="settings-checkbox-row">
                  <Checkbox id="daily-check" checked={draft.daily.enabled} onCheckedChange={(v) => setDraft({ ...draft, daily: { ...draft.daily, enabled: !!v } })} />
                  <Label htmlFor="daily-check" className="settings-checkbox-label">Daily summary</Label>
                </div>
                {draft.daily.enabled && (
                  <div className="settings-notif-grid-time">
                    <div className="settings-field">
                      <Label>Send at</Label>
                      <Input type="time" value={draft.daily.time} onChange={(e) => setDraft({ ...draft, daily: { ...draft.daily, time: e.target.value } })} />
                    </div>
                    <div className="settings-field">
                      <Label>Recipients</Label>
                      <div className="settings-add-row">
                        <Input placeholder="user@company.com" value={dailyUserInput} onChange={(e) => setDailyUserInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDailyUser())} />
                        <Button onClick={addDailyUser} size="sm" variant="outline"><Plus />Add</Button>
                      </div>
                      <div className="settings-chip-row">
                        {draft.daily.users.length === 0 && <span className="settings-section-desc">No users added.</span>}
                        {draft.daily.users.map((u) => (
                          <Badge key={u} variant="outline" className="settings-chip">
                            {u}
                            <button type="button" onClick={() => removeDailyUser(u)} className="settings-chip-remove" aria-label="Remove daily recipient">
                              <X className="settings-chip-remove-icon" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="settings-checkbox-row">
                  <Checkbox id="shift-check" checked={draft.shiftWise.enabled} onCheckedChange={(v) => setDraft({ ...draft, shiftWise: { ...draft.shiftWise, enabled: !!v } })} />
                  <Label htmlFor="shift-check" className="settings-checkbox-label">Shift wise summary</Label>
                </div>
                {draft.shiftWise.enabled && (
                  <div className="settings-notif-grid-shift">
                    <div className="settings-field">
                      <Label>Shift</Label>
                      <Dropdown value={draft.shiftWise.shift} onValueChange={(v) => setDraft({ ...draft, shiftWise: { ...draft.shiftWise, shift: v as "A" | "B" | "C" } })} options={SHIFTS.map((s) => ({ value: s.value, label: s.label }))} />
                    </div>
                    <div className="settings-field">
                      <Label>Recipients</Label>
                      <div className="settings-add-row">
                        <Input placeholder="user@company.com" value={shiftUserInput} onChange={(e) => setShiftUserInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addShiftUser())} />
                        <Button onClick={addShiftUser} size="sm" variant="outline"><Plus />Add</Button>
                      </div>
                      <div className="settings-chip-row">
                        {draft.shiftWise.users.length === 0 && <span className="settings-section-desc">No users added.</span>}
                        {draft.shiftWise.users.map((u) => (
                          <Badge key={u} variant="outline" className="settings-chip">
                            {u}
                            <button type="button" onClick={() => removeShiftUser(u)} className="settings-chip-remove" aria-label="Remove shift recipient">
                              <X className="settings-chip-remove-icon" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>



            <div className="settings-notif-row">
              <Label className="settings-checkbox-label">Enable this alert</Label>
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editingId ? "Save Changes" : "Create Alert"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsPage;
