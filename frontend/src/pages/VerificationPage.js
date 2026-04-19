import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllEarnings, updateEarning } from '../services/api';
import { TableSkeleton } from '../components/ui/Skeleton';

export default function VerificationPage() {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadEarnings(); }, [filter, page]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const res = await getAllEarnings({ status: filter, page, limit: 20 });
      setEarnings(res.data.earnings);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load earnings for verification'); }
    finally { setLoading(false); }
  };

  const handleVerify = async (id, status) => {
    try {
      await updateEarning(id, { verification_status: status });
      toast.success(`Earning ${status === 'verified' ? '✅ verified' : '❌ rejected'}`);
      loadEarnings();
    } catch { toast.error('Update failed'); }
  };

  const statusBadge = (s) => {
    const map = { verified: 'badge-success', pending: 'badge-warning', unverifiable: 'badge-danger' };
    const icon = { verified: '✅', pending: '⏳', unverifiable: '❌' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{icon[s]} {s}</span>;
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Earnings Verification</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Review and approve worker earnings for certificate eligibility
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending', 'verified', 'unverifiable'].map(s => (
            <button
              key={s}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => { setFilter(s); setPage(1); }}
            >
              {s === 'pending' ? '⏳' : s === 'verified' ? '✅' : '❌'} {s} {filter === s && `(${total})`}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <TableSkeleton rows={8} /> : earnings.length === 0 ? (
          <div className="empty-state">
            <div className="icon">{filter === 'pending' ? '⏳' : filter === 'verified' ? '✅' : '❌'}</div>
            <h3>No {filter} earnings</h3>
            <p>All {filter} earnings have been processed</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker ID</th><th>Date</th><th>Platform</th><th>City</th>
                  <th>Gross</th><th>Net</th><th>Hours</th><th>Anomaly</th>
                  <th>Screenshot</th><th>Status</th>
                  {filter === 'pending' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {earnings.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.worker_id?.slice(-8)}</td>
                    <td>{e.date}</td>
                    <td>{e.platform}</td>
                    <td>{e.city}</td>
                    <td>PKR {e.gross_amount?.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>PKR {e.net_amount?.toLocaleString()}</td>
                    <td>{e.hours_worked}h</td>
                    <td>
                      {e.anomaly?.is_anomaly ? (
                        <span className="badge badge-danger" title={e.anomaly?.explanation}>⚠️</span>
                      ) : (
                        <span className="badge badge-success">✓</span>
                      )}
                    </td>
                    <td>
                      {e.screenshot_url ? (
                        <a href={`http://localhost:8001${e.screenshot_url}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🖼 View</a>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                    <td>{statusBadge(e.verification_status)}</td>
                    {filter === 'pending' && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleVerify(e.id, 'verified')}>✅ Verify</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleVerify(e.id, 'unverifiable')}>❌ Reject</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
        <div className="card" style={{ flex: 1, padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Showing</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{total}</div>
        </div>
        <div className="card" style={{ flex: 2, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Verification Guidelines</div>
          <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
            <li>Check screenshot for platform authenticity</li>
            <li>Verify amounts match screenshot data</li>
            <li>Flag anomalies for additional review</li>
            <li>Only verify earnings with valid screenshots when possible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
