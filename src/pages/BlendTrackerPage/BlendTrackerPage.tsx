import './BlendTrackerPage.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Pencil, X, ChevronLeft, ChevronRight, RefreshCw, CalendarIcon, Clock } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Dropdown from '@/components/Dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { apiService, BlendRunLog } from '@/services/api';
import { useAppSelector } from '@/redux/hooks/reduxHooks';
import { selectDropdownData } from '@/redux/slices/dropdownSlice';
import { format } from 'date-fns';

interface BlendOption {
  blendId: number;
  blendName: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const fmtTime = (t: string | null) => {
  if (!t) return '';
  try { return format(new Date(t), 'MMM d, yyyy, HH:mm'); } catch { return t; }
};

const toISOWithTime = (date: Date | undefined, time: string): string => {
  if (!date) return '';
  const [h = '00', m = '00'] = time.split(':');
  const d = new Date(date);
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d.toISOString();
};

const BlendTrackerPage = () => {
  const dropdownData = useAppSelector(selectDropdownData);

  const [logs, setLogs] = useState<BlendRunLog[]>([]);
  const [blends, setBlends] = useState<BlendOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);

  // Modal form state
  const [overrideStatus, setOverrideStatus] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedBlend, setSelectedBlend] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const machineIdMap = useMemo(() => {
    return (dropdownData?.common?.machineIdMap ?? {}) as Record<string, number>;
  }, [dropdownData]);

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
      if (status !== 404 && status !== 405) {
        toast.error('Failed to load blend run logs');
      }
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

  const filteredLogs = useMemo(() => {
    if (!filterText) return logs;
    const q = filterText.toLowerCase();
    return logs.filter(l =>
      l.blendName.toLowerCase().includes(q) ||
      l.machine.toLowerCase().includes(q)
    );
  }, [logs, filterText]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const pagedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  const resetModal = () => {
    setOverrideStatus(false);
    setSelectedMachine('');
    setSelectedBlend('');
    setStartDate(undefined);
    setStartTime('');
    setEndDate(undefined);
    setEndTime('');
  };

  const handleAdd = async () => {
    if (!selectedMachine || !selectedBlend || !startDate) {
      toast.error('Please fill all required fields');
      return;
    }
    const blend = blends.find(b => String(b.blendId) === selectedBlend);
    if (!blend) return;

    const machineId = machineIdMap[selectedMachine];
    if (!machineId) {
      toast.error('Could not resolve machine ID. Please try again.');
      return;
    }

    setAdding(true);
    try {
      await apiService.addBlendRunLog({
        machineId,
        blendId: blend.blendId,
        blendName: blend.blendName,
        startDate: toISOWithTime(startDate, startTime),
        endDate: endDate ? toISOWithTime(endDate, endTime) : undefined,
        overrideStatus,
      });
      toast.success('Blend run added successfully');
      setShowModal(false);
      resetModal();
      await loadLogs();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add blend run';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="blt-page">
        <h2 className="page-title">Blend Tracker</h2>

        {/* Top bar */}
        <div className="blt-topbar">
          <Input
            placeholder="Filter list"
            value={filterText}
            onChange={e => { setFilterText(e.target.value); setPage(1); }}
            className="blt-filter-input"
          />
          <div className="blt-topbar-right">
            <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading} className="blt-refresh-btn">
              <RefreshCw className={loading ? 'blt-spin' : ''} style={{ width: '0.875rem', height: '0.875rem' }} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button className="blt-configure-btn" onClick={() => setShowModal(true)}>
              Configure
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
                  <th>Blend Name</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Machine</th>
                  <th className="blt-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="blt-empty">
                      {loading ? 'Loading…' : 'No blend run logs found'}
                    </td>
                  </tr>
                ) : (
                  pagedLogs.map((log, i) => (
                    <tr key={log.id}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td className="blt-td-blend">{log.blendName}</td>
                      <td className="blt-td-time">{fmtTime(log.startTime)}</td>
                      <td className="blt-td-time">{fmtTime(log.endTime)}</td>
                      <td>{log.machine}</td>
                      <td className="blt-td-actions">
                        <button type="button" className="blt-action-btn blt-action-view" title="View">
                          <Eye style={{ width: '1rem', height: '1rem' }} />
                        </button>
                        <button type="button" className="blt-action-btn blt-action-edit" title="Edit">
                          <Pencil style={{ width: '1rem', height: '1rem' }} />
                        </button>
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
                {PAGE_SIZE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="blt-pager-nav">
              <Button variant="ghost" size="icon" className="blt-pager-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
              </Button>
              <Button variant="ghost" size="icon" className="blt-pager-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Configure Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="blt-overlay" onClick={() => { setShowModal(false); resetModal(); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="blt-modal"
                onClick={e => e.stopPropagation()}
              >
                <button type="button" className="blt-modal-close" title="Close" aria-label="Close" onClick={() => { setShowModal(false); resetModal(); }}>
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>

                <h2 className="blt-modal-title">Blend Timestamp Configuration</h2>

                {/* Override Status */}
                <label className="blt-modal-check">
                  <input
                    type="checkbox"
                    checked={overrideStatus}
                    onChange={e => setOverrideStatus(e.target.checked)}
                    className="blt-checkbox"
                  />
                  Override Status
                </label>

                {/* Select Machine */}
                <div className="blt-modal-field">
                  <Dropdown
                    value={selectedMachine || undefined}
                    onValueChange={setSelectedMachine}
                    placeholder="Select Machine *"
                    options={machineOpts}
                  />
                </div>

                {/* Select Blend Name */}
                <div className="blt-modal-field">
                  <Dropdown
                    value={selectedBlend || undefined}
                    onValueChange={setSelectedBlend}
                    placeholder="Select Blend Name *"
                    options={blends.map(b => ({ value: String(b.blendId), label: b.blendName }))}
                  />
                </div>

                {/* Start Date + Time */}
                <div className="blt-modal-field">
                  <label className="blt-field-label">Start Date <span className="blt-required">*</span></label>
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
                  <label className="blt-field-label">End Date</label>
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
                  </div>
                </div>

                <div className="blt-modal-footer">
                  <Button onClick={handleAdd} disabled={adding} className="blt-add-btn">
                    {adding ? 'Adding…' : 'ADD'}
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
