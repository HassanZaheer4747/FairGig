import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getGrievances, createGrievance, upvoteGrievance, getTrendingGrievances, updateGrievanceStatus } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui/Skeleton';

const CATEGORIES = ['wage_theft', 'unfair_deduction', 'account_suspension', 'discrimination', 'safety', 'other'];
const PLATFORMS = ['Uber', 'Foodpanda', 'Fiverr', 'Careem', 'Bykea', 'Other'];
const CITIES = ['Lahore', 'Karachi', 'Islamabad'];

const severityColor = { low: 'badge-gray', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' };
const statusColor = { open: 'badge-info', escalated: 'badge-warning', resolved: 'badge-success', closed: 'badge-gray' };

export default function GrievancesPage() {
  const [complaints, setComplaints] = useState([]);
  const [trending, setTrending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', platform: 'Uber', city: 'Lahore', category: 'other' });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ status: '', platform: '', cluster: '' });
  const { user } = useAuthStore();
  const isAdvocate = user?.role === 'advocate' || user?.role === 'verifier';

  useEffect(() => {
    loadAll();
  }, [filter]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filter).filter(([,v]) => v));
      const [cRes, tRes] = await Promise.all([
        getGrievances(params),
        getTrendingGrievances()
      ]);
      setComplaints(cRes.data.complaints);
      setTrending(tRes.data);
    } catch { toast.error('Failed to load grievances'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createGrievance({ ...form, worker_name: user?.name });
      toast.success('Complaint submitted successfully');
      setShowModal(false);
      setForm({ title: '', description: '', platform: 'Uber', city: 'Lahore', category: 'other' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally { setSubmitting(false); }
  };

  const handleUpvote = async (id) => {
    try {
      await upvoteGrievance(id);
      loadAll();
    } catch { toast.error('Failed to upvote'); }
  };

  const handleStatus = async (id, status) => {
    try {
      await updateGrievanceStatus(id, { status });
      toast.success(`Status updated to ${status}`);
      loadAll();
    } catch { toast.error('Status update failed'); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      {/* Main feed */}
      <div>
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Grievance Board</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Report and track workplace issues</p>
          </div>
          {user?.role === 'worker' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ File Complaint</button>
          )}
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { name: 'status', options: ['', 'open', 'escalated', 'resolved'] },
              { name: 'platform', options: ['', ...PLATFORMS] },
              { name: 'cluster', options: ['', 'Wage Issues', 'Unfair Deductions', 'Account & Suspension', 'Algorithm Fairness', 'Safety Concerns', 'App & Technical'] },
            ].map(f => (
              <select key={f.name} className="form-input" style={{ flex: 1, minWidth: 120, padding: '7px 12px', fontSize: 12 }}
                value={filter[f.name]} onChange={e => setFilter(p => ({ ...p, [f.name]: e.target.value }))}>
                {f.options.map(o => <option key={o} value={o}>{o || `All ${f.name}s`}</option>)}
              </select>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: '', platform: '', cluster: '' })}>Clear</button>
          </div>
        </div>

        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="complaint-card">
              <Skeleton height={16} width="60%" style={{ marginBottom: 10 }} />
              <Skeleton height={12} width="100%" style={{ marginBottom: 6 }} />
              <Skeleton height={12} width="80%" />
            </div>
          ))
        ) : complaints.length === 0 ? (
          <div className="empty-state"><div className="icon">📝</div><h3>No complaints found</h3><p>Adjust filters or file a new complaint</p></div>
        ) : (
          complaints.map(c => (
            <div key={c._id} className="complaint-card">
              <div className="meta">
                <span className={`badge ${statusColor[c.status] || 'badge-gray'}`}>{c.status}</span>
                <span className={`badge ${severityColor[c.severity] || 'badge-gray'}`}>{c.severity}</span>
                <span className="badge badge-gray">{c.platform}</span>
                <span className="badge badge-gray">{c.city}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3>{c.title}</h3>
              <p style={{ marginTop: 6 }}>{c.description.slice(0, 200)}{c.description.length > 200 ? '...' : ''}</p>

              {c.tags?.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}

              {c.cluster && (
                <div style={{ marginTop: 8 }}>
                  <span className="badge badge-info">🏷 {c.cluster}</span>
                </div>
              )}

              <div className="footer">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleUpvote(c._id)}>
                    👍 {c.upvotes}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {c.worker_name || 'Anonymous'}</span>
                </div>
                {isAdvocate && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.status === 'open' && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }} onClick={() => handleStatus(c._id, 'escalated')}>Escalate</button>
                    )}
                    {c.status !== 'resolved' && (
                      <button className="btn btn-success btn-sm" onClick={() => handleStatus(c._id, 'resolved')}>Resolve</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trending Sidebar */}
      <div>
        {trending && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">🔥 Trending Issues</div></div>
              {trending.trending_clusters?.slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.cluster}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.platforms?.join(', ')}</div>
                  </div>
                  <span className="badge badge-danger">{c.count}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">🏷 Trending Tags</div></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trending.trending_tags?.slice(0, 12).map((t, i) => (
                  <span key={i} className="tag" style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setFilter(f => ({ ...f, cluster: '' }))}>
                    {t.tag} <span style={{ color: 'var(--accent)' }}>({t.count})</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">📊 Platform Rankings</div></div>
              {trending.platform_rankings?.map((p, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{p.platform}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.total_complaints} complaints</span>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      background: p.resolution_rate > 50 ? 'var(--success)' : 'var(--danger)',
                      height: '100%',
                      width: `${p.resolution_rate}%`,
                      borderRadius: 4,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    {p.resolution_rate}% resolved · {p.critical_count} critical
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* File Complaint Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">File a Complaint</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief title for your complaint" required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Platform *</label>
                  <select className="form-input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <select className="form-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={5} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue in detail..." required />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : '📢 Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
