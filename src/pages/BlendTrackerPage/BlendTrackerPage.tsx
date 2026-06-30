import './BlendTrackerPage.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, X, ChevronLeft, ChevronRight, RefreshCw, CalendarIcon, Clock, Plus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Dropdown from '@/components/Dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { apiService, type BlendRunLog, type BlendRunPayload } from '@/services/api';
import { useAppSelector } from '@/redux/hooks/reduxHooks';
import { selectDropdownData } from '@/redux/slices/dropdownSlice';
import { format } from 'date-fns';

interface BlendOption {
  blendId: number;
  blendName: string;
}

type ModalMode = 'add' | 'edit' | null;

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const fmtTime = (t: string | null) => {
  if (!t) return '—';
  try { return format(new Date(t.replace(' ', 'T')), 'MMM d, yyyy, HH:mm'); } catch { return t; }
};

// Convert Date + HH:MM string → Unix epoch ms (null if date missing)
const toEpochMs = (date: Date | undefined, time: string): number | null => {
  if (!date) return null;
  const [h = '00', m = '00'] = time.split(':');
  const d = new Date(date);
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return d.getTime();
};

// Parse "YYYY-MM-DD HH:MM" or ISO string into { date, time } for form pre-fill
const parseApiDateTime = (dt: string | null): { date: Date | undefined; time: string } => {
  if (!dt) return { date: undefined, time: '' };
  try {
    const d = new Date(dt.replace(' ', 'T'));
    return { date: d, time: format(d, 'HH:mm') };
  } catch { return { date: undefined, time: '' }; }
};

const BlendTrackerPage = () => {
  const dropdownData = useAppSelector(selectDropdownData);

  const [logs, setLogs] = useState<BlendRunLog[]>([]);
  const [blends, setBlends] = useState<BlendOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingLog, setEditingLog] = useState<BlendRunLog | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields (shared by add + edit)
  const [overrideStatus, setOverrideStatus] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedBlend, setSelectedBlend] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const machineIdMap = useMemo(
    () => (dropdownData?.common?.machineIdMap ?? {}) as Record<string, number>,
    [dropdownData]
  );

  const machineOpts = useMemo(() => {
    const all = (dropdownData?.common?.machines ?? []) as { value: string; label: string }[];
    return all.filter(m => m.value !== 'Machine All');
  }, [dropdownData]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.fetchBlendRunLogs();
      setLogs(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status !== 404 && status !== 405) toast.error('Failed to load blend run logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    apiService.fetchBlends()
      .then(data => setBlends(data.map(b => ({ blendId: b.blendId, blendName: b.blendName }))))
      .catch(() => toast.error('Failed to load blends'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter + pagination ──────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    if (!filterText) return logs;
    const q = filterText.toLowerCase();
    return logs.filter(l =>
      l.blendName.toLowerCase().includes(q) ||
      l.machineName.toLowerCase().includes(q) ||
      l.source.toLowerCase().includes(q)
    );
  }, [logs, filterText]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const pagedLogs  = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  // ── Modal helpers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setOverrideStatus(true);
    setSelectedMachine('');
    setSelectedBlend('');
    setStartDate(undefined);
    setStartTime('');
    setEndDate(undefined);
    setEndTime('');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingLog(null);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setModalMode('add');
  };

  const openEdit = (log: BlendRunLog) => {
    setEditingLog(log);
    setOverrideStatus(log.source === 'Manual');
    setSelectedMachine(log.machineName);
    setSelectedBlend(log.blendId !== null ? String(log.blendId) : '');
    const s = parseApiDateTime(log.startTime);
    setStartDate(s.date);
    setStartTime(s.time);
    const e = parseApiDateTime(log.endTime);
    setEndDate(e.date);
    setEndTime(e.time);
    setModalMode('edit');
  };

  // ── Build payload ────────────────────────────────────────────────────────────

  const buildPayload = (): BlendRunPayload | null => {
    if (!selectedMachine || !startDate) {
      toast.error('Machine and Start Date are required');
      return null;
    }
    const machineId = machineIdMap[selectedMachine];
    if (!machineId) {
      toast.error('Could not resolve machine ID');
      return null;
    }
    const startMs = toEpochMs(startDate, startTime);
    if (!startMs) {
      toast.error('Invalid start date/time');
      return null;
    }
    const endMs = endDate ? toEpochMs(endDate, endTime) : null;

    const blend = selectedBlend ? blends.find(b => String(b.blendId) === selectedBlend) : null;

    return {
      machineId,
      blendId:       blend?.blendId ?? null,
      blendName:     blend?.blendName ?? 'Unknown',
      startTimeMs:   startMs,
      endTimeMs:     endMs,
      overrideStatus,
    };
  };

  // ── Add ──────────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await apiService.addBlendRunLog(payload);
      toast.success('Blend run added successfully');
      closeModal();
      await loadLogs();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? 'Failed to add blend run';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!editingLog) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await apiService.updateBlendRunLog(editingLog.id, payload);
      toast.success('Blend run updated successfully');
      closeModal();
      await loadLogs();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? 'Failed to update blend run';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="blt-page">
        <h2 className="page-title">Blend Tracker</h2>

        {/* Top bar */}
        <div className="blt-topbar">
          <Input
            placeholder="Filter by machine, blend or source…"
            value={filterText}
            onChange={e => { setFilterText(e.target.value); setPage(1); }}
            className="blt-filter-input"
          />
          <div className="blt-topbar-right">
            <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading} className="blt-refresh-btn">
              <RefreshCw className={loading ? 'blt-spin' : ''} style={{ width: '0.875rem', height: '0.875rem' }} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button className="blt-configure-btn" onClick={openAdd}>
              <Plus style={{ width: '0.875rem', height: '0.875rem' }} />
              Add Run
            </Button>
          </div>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chart-container blt-table-container">
          <div className="blt-table-wrap">
            <table className="blt-table">
              <thead>
                <tr>
                  <th>Sl. No.</th>
                  <th>Machine</th>
                  <th>Blend Name</th>
                  <th className="blt-td-time">Start Time</th>
                  <th className="blt-td-time">End Time</th>
                  <th>Source</th>
                  <th>Run Time</th>
                  <th>Status</th>
                  <th className="blt-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="blt-empty">
                      {loading ? 'Loading…' : 'No blend run logs found'}
                    </td>
                  </tr>
                ) : (
                  pagedLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.slNo}</td>
                      <td className="blt-td-machine">{log.machineName}</td>
                      <td className="blt-td-blend">{log.blendName}</td>
                      <td className="blt-td-time">{fmtTime(log.startTime)}</td>
                      <td className="blt-td-time">{fmtTime(log.endTime)}</td>
                      <td>
                        <span className={`blt-badge blt-badge--${log.source.toLowerCase()}`}>
                          {log.source}
                        </span>
                      </td>
                      <td className="blt-td-runtime">{log.runTime}</td>
                      <td>
                        <span className={`blt-badge blt-badge--${log.isRunning ? 'running' : 'closed'}`}>
                          {log.isRunning ? 'Running' : 'Closed'}
                        </span>
                      </td>
                      <td className="blt-td-actions">
                        {log.canEdit && (
                          <button
                            type="button"
                            className="blt-action-btn blt-action-edit"
                            title="Edit"
                            onClick={() => openEdit(log)}
                          >
                            <Pencil style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="blt-pager">
            <div className="blt-pager-size">
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="blt-page-select"
                title="Rows per page"
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="blt-pager-info">{filteredLogs.length} rows</span>
            <div className="blt-pager-nav">
              <Button variant="ghost" size="icon" className="blt-pager-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
              </Button>
              <span className="blt-pager-page">{page} / {totalPages}</span>
              <Button variant="ghost" size="icon" className="blt-pager-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Add / Edit Modal */}
        <AnimatePresence>
          {modalMode !== null && (
            <div className="blt-overlay" onClick={closeModal}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="blt-modal"
                onClick={e => e.stopPropagation()}
              >
                <button type="button" className="blt-modal-close" title="Close" aria-label="Close" onClick={closeModal}>
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>

                <h2 className="blt-modal-title">
                  {modalMode === 'edit' ? 'Edit Blend Run' : 'Add Blend Run'}
                </h2>

                {/* Override Status */}
                <label className="blt-modal-check">
                  <input
                    type="checkbox"
                    checked={overrideStatus}
                    onChange={e => setOverrideStatus(e.target.checked)}
                    className="blt-checkbox"
                  />
                  Override Status (Manual)
                </label>

                {/* Machine */}
                <div className="blt-modal-field">
                  <label className="blt-field-label">Machine <span className="blt-required">*</span></label>
                  <Dropdown
                    value={selectedMachine || undefined}
                    onValueChange={setSelectedMachine}
                    placeholder="Select Machine"
                    options={machineOpts}
                  />
                </div>

                {/* Blend Name */}
                <div className="blt-modal-field">
                  <label className="blt-field-label">Blend Name</label>
                  <Dropdown
                    value={selectedBlend || undefined}
                    onValueChange={setSelectedBlend}
                    placeholder="Select Blend"
                    options={blends.map(b => ({ value: String(b.blendId), label: b.blendName }))}
                  />
                </div>

                {/* Start Date + Time */}
                <div className="blt-modal-field">
                  <label className="blt-field-label">Start Date / Time <span className="blt-required">*</span></label>
                  <div className="blt-datetime-row">
                    <Popover open={startOpen} onOpenChange={setStartOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="blt-date-btn">
                          <CalendarIcon style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem', flexShrink: 0 }} />
                          {startDate ? format(startDate, 'dd MMM yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="popover-content--calendar" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={d => { setStartDate(d); setStartOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="blt-time-field">
                      <Clock style={{ width: '0.875rem', height: '0.875rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                      <Input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="blt-time-input"
                        aria-label="Start time"
                      />
                    </div>
                  </div>
                </div>

                {/* End Date + Time */}
                <div className="blt-modal-field">
                  <label className="blt-field-label">End Date / Time <span className="blt-modal-optional">(leave empty = still running)</span></label>
                  <div className="blt-datetime-row">
                    <Popover open={endOpen} onOpenChange={setEndOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="blt-date-btn">
                          <CalendarIcon style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem', flexShrink: 0 }} />
                          {endDate ? format(endDate, 'dd MMM yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="popover-content--calendar" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={d => { setEndDate(d); setEndOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="blt-time-field">
                      <Clock style={{ width: '0.875rem', height: '0.875rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="blt-time-input"
                        aria-label="End time"
                      />
                    </div>
                    {endDate && (
                      <button
                        type="button"
                        className="blt-clear-end"
                        title="Clear end date"
                        onClick={() => { setEndDate(undefined); setEndTime(''); }}
                      >
                        <X style={{ width: '0.875rem', height: '0.875rem' }} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="blt-modal-footer">
                  <Button variant="outline" onClick={closeModal} disabled={saving} className="blt-cancel-btn">
                    Cancel
                  </Button>
                  <Button
                    onClick={modalMode === 'edit' ? handleUpdate : handleAdd}
                    disabled={saving}
                    className="blt-add-btn"
                  >
                    {saving ? (modalMode === 'edit' ? 'Saving…' : 'Adding…') : (modalMode === 'edit' ? 'Save Changes' : 'Add Run')}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default BlendTrackerPage;
