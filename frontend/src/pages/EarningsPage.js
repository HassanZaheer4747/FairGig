import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { getEarnings, createEarning, updateEarning, deleteEarning, importCSV, uploadScreenshot } from '../services/api';
import { TableSkeleton } from '../components/ui/Skeleton';

const PLATFORMS = ['Uber', 'Foodpanda', 'Fiverr', 'Careem', 'Bykea', 'Other'];
const CITIES = ['Lahore', 'Karachi', 'Islamabad'];

const emptyForm = { date: '', platform: 'Uber', city: 'Lahore', gross_amount: '', deductions: '', hours_worked: '', trips_or_orders: '', notes: '', screenshot_url: '' };

export default function EarningsPage() {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ platform: '', city: '', status: '' });
  const csvRef = useRef();
  const imgRef = useRef();

  useEffect(() => { loadEarnings(); }, [page, filters]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await getEarnings(params);
      setEarnings(res.data.earnings);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load earnings'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        gross_amount: parseFloat(form.gross_amount),
        deductions: parseFloat(form.deductions) || 0,
        hours_worked: parseFloat(form.hours_worked),
        trips_or_orders: form.trips_or_orders ? parseInt(form.trips_or_orders) : null,
      };
      const res = await createEarning(payload);
      toast.success(res.data.anomaly_detected ? '⚠️ Earning saved — anomaly detected!' : '✅ Earning logged successfully');
      setShowModal(false);
      setForm(emptyForm);
      loadEarnings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save earning');
    } finally { setSubmitting(false); }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await importCSV(file);
      toast.success(`Imported ${res.data.imported} records`);
      loadEarnings();
    } catch { toast.error('CSV import failed'); }
  };

  const handleScreenshot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadScreenshot(file);
      setForm(f => ({ ...f, screenshot_url: res.data.url }));
      toast.success('Screenshot uploaded');
    } catch { toast.error('Screenshot upload failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this earning?')) return;
    try {
      await deleteEarning(id);
      toast.success('Deleted');
      loadEarnings();
    } catch { toast.error('Delete failed'); }
  };

  const handleVerifyStatus = async (id, status) => {
    try {
      await updateEarning(id, { verification_status: status });
      toast.success(`Status updated to ${status}`);
      loadEarnings();
    } catch { toast.error('Update failed'); }
  };

  const statusBadge = (status) => {
    const map = { verified: 'badge-success', pending: 'badge-warning', unverifiable: 'badge-danger' };
    const icon = { verified: '✅', pending: '⏳', unverifiable: '❌' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{icon[status]} {status}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Earnings Logger</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Track and manage your gig income</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => csvRef.current.click()}>📥 Import CSV</button>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Earning</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { name: 'platform', label: 'Platform', options: ['', ...PLATFORMS] },
            { name: 'city', label: 'City', options: ['', ...CITIES] },
            { name: 'status', label: 'Status', options: ['', 'pending', 'verified', 'unverifiable'] },
          ].map(f => (
            <div key={f.name} style={{ flex: '1', minWidth: 140 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <select className="form-input" style={{ padding: '7px 12px' }} value={filters[f.name]}
                onChange={e => { setFilters(p => ({ ...p, [f.name]: e.target.value })); setPage(1); }}>
                {f.options.map(o => <option key={o} value={o}>{o || `All ${f.label}s`}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ platform: '', city: '', status: '' }); setPage(1); }}>Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <TableSkeleton rows={8} /> : earnings.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💸</div>
            <h3>No earnings yet</h3>
            <p>Start logging your gig earnings to see insights</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Platform</th><th>City</th>
                  <th>Gross</th><th>Deductions</th><th>Net</th>
                  <th>Hours</th><th>Hourly</th><th>Status</th><th>Anomaly</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.date}</td>
                    <td>{e.platform}</td>
                    <td>{e.city}</td>
                    <td style={{ color: 'var(--text-primary)' }}>PKR {e.gross_amount?.toLocaleString()}</td>
                    <td style={{ color: 'var(--danger)' }}>-PKR {e.deductions?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>PKR {e.net_amount?.toLocaleString()}</td>
                    <td>{e.hours_worked}h</td>
                    <td>PKR {Math.round(e.hourly_rate)}/h</td>
                    <td>{statusBadge(e.verification_status)}</td>
                    <td>
                      {e.anomaly?.is_anomaly ? (
                        <span className="badge badge-danger" title={e.anomaly?.explanation}>⚠️ {e.anomaly?.type?.replace(/_/g,' ')}</span>
                      ) : (
                        <span className="badge badge-success">✓ Normal</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>Page {page} of {pagination.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* CSV Template hint */}
      <div className="card" style={{ marginTop: 16, padding: '14px 20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          📋 <strong>CSV Format:</strong> date, platform, city, gross_amount, deductions, hours_worked, trips_or_orders, notes
        </div>
      </div>

      {/* Add Earning Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Log New Earning</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" name="date" value={form.date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Platform *</label>
                  <select className="form-input" name="platform" value={form.platform} onChange={handleChange}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <select className="form-input" name="city" value={form.city} onChange={handleChange}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hours Worked *</label>
                  <input className="form-input" type="number" step="0.5" name="hours_worked" value={form.hours_worked} onChange={handleChange} placeholder="8" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Gross Amount (PKR) *</label>
                  <input className="form-input" type="number" name="gross_amount" value={form.gross_amount} onChange={handleChange} placeholder="25000" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Deductions (PKR)</label>
                  <input className="form-input" type="number" name="deductions" value={form.deductions} onChange={handleChange} placeholder="5000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Trips/Orders</label>
                  <input className="form-input" type="number" name="trips_or_orders" value={form.trips_or_orders} onChange={handleChange} placeholder="12" />
                </div>
                <div className="form-group">
                  <label className="form-label">Screenshot</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => imgRef.current.click()} style={{ width: '100%', justifyContent: 'center' }}>
                    {form.screenshot_url ? '✅ Uploaded' : '📸 Upload'}
                  </button>
                  <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScreenshot} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" name="notes" value={form.notes} onChange={handleChange} placeholder="Any notes about this earning..." rows={2} />
              </div>
              {form.gross_amount && form.deductions && (
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  Estimated Net: <strong>PKR {(parseFloat(form.gross_amount) - parseFloat(form.deductions || 0)).toLocaleString()}</strong>
                  {form.hours_worked && ` · Hourly: PKR ${Math.round((parseFloat(form.gross_amount) - parseFloat(form.deductions || 0)) / parseFloat(form.hours_worked))}/h`}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : '💾 Save Earning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
