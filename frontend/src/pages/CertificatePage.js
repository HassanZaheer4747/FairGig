import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getCertificatePreview, getCertificateUrl } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui/Skeleton';

export default function CertificatePage() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      const res = await getCertificatePreview(user._id);
      setPreview(res.data);
    } catch {
      setPreview({ eligible: false, message: 'Unable to check certificate eligibility' });
    } finally {
      setLoading(false);
    }
  };

  const openCertificate = () => {
    const url = getCertificateUrl(user._id, user.name);
    const win = window.open('about:blank', '_blank');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.text())
      .then(html => {
        win.document.write(html);
        win.document.close();
      })
      .catch(() => {
        win.close();
        toast.error('Certificate generation failed. Ensure certificate service is running.');
      });
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Income Certificate</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Generate a verified income certificate based on your approved earnings
        </p>
      </div>

      {loading ? (
        <div className="card">
          <Skeleton height={20} width="50%" style={{ marginBottom: 16 }} />
          <Skeleton height={14} width="80%" style={{ marginBottom: 10 }} />
          <Skeleton height={14} width="60%" />
        </div>
      ) : (
        <>
          {/* Eligibility Card */}
          <div className={`card`} style={{
            marginBottom: 20,
            border: preview?.eligible ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
            background: preview?.eligible ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 48 }}>{preview?.eligible ? '✅' : '❌'}</div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  {preview?.eligible ? 'Certificate Ready' : 'Not Eligible Yet'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {preview?.eligible
                    ? `You have ${preview.entry_count} verified earning(s). Your certificate is ready to generate.`
                    : preview?.message || 'You need at least 1 verified earning entry to generate a certificate.'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary if eligible */}
          {preview?.eligible && preview?.summary && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><div className="card-title">Certificate Preview</div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Total Net Earnings', value: `PKR ${(preview.summary.total_net || 0).toLocaleString()}`, color: '#10b981' },
                  { label: 'Total Hours', value: `${Math.round(preview.summary.total_hours || 0)}h`, color: '#6366f1' },
                  { label: 'Avg Hourly Rate', value: `PKR ${Math.round(preview.summary.avg_hourly_rate || 0)}/h`, color: '#f59e0b' },
                  { label: 'Verified Entries', value: preview.summary.entry_count, color: '#6366f1' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Generate Certificate</div>
                <div className="card-subtitle">Opens as a printable A4 HTML document</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className={`btn ${preview?.eligible ? 'btn-primary' : 'btn-ghost'}`}
                onClick={preview?.eligible ? openCertificate : undefined}
                disabled={!preview?.eligible}
                style={{ padding: '12px 24px', fontSize: 15 }}
              >
                📄 Generate Certificate
              </button>
              {preview?.eligible && (
                <button className="btn btn-ghost" onClick={() => window.print()}>
                  🖨 Print
                </button>
              )}
            </div>

            {!preview?.eligible && (
              <div className="alert alert-warning" style={{ marginTop: 16 }}>
                <span>⚠️</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Action Required</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    A verifier must approve your earnings before you can generate a certificate.
                    Go to Earnings and ensure at least one entry is marked as "verified".
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="card" style={{ marginTop: 16, padding: '16px 20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>ℹ️ About This Certificate</div>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Contains only verified earnings approved by a verifier</li>
              <li>Includes A4-formatted summary with platform and city breakdown</li>
              <li>Valid for 90 days from the date of generation</li>
              <li>Can be used for loan applications, rental agreements, or government verification</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
