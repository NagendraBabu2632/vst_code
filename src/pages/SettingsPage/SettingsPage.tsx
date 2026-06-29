import './SettingsPage.css';
import { useState, useRef, useEffect } from "react";
import { useAppSelector } from "@/redux/hooks/reduxHooks";
import { selectDropdownData } from "@/redux/slices/dropdownSlice";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import { motion } from "framer-motion";
import { Bell, Gauge, Package, Upload, Plus, Trash2, Pencil, IndianRupee, FlaskConical, History, Download, Zap, CalendarIcon, AlertTriangle, Mail, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import type { AlertRuleApi, TariffMaster, TariffBand } from "@/services/api";

const parameters = ["Moisture S1", "Moisture S2", "Moisture S3", "Moisture S4"];

interface BlendFamily { familyId: number; familyName: string; }
interface Blend { blendId: number; blendName: string; blendDescription: string; familyId: number; familyName: string; }
const quarters = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

interface MoistureSpec { family: string; year: number; quarter: string; lsl: number; usl: number; target: number; updatedAt: string; }

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

  const [processTargets, setProcessTargets] = useState<Record<string, { lsl: string; usl: string; target: string }>>({
    Temperature: { lsl: "27", usl: "35", target: "31" },
    Humidity: { lsl: "50", usl: "65", target: "58" },
  });
  const [processLoading, setProcessLoading] = useState(false);
  const [processSaving, setProcessSaving] = useState(false);


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

  const loadProcessTargets = async () => {
    setProcessLoading(true);
    try {
      const data = await apiService.fetchSensorTargets();
      const map: Record<string, { lsl: string; usl: string; target: string }> = {};
      data.forEach(t => { map[t.parameterType] = { lsl: String(t.lsl), usl: String(t.usl), target: String(t.target) }; });
      setProcessTargets(prev => ({ ...prev, ...map }));
    } catch {
      // keep defaults on API failure
    } finally {
      setProcessLoading(false);
    }
  };

  const saveProcessTargets = async () => {
    setProcessSaving(true);
    try {
      const payload = Object.entries(processTargets).map(([parameterType, vals]) => ({
        parameterType,
        lsl: parseFloat(vals.lsl),
        usl: parseFloat(vals.usl),
        target: parseFloat(vals.target),
      }));
      await apiService.saveSensorTargets(payload);
      toast.success("Parameters saved");
      await loadProcessTargets();
    } catch {
      toast.error("Failed to save parameters");
    } finally {
      setProcessSaving(false);
    }
  };

  const updateProcessField = (param: string, field: "lsl" | "usl" | "target", value: string) => {
    setProcessTargets(prev => ({ ...prev, [param]: { ...prev[param], [field]: value } }));
  };

  useEffect(() => {
    if (activeTab === "sku") loadBlends();
    if (activeTab === "process") loadProcessTargets();
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

          {activeTab === "tariff" && <TariffSection />}

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
              <p className="settings-section-desc">Define LSL, USL, and Target for each process parameter. These values drive threshold alerts and process analysis charts.</p>
              <Separator />

              {processLoading ? (
                <p className="settings-section-desc">Loading…</p>
              ) : (
                <>
                  {[
                    { key: "Temperature", unit: "°C" },
                    { key: "Humidity",    unit: "% RH" },
                  ].map(({ key, unit }, i) => (
                    <div key={key}>
                      {i > 0 && <Separator />}
                      <div className="settings-process-block">
                        <h4 className="settings-process-title">{key}</h4>
                        <div className="settings-grid-3-cells">
                          <div className="settings-field">
                            <Label>Target ({unit})</Label>
                            <Input
                              type="number" step="0.1"
                              value={processTargets[key]?.target ?? ""}
                              onChange={e => updateProcessField(key, "target", e.target.value)}
                            />
                          </div>
                          <div className="settings-field">
                            <Label>LSL ({unit})</Label>
                            <Input
                              type="number" step="0.1"
                              value={processTargets[key]?.lsl ?? ""}
                              onChange={e => updateProcessField(key, "lsl", e.target.value)}
                            />
                          </div>
                          <div className="settings-field">
                            <Label>USL ({unit})</Label>
                            <Input
                              type="number" step="0.1"
                              value={processTargets[key]?.usl ?? ""}
                              onChange={e => updateProcessField(key, "usl", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="settings-save-row">
                <Button onClick={saveProcessTargets} disabled={processSaving || processLoading}>
                  {processSaving ? "Saving…" : "Save Parameters"}
                </Button>
              </div>
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

// ---------------- Tariff Section ----------------

interface BandDraft {
  bandId?: number;
  bandName: "Normal" | "Peak" | "OffPeak" | "HalfPeak";
  startHour: number;
  endHour: number;
  ratePerKWH: string;
}

const BAND_NAMES: Array<"Normal" | "Peak" | "OffPeak" | "HalfPeak"> = ["Normal", "Peak", "OffPeak", "HalfPeak"];
const hrLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

const TariffSection = () => {
  const [tariffs, setTariffs] = useState<TariffMaster[]>([]);
  const [activeTariff, setActiveTariff] = useState<TariffMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [fCode, setFCode] = useState("");
  const [fType, setFType] = useState("ToD");
  const [fRate, setFRate] = useState("");
  const [fFixed, setFFixed] = useState("");
  const [fDuty, setFDuty] = useState("0.06");
  const [fStartDate, setFStartDate] = useState<Date | undefined>();
  const [fEndDate, setFEndDate] = useState<Date | undefined>();
  const [fCloseActive, setFCloseActive] = useState(true);
  const [fStartOpen, setFStartOpen] = useState(false);
  const [fEndOpen, setFEndOpen] = useState(false);

  const [bands, setBands] = useState<BandDraft[]>([]);
  const [editingBandIdx, setEditingBandIdx] = useState<number | null>(null);
  const [bandDraft, setBandDraft] = useState<Partial<BandDraft>>({});
  const [newBandName, setNewBandName] = useState<BandDraft["bandName"]>("Peak");
  const [newBandStart, setNewBandStart] = useState("18");
  const [newBandEnd, setNewBandEnd] = useState("22");
  const [newBandRate, setNewBandRate] = useState("");
  const [bandSaving, setBandSaving] = useState(false);

  const loadTariffs = async () => {
    setLoading(true);
    try {
      const [allRes, activeRes] = await Promise.allSettled([
        apiService.fetchAllTariffs(),
        apiService.fetchActiveTariff(),
      ]);
      if (allRes.status === "fulfilled") setTariffs(allRes.value);
      else toast.error("Failed to load tariffs");
      if (activeRes.status === "fulfilled") setActiveTariff(activeRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTariffs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setFCode(""); setFType("ToD"); setFRate(""); setFFixed(""); setFDuty("0.06");
    setFStartDate(undefined); setFEndDate(undefined); setFCloseActive(true);
    setBands([]); setEditingBandIdx(null); setNewBandRate("");
    setDialogOpen(true);
  };

  const openEdit = (t: TariffMaster) => {
    setEditingId(t.tariffID);
    setFCode(t.tariffCode);
    setFType(t.tariffType);
    setFRate(String(t.ratePerKWH));
    setFFixed(String(t.fixedCharges));
    setFDuty(String(t.dutyChargePerKWH));
    setFStartDate(t.startDate ? new Date(t.startDate) : undefined);
    setFEndDate(t.endDate ? new Date(t.endDate) : undefined);
    setBands(t.bands.map(b => ({
      bandId: b.bandId,
      bandName: b.bandName,
      startHour: b.startHour,
      endHour: b.endHour,
      ratePerKWH: String(b.ratePerKWH),
    })));
    setEditingBandIdx(null); setNewBandRate("");
    setDialogOpen(true);
  };

  const saveTariff = async () => {
    if (!fCode.trim()) { toast.error("Tariff code is required"); return; }
    const rateNum = parseFloat(fRate);
    const fixedNum = parseFloat(fFixed);
    const dutyNum = parseFloat(fDuty) || 0;
    if (isNaN(rateNum) || rateNum <= 0) { toast.error("Rate must be > 0"); return; }
    if (isNaN(fixedNum) || fixedNum < 0) { toast.error("Fixed charges must be ≥ 0"); return; }
    if (!fStartDate) { toast.error("Start date is required"); return; }

    const startDateStr = format(fStartDate, "yyyy-MM-dd");
    const endDateStr = fEndDate ? format(fEndDate, "yyyy-MM-dd") : null;
    const bandsPayload = bands.map(b => ({
      bandName: b.bandName,
      startHour: b.startHour,
      endHour: b.endHour,
      ratePerKWH: parseFloat(b.ratePerKWH) || 0,
    }));

    setSaving(true);
    try {
      if (editingId === null) {
        await apiService.createTariff({
          tariffCode: fCode.trim(),
          tariffType: fType,
          ratePerKWH: rateNum,
          fixedCharges: fixedNum,
          dutyChargePerKWH: dutyNum,
          startDate: startDateStr,
          endDate: endDateStr,
          closeActiveMaster: fCloseActive,
          bands: bandsPayload,
        });
        toast.success("Tariff created");
      } else {
        await apiService.updateTariff(editingId, {
          tariffCode: fCode.trim(),
          tariffType: fType,
          ratePerKWH: rateNum,
          fixedCharges: fixedNum,
          dutyChargePerKWH: dutyNum,
          startDate: startDateStr,
          endDate: endDateStr,
          bands: bandsPayload,
        });
        toast.success("Tariff updated");
      }
      setDialogOpen(false);
      await loadTariffs();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? (editingId === null ? "Failed to create tariff" : "Failed to update tariff"));
    } finally {
      setSaving(false);
    }
  };

  const removeTariff = async (id: number) => {
    try {
      await apiService.deleteTariff(id);
      toast.info("Tariff deleted");
      setTariffs(prev => prev.filter(t => t.tariffID !== id));
      if (activeTariff?.tariffID === id) setActiveTariff(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete tariff");
    }
  };

  const handleAddBand = async () => {
    const rate = parseFloat(newBandRate);
    if (isNaN(rate) || rate <= 0) { toast.error("Band rate must be > 0"); return; }
    const startH = parseInt(newBandStart, 10);
    const endH = parseInt(newBandEnd, 10);
    if (isNaN(startH) || isNaN(endH)) { toast.error("Invalid hour values"); return; }

    if (editingId !== null) {
      setBandSaving(true);
      try {
        const result = await apiService.addTariffBand(editingId, {
          bandName: newBandName, startHour: startH, endHour: endH, ratePerKWH: rate,
        });
        setBands(prev => [...prev, {
          bandId: result.bandId, bandName: result.bandName,
          startHour: result.startHour, endHour: result.endHour, ratePerKWH: String(result.ratePerKWH),
        }]);
        toast.success("Band added");
        setNewBandRate("");
      } catch (e: any) {
        toast.error(e?.response?.data?.error ?? "Failed to add band");
      } finally {
        setBandSaving(false);
      }
    } else {
      setBands(prev => [...prev, { bandName: newBandName, startHour: startH, endHour: endH, ratePerKWH: String(rate) }]);
      setNewBandRate("");
    }
  };

  const handleDeleteBand = async (band: BandDraft, idx: number) => {
    if (editingId !== null && band.bandId != null) {
      try {
        await apiService.deleteTariffBand(editingId, band.bandId);
        setBands(prev => prev.filter((_, i) => i !== idx));
        toast.info("Band deleted");
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? "Failed to delete band");
      }
    } else {
      setBands(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const startBandEdit = (idx: number) => {
    setEditingBandIdx(idx);
    setBandDraft({ ...bands[idx] });
  };

  const saveBandEdit = async (idx: number) => {
    const rate = parseFloat(bandDraft.ratePerKWH ?? "0");
    if (isNaN(rate) || rate <= 0) { toast.error("Rate must be > 0"); return; }
    const updated: BandDraft = {
      ...bands[idx],
      bandName: bandDraft.bandName ?? bands[idx].bandName,
      startHour: bandDraft.startHour ?? bands[idx].startHour,
      endHour: bandDraft.endHour ?? bands[idx].endHour,
      ratePerKWH: String(rate),
    };

    if (editingId !== null && bands[idx].bandId != null) {
      try {
        const result = await apiService.updateTariffBand(editingId, bands[idx].bandId!, {
          bandName: updated.bandName, startHour: updated.startHour,
          endHour: updated.endHour, ratePerKWH: rate,
        });
        setBands(prev => prev.map((b, i) => i === idx ? {
          ...b, bandName: result.bandName, startHour: result.startHour,
          endHour: result.endHour, ratePerKWH: String(result.ratePerKWH),
        } : b));
        toast.success("Band updated");
      } catch (e: any) {
        toast.error(e?.response?.data?.error ?? "Failed to update band");
        return;
      }
    } else {
      setBands(prev => prev.map((b, i) => i === idx ? updated : b));
    }
    setEditingBandIdx(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
      <div className="settings-section-head settings-section-head--between">
        <div className="settings-head-row"><IndianRupee /><h3 className="settings-section-title">Tariff Settings</h3></div>
        <Button size="sm" onClick={openCreate}><Plus />New Tariff</Button>
      </div>
      <p className="settings-section-desc">Tariff is used for cost calculations across Energy dashboards and reports.</p>
      <Separator />

      {activeTariff && (
        <div className="settings-tod-card">
          <div className="settings-tod-head">
            <div>
              <h4 className="settings-tod-title">Active Tariff — {activeTariff.tariffCode}</h4>
              <p className="settings-tod-hint">
                Type: {activeTariff.tariffType} &nbsp;|&nbsp; Rate: ₹{activeTariff.ratePerKWH}/kWh &nbsp;|&nbsp;
                Fixed: ₹{activeTariff.fixedCharges.toLocaleString()} &nbsp;|&nbsp;
                Duty: ₹{activeTariff.dutyChargePerKWH}/kWh &nbsp;|&nbsp;
                Since: {activeTariff.startDate}
              </p>
            </div>
            <Badge variant="outline" className="settings-badge-offpeak settings-badge-sm">Active</Badge>
          </div>
          {activeTariff.bands.length > 0 && (
            <div className="settings-tod-slots">
              {activeTariff.bands.map(b => (
                <div key={b.bandId} className="settings-tod-slot">
                  <div className="settings-tod-slot-field">
                    <Label className="settings-tod-slot-label">Band</Label>
                    <Badge variant="outline" className={`${b.bandName === "Peak" ? "settings-badge-peak" : "settings-badge-offpeak"} settings-badge-sm`}>{b.bandName}</Badge>
                  </div>
                  <div className="settings-tod-slot-field">
                    <Label className="settings-tod-slot-label">Time Range</Label>
                    <span className="settings-section-desc">{b.timeRange}</span>
                  </div>
                  <div className="settings-tod-slot-field">
                    <Label className="settings-tod-slot-label">Rate (₹/kWh)</Label>
                    <span className="settings-section-desc">{b.ratePerKWH}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="settings-section settings-section--gap-sm">
        <h4 className="settings-history-head"><History /> Tariff History</h4>
        <div className="settings-table-wrap">
          <table className="settings-table">
            <thead>
              <tr>
                <th className="text-left">Code</th>
                <th className="text-left">Type</th>
                <th className="text-right">Rate (₹/kWh)</th>
                <th className="text-right">Fixed (₹)</th>
                <th className="text-right">Duty (₹/kWh)</th>
                <th className="text-left">Start</th>
                <th className="text-left">End</th>
                <th className="text-left">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="settings-table-empty">Loading…</td></tr>
              ) : tariffs.length === 0 ? (
                <tr><td colSpan={9} className="settings-table-empty">No tariffs configured. Click "New Tariff" to add one.</td></tr>
              ) : tariffs.map(t => (
                <tr key={t.tariffID}>
                  <td className="mono">{t.tariffCode}</td>
                  <td><Badge variant="outline" className="settings-badge-sm">{t.tariffType}</Badge></td>
                  <td className="right mono-strong">{t.ratePerKWH.toFixed(2)}</td>
                  <td className="right mono-strong">{t.fixedCharges.toLocaleString()}</td>
                  <td className="right mono-strong">{t.dutyChargePerKWH.toFixed(3)}</td>
                  <td className="small">{t.startDate}</td>
                  <td className="small">{t.endDate ?? "—"}</td>
                  <td>
                    <Badge variant="outline" className={`${t.isActive ? "settings-badge-offpeak" : ""} settings-badge-sm`}>
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <div className="settings-actions-cell">
                      <Button size="icon" variant="ghost" className="settings-btn-icon" onClick={() => openEdit(t)}><Pencil /></Button>
                      <Button size="icon" variant="ghost" className="settings-btn-icon settings-btn--destructive" onClick={() => removeTariff(t.tariffID)}><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="settings-dialog--lg">
          <DialogHeader>
            <DialogTitle>{editingId == null ? "New Tariff" : "Edit Tariff"}</DialogTitle>
          </DialogHeader>

          <div className="settings-section">
            <div className="settings-grid-3">
              <div className="settings-field">
                <Label>Tariff Code</Label>
                <Input placeholder="e.g. LT-IIA-2026" value={fCode} onChange={e => setFCode(e.target.value)} />
              </div>
              <div className="settings-field">
                <Label>Tariff Type</Label>
                <Dropdown
                  value={fType}
                  onValueChange={setFType}
                  options={[
                    { value: "Fixed", label: "Fixed" },
                    { value: "ToD", label: "Time-of-Day (ToD)" },
                  ]}
                />
              </div>
              <div className="settings-field">
                <Label>Rate (₹/kWh)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={fRate} onChange={e => setFRate(e.target.value)} />
              </div>
              <div className="settings-field">
                <Label>Fixed Charges (₹)</Label>
                <Input type="number" step="1" placeholder="0" value={fFixed} onChange={e => setFFixed(e.target.value)} />
              </div>
              <div className="settings-field">
                <Label>Duty Charge (₹/kWh)</Label>
                <Input type="number" step="0.001" placeholder="0.060" value={fDuty} onChange={e => setFDuty(e.target.value)} />
              </div>
            </div>

            <div className="settings-grid-3-cells">
              <div className="settings-field">
                <Label>Start Date</Label>
                <Popover open={fStartOpen} onOpenChange={setFStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="settings-btn--full-start">
                      <CalendarIcon className="settings-cal-icon" />
                      {fStartDate ? format(fStartDate, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={fStartDate} onSelect={d => { if (d) { setFStartDate(d); setFStartOpen(false); } }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="settings-field">
                <Label>End Date <span className="settings-optional-muted">(optional)</span></Label>
                <Popover open={fEndOpen} onOpenChange={setFEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="settings-btn--full-start">
                      <CalendarIcon className="settings-cal-icon" />
                      {fEndDate ? format(fEndDate, "dd MMM yyyy") : "No end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="popover-content--calendar" align="start">
                    <Calendar mode="single" selected={fEndDate} onSelect={d => { setFEndDate(d); setFEndOpen(false); }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              {editingId === null && (
                <div className="settings-field settings-field-flex-end">
                  <div className="settings-label-checkbox-row">
                    <Checkbox id="closeActive" checked={fCloseActive} onCheckedChange={v => setFCloseActive(!!v)} />
                    <Label htmlFor="closeActive" className="settings-checkbox-label">Auto-close active tariff</Label>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="settings-section settings-section--gap-sm">
              <h4 className="settings-tod-title">Time Bands</h4>
              <p className="settings-section-desc">Normal band is auto-added as fallback. Specify Peak, OffPeak, or HalfPeak bands. Hours are 0–23.</p>

              {bands.length > 0 && (
                <div className="settings-table-wrap">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th className="text-left">Band</th>
                        <th className="text-left">Start Hr</th>
                        <th className="text-left">End Hr</th>
                        <th className="text-right">Rate (₹/kWh)</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bands.map((b, idx) => (
                        <tr key={idx}>
                          {editingBandIdx === idx ? (
                            <>
                              <td>
                                <Dropdown
                                  value={bandDraft.bandName ?? b.bandName}
                                  onValueChange={v => setBandDraft(prev => ({ ...prev, bandName: v as BandDraft["bandName"] }))}
                                  options={BAND_NAMES.map(n => ({ value: n, label: n }))}
                                />
                              </td>
                              <td>
                                <Input type="number" min={0} max={23}
                                  value={bandDraft.startHour ?? b.startHour}
                                  onChange={e => setBandDraft(prev => ({ ...prev, startHour: parseInt(e.target.value) || 0 }))} />
                              </td>
                              <td>
                                <Input type="number" min={0} max={23}
                                  value={bandDraft.endHour ?? b.endHour}
                                  onChange={e => setBandDraft(prev => ({ ...prev, endHour: parseInt(e.target.value) || 0 }))} />
                              </td>
                              <td>
                                <Input type="number" step="0.01"
                                  value={bandDraft.ratePerKWH ?? b.ratePerKWH}
                                  onChange={e => setBandDraft(prev => ({ ...prev, ratePerKWH: e.target.value }))} />
                              </td>
                              <td>
                                <div className="settings-actions-cell">
                                  <Button size="sm" variant="outline" onClick={() => saveBandEdit(idx)}>Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingBandIdx(null)}>Cancel</Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>
                                <Badge variant="outline" className={`${b.bandName === "Peak" ? "settings-badge-peak" : "settings-badge-offpeak"} settings-badge-sm`}>{b.bandName}</Badge>
                              </td>
                              <td className="mono">{hrLabel(b.startHour)}</td>
                              <td className="mono">{hrLabel(b.endHour)}</td>
                              <td className="right mono-strong">{parseFloat(b.ratePerKWH).toFixed(2)}</td>
                              <td>
                                <div className="settings-actions-cell">
                                  <Button size="icon" variant="ghost" className="settings-btn-icon" onClick={() => startBandEdit(idx)}><Pencil /></Button>
                                  <Button size="icon" variant="ghost" className="settings-btn-icon settings-btn--destructive" onClick={() => handleDeleteBand(b, idx)}><Trash2 /></Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="settings-band-add-grid">
                <Dropdown
                  value={newBandName}
                  onValueChange={v => setNewBandName(v as BandDraft["bandName"])}
                  options={BAND_NAMES.map(n => ({ value: n, label: n }))}
                />
                <Input type="number" min={0} max={23} placeholder="Start hr" value={newBandStart} onChange={e => setNewBandStart(e.target.value)} />
                <Input type="number" min={0} max={23} placeholder="End hr" value={newBandEnd} onChange={e => setNewBandEnd(e.target.value)} />
                <Input type="number" step="0.01" placeholder="Rate ₹/kWh" value={newBandRate} onChange={e => setNewBandRate(e.target.value)} />
                <Button size="sm" onClick={handleAddBand} disabled={bandSaving}>
                  <Plus />{bandSaving ? "Adding…" : "Add Band"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveTariff} disabled={saving}>
              {saving ? "Saving…" : editingId == null ? "Create Tariff" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
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
  ruleId?: number;
  id: string;
  name: string;
  unit: string;
  line: string;
  machine: string;
  parameter: string;
  useLimits: boolean;
  lsl: string;
  usl: string;
  severity: "Critical" | "Warning" | "Info";
  emails: string[];
  alertInterval: string;
  daily: ScheduleRecipients;
  shiftWise: ShiftRecipients;
  enabled: boolean;
}

const PARAMETERS = ["Temperature", "Humidity"];
const SHIFTS: Array<{ value: "A" | "B" | "C"; label: string }> = [
  { value: "A", label: "Shift A (06:00 – 14:00)" },
  { value: "B", label: "Shift B (14:00 – 22:00)" },
  { value: "C", label: "Shift C (22:00 – 06:00)" },
];

const minutesToHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const hhmmToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const shiftNoToLetter = (n?: number | null): "A" | "B" | "C" => {
  if (n === 2) return "B";
  if (n === 3) return "C";
  return "A";
};

const shiftLetterToNo = (letter: "A" | "B" | "C"): number => {
  if (letter === "B") return 2;
  if (letter === "C") return 3;
  return 1;
};

const toStringArray = (v?: string | string[] | null): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};

const apiToLocal = (r: AlertRuleApi): AlertRule => ({
  ruleId: r.ruleId,
  id: String(r.ruleId),
  name: r.ruleName,
  unit: r.unit,
  line: r.line,
  machine: r.machine,
  parameter: r.parameterType,
  useLimits: r.useLslUsl,
  lsl: r.lsl != null ? String(r.lsl) : "",
  usl: r.usl != null ? String(r.usl) : "",
  severity: r.severity,
  emails: toStringArray(r.emailRecipients),
  alertInterval: minutesToHHMM(r.alertIntervalMinutes),
  daily: {
    enabled: r.dailySummaryEnabled,
    time: r.dailySummaryTime ?? "09:00",
    users: toStringArray(r.dailySummaryRecipients),
  },
  shiftWise: {
    enabled: r.shiftSummaryEnabled,
    shift: shiftNoToLetter(r.shiftSummaryShiftNo ?? r.shiftNo),
    users: toStringArray(r.shiftSummaryRecipients),
  },
  enabled: r.isEnabled,
});

const toCommaSeparated = (arr: string[]): string => arr.join(" , ");

const localToPayload = (draft: AlertRule) => ({
  ruleName: draft.name,
  unit: draft.unit,
  line: draft.line,
  machine: draft.machine,
  parameterType: draft.parameter,
  useLslUsl: draft.useLimits,
  lsl: !draft.useLimits && draft.lsl !== "" ? parseFloat(draft.lsl) : null,
  usl: !draft.useLimits && draft.usl !== "" ? parseFloat(draft.usl) : null,
  severity: draft.severity,
  alertIntervalMinutes: hhmmToMinutes(draft.alertInterval),
  emailRecipients: toCommaSeparated(draft.emails),
  dailySummaryEnabled: draft.daily.enabled,
  dailySummaryTime: draft.daily.enabled ? draft.daily.time : null,
  dailySummaryRecipients: draft.daily.enabled ? toCommaSeparated(draft.daily.users) : "",
  shiftSummaryEnabled: draft.shiftWise.enabled,
  shiftNo: draft.shiftWise.enabled ? shiftLetterToNo(draft.shiftWise.shift) : null,
  shiftSummaryRecipients: draft.shiftWise.enabled ? toCommaSeparated(draft.shiftWise.users) : "",
  isEnabled: draft.enabled,
});

const emptyRule = (): AlertRule => ({
  ruleId: undefined,
  id: "",
  name: "",
  unit: "",
  line: "",
  machine: "",
  parameter: PARAMETERS[0],
  useLimits: true,
  lsl: "",
  usl: "",
  severity: "Warning",
  emails: [],
  alertInterval: "00:15",
  daily: { enabled: false, time: "09:00", users: [] },
  shiftWise: { enabled: false, shift: "A", users: [] },
  enabled: true,
});

const AlertConfigurator = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AlertRule>(emptyRule());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [dailyUserInput, setDailyUserInput] = useState("");
  const [shiftUserInput, setShiftUserInput] = useState("");

  const dropdownData = useAppSelector(selectDropdownData);
  const unitOpts = (dropdownData?.common?.units ?? []) as { value: string; label: string }[];
  const unitToLineMap = (dropdownData?.common?.unitToLineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const unitLineToMachineMap = (dropdownData?.common?.unitLineToMachineMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const lineToMachineMap = (dropdownData?.common?.lineToMachineMapping ?? {}) as Record<string, { value: string; label: string }[]>;

  const lineOpts = (
    draft.unit && unitToLineMap[draft.unit]
      ? unitToLineMap[draft.unit]
      : (dropdownData?.common?.lines ?? [])
  ) as { value: string; label: string }[];

  const machineOpts = (
    draft.unit && draft.line && unitLineToMachineMap[`${draft.unit}:${draft.line}`]
      ? unitLineToMachineMap[`${draft.unit}:${draft.line}`]
      : draft.line && lineToMachineMap[draft.line]
        ? lineToMachineMap[draft.line]
        : (dropdownData?.common?.machines ?? [])
  ) as { value: string; label: string }[];

  const unitToParamMap = (dropdownData?.common?.unitToParamMapping ?? {}) as Record<string, { value: string; label: string }[]>;
  const paramOpts: { value: string; label: string }[] = unitToParamMap[draft.unit]?.length
    ? unitToParamMap[draft.unit]
    : PARAMETERS.map((p) => ({ value: p, label: p }));

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await apiService.fetchAlertRules();
      setRules(data.map(apiToLocal));
    } catch {
      toast.error("Failed to load alert rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openCreate = () => {
    const firstUnit = unitOpts[0]?.value ?? "";
    const firstLine = unitToLineMap[firstUnit]?.[0]?.value ?? "";
    const firstMachine = (
      unitLineToMachineMap[`${firstUnit}:${firstLine}`]?.[0]?.value ??
      lineToMachineMap[firstLine]?.[0]?.value ?? ""
    );
    setDraft({ ...emptyRule(), unit: firstUnit, line: firstLine, machine: firstMachine });
    setEditingId(null);
    setEmailInput("");
    setDailyUserInput("");
    setShiftUserInput("");
    setOpen(true);
  };

  const openEdit = (rule: AlertRule) => {
    setDraft({ ...rule });
    setEditingId(rule.ruleId ?? null);
    setEmailInput("");
    setDailyUserInput("");
    setShiftUserInput("");
    setOpen(true);
  };

  const removeRule = async (rule: AlertRule) => {
    if (rule.ruleId == null) return;
    try {
      await apiService.deleteAlertRule(rule.ruleId);
      toast.info("Alert rule deleted");
      setRules((prev) => prev.filter((r) => r.ruleId !== rule.ruleId));
    } catch {
      toast.error("Failed to delete alert rule");
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    if (rule.ruleId == null) return;
    try {
      const result = await apiService.toggleAlertRule(rule.ruleId);
      setRules((prev) => prev.map((r) => r.ruleId === rule.ruleId ? { ...r, enabled: result.isEnabled } : r));
    } catch {
      toast.error("Failed to toggle alert rule");
    }
  };

  const addEmail = () => {
    const v = emailInput.trim();
    if (!v) return;
    if (!isEmail(v)) { toast.error("Invalid email"); return; }
    if (draft.emails.includes(v)) { setEmailInput(""); return; }
    setDraft({ ...draft, emails: [...draft.emails, v] });
    setEmailInput("");
  };
  const removeEmail = (e: string) => setDraft({ ...draft, emails: draft.emails.filter((x) => x !== e) });

  const save = async () => {
    if (!draft.name.trim()) { toast.error("Alert name is required"); return; }
    if (draft.emails.length === 0) { toast.error("Add at least one notification email"); return; }
    if (!draft.useLimits && (draft.lsl === "" || draft.usl === "")) { toast.error("LSL and USL values are required"); return; }
    const payload = localToPayload(draft);
    setSaving(true);
    try {
      if (editingId != null) {
        await apiService.updateAlertRule(editingId, payload);
        toast.success("Alert rule updated");
      } else {
        const result = await apiService.createAlertRule(payload);
        toast.success("Alert rule created");
        setRules((prev) => [...prev, { ...draft, ruleId: result.ruleId, id: String(result.ruleId) }]);
        setOpen(false);
        setSaving(false);
        return;
      }
      await loadRules();
      setOpen(false);
    } catch {
      toast.error(editingId != null ? "Failed to update alert rule" : "Failed to create alert rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container settings-section">
      <div className="settings-section-head settings-section-head--between">
        <div className="settings-head-row">
          <AlertTriangle /><h3 className="settings-section-title">Alert Configurator</h3>
        </div>
        <Button size="sm" onClick={openCreate}><Plus />Create Alert</Button>
      </div>
      <p className="settings-section-desc">Configure threshold-based alerts on Units, Lines, and Machines. Notifications are sent to the configured email recipients when values cross LSL or USL.</p>
      <Separator />

      <div className="settings-table-wrap">
        <table className="settings-table">
          <thead>
            <tr>
              <th className="text-left">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">Scope</th>
              <th className="text-left">Parameter</th>
              <th className="text-left">LSL / USL</th>
              <th className="text-left">Severity</th>
              <th className="text-left">Recipients</th>
              <th className="text-left">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="settings-table-empty">Loading…</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={9} className="settings-table-empty">No alerts configured. Click "Create Alert" to add one.</td></tr>
            ) : rules.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td className="medium">{r.name}</td>
                <td className="small">{r.unit} › {r.line} › {r.machine}</td>
                <td className="small">{r.parameter}</td>
                <td className="small">
                  {r.useLimits && (r.lsl !== "" || r.usl !== "")
                    ? `${r.lsl !== "" ? r.lsl : "—"} / ${r.usl !== "" ? r.usl : "—"}`
                    : "—"}
                </td>
                <td>
                  <Badge variant="outline" className={`${r.severity === "Critical" ? "settings-badge-peak" : "settings-badge-offpeak"} settings-badge-sm`}>{r.severity}</Badge>
                </td>
                <td className="small muted">{r.emails.length} recipient{r.emails.length === 1 ? "" : "s"}</td>
                <td><Switch checked={r.enabled} onCheckedChange={() => toggleRule(r)} /></td>
                <td>
                  <div className="settings-actions-cell">
                    <Button size="icon" variant="ghost" className="settings-btn-icon" onClick={() => openEdit(r)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" className="settings-btn-icon settings-btn--destructive" onClick={() => removeRule(r)}><Trash2 /></Button>
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
            <DialogTitle>{editingId != null ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
          </DialogHeader>

          <div className="settings-section">
            <div className="settings-field">
              <Label>Alert Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. PMD L1 Mixer Temperature" disabled={editingId != null} />
            </div>

            <div className="settings-grid-3">
              <div className="settings-field">
                <Label>Unit</Label>
                <Dropdown value={draft.unit} onValueChange={(v) => {
                  const firstLine = unitToLineMap[v]?.[0]?.value ?? "";
                  const firstMachine = (
                    unitLineToMachineMap[`${v}:${firstLine}`]?.[0]?.value ??
                    lineToMachineMap[firstLine]?.[0]?.value ?? ""
                  );
                  const firstParam = unitToParamMap[v]?.[0]?.value ?? PARAMETERS[0];
                  setDraft({ ...draft, unit: v, line: firstLine, machine: firstMachine, parameter: firstParam });
                }} options={unitOpts} />
              </div>
              <div className="settings-field">
                <Label>Line</Label>
                <Dropdown value={draft.line} onValueChange={(v) => {
                  const firstMachine = (
                    unitLineToMachineMap[`${draft.unit}:${v}`]?.[0]?.value ??
                    lineToMachineMap[v]?.[0]?.value ?? ""
                  );
                  setDraft({ ...draft, line: v, machine: firstMachine });
                }} options={lineOpts} />
              </div>
              <div className="settings-field">
                <Label>Machine</Label>
                <Dropdown value={draft.machine} onValueChange={(v) => setDraft({ ...draft, machine: v })} options={machineOpts} />
              </div>
            </div>

            <div className="settings-field">
              <Label>Parameter Type</Label>
              <Dropdown value={draft.parameter} onValueChange={(v) => setDraft({ ...draft, parameter: v })} options={paramOpts} />
            </div>

            <div className="settings-label-checkbox-row settings-field">
              <Checkbox id="useLimits" checked={draft.useLimits} onCheckedChange={(v) => setDraft({ ...draft, useLimits: v === true, lsl: "", usl: "" })} />
              <Label htmlFor="useLimits" className="settings-checkbox-label">Use LSL / USL limits</Label>
            </div>

            {!draft.useLimits && (
              <div className="settings-grid-3-cells">
                <div className="settings-field">
                  <Label>LSL</Label>
                  <Input type="number" step="any" placeholder="Lower spec limit" value={draft.lsl} onChange={(e) => setDraft({ ...draft, lsl: e.target.value })} />
                </div>
                <div className="settings-field">
                  <Label>USL</Label>
                  <Input type="number" step="any" placeholder="Upper spec limit" value={draft.usl} onChange={(e) => setDraft({ ...draft, usl: e.target.value })} />
                </div>
              </div>
            )}

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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editingId != null ? "Save Changes" : "Create Alert"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsPage;
