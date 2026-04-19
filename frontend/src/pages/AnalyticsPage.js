import React, { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import toast from 'react-hot-toast';
import { getPlatformTrends, getCityOverview, getVulnerabilityFlags, getGlobalSummary, getIncomeDistribution } from '../services/api';
import { CardSkeleton } from '../components/ui/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
  }
};

export default function AnalyticsPage() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [trends, cities, flags, summary, dist] = await Promise.all([
        getPlatformTrends(),
        getCityOverview(),
        getVulnerabilityFlags(),
        getGlobalSummary(),
        getIncomeDistribution(),
      ]);
      setData({
        trends: trends.data.trends || [],
        cities: cities.data.cities || [],
        flags: flags.data.flagged_workers || [],
        summary: summary.data,
        dist: dist.data.distribution || [],
      });
    } catch (err) {
      toast.error('Analytics load failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="grid-2">{[1,2,3,4].map(i => <CardSkeleton key={i} />)}</div>;

  const { trends = [], cities = [], flags = [], summary = {}, dist = [] } = data;

  const platformChart = {
    labels: trends.map(t => t.platform),
    datasets: [
      { label: 'Avg Net (PKR)', data: trends.map(t => t.avg_net), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
      { label: 'Avg Deductions (PKR)', data: trends.map(t => t.avg_deductions), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 6 },
    ]
  };

  const cityChart = {
    labels: cities.map(c => c.city),
    datasets: [
      { label: 'Avg Net (PKR)', data: cities.map(c => c.avg_net), backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)'], borderRadius: 6 }
    ]
  };

  const distChart = {
    labels: dist.map(d => d.range),
    datasets: [{
      label: 'Workers',
      data: dist.map(d => d.count),
      backgroundColor: 'rgba(99,102,241,0.6)',
      borderRadius: 6,
    }]
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Advocate Analytics</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Platform insights, city data, and vulnerability detection</p>
      </div>

      {/* Global Summary */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Workers', value: summary.total_workers, color: '#6366f1', icon: '👷' },
          { label: 'Total Entries', value: summary.total_entries?.toLocaleString(), color: '#10b981', icon: '📊' },
          { label: 'Total Net Paid', value: `PKR ${(summary.total_net_paid || 0).toLocaleString()}`, color: '#f59e0b', icon: '💰' },
          { label: 'Anomaly Rate', value: `${summary.anomaly_rate || 0}%`, color: summary.anomaly_rate > 30 ? '#ef4444' : '#10b981', icon: '⚠️' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="icon-wrap" style={{ background: `${k.color}20` }}>{k.icon}</div>
            <div className="label">{k.label}</div>
            <div className="value" style={{ color: k.color, fontSize: 22 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Platform Rankings</div><div className="card-subtitle">Avg net earnings & deductions by platform</div></div>
          <div style={{ height: 220 }}>
            {trends.length > 0 ? <Bar data={platformChart} options={chartOpts} /> : <div className="empty-state"><p>No platform data</p></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">City Income Overview</div><div className="card-subtitle">Average net earnings by city</div></div>
          <div style={{ height: 220 }}>
            {cities.length > 0 ? <Bar data={cityChart} options={chartOpts} /> : <div className="empty-state"><p>No city data</p></div>}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Income Distribution</div><div className="card-subtitle">Worker count by income bracket</div></div>
          <div style={{ height: 220 }}>
            {dist.length > 0 ? <Bar data={distChart} options={chartOpts} /> : <div className="empty-state"><p>No distribution data</p></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Platform Details</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Platform</th><th>Workers</th><th>Avg Net</th><th>Deduction %</th>
                </tr>
              </thead>
              <tbody>
                {trends.map(t => (
                  <tr key={t.platform}>
                    <td style={{ fontWeight: 600 }}>{t.platform}</td>
                    <td>{t.worker_count}</td>
                    <td style={{ color: 'var(--success)' }}>PKR {(t.avg_net || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${t.avg_deduction_ratio > 25 ? 'badge-danger' : 'badge-success'}`}>
                        {t.avg_deduction_ratio}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vulnerability Flags */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🚨 Vulnerability Flags</div>
            <div className="card-subtitle">{flags.length} workers flagged for review</div>
          </div>
          <span className={`badge ${flags.length > 10 ? 'badge-danger' : 'badge-warning'}`}>{flags.length} Flagged</span>
        </div>
        {flags.length === 0 ? (
          <div className="empty-state"><p>No vulnerability flags detected</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Worker ID</th><th>City</th><th>Platform</th><th>Avg Net</th><th>Deduction %</th><th>Anomalies</th><th>Risk</th></tr>
              </thead>
              <tbody>
                {flags.slice(0, 20).map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.worker_id?.slice(-8)}</td>
                    <td>{f.city}</td>
                    <td>{f.platform}</td>
                    <td style={{ color: f.avg_net < 10000 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      PKR {(f.avg_net || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${f.deduction_ratio_pct > 30 ? 'badge-danger' : 'badge-warning'}`}>
                        {f.deduction_ratio_pct}%
                      </span>
                    </td>
                    <td>{f.anomaly_count}</td>
                    <td>
                      <span className={`badge ${f.anomaly_count >= 3 || f.deduction_ratio_pct > 35 ? 'badge-danger' : 'badge-warning'}`}>
                        {f.anomaly_count >= 3 || f.deduction_ratio_pct > 35 ? '🔴 High' : '🟡 Medium'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* City breakdown */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><div className="card-title">City Breakdown</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {cities.map(city => (
            <div key={city.city} style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{city.city}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{city.worker_count} workers · {city.entry_count} entries</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AVG NET</div><div style={{ fontWeight: 700, fontSize: 14 }}>PKR {(city.avg_net || 0).toLocaleString()}</div></div>
                <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>HOURLY</div><div style={{ fontWeight: 700, fontSize: 14 }}>PKR {Math.round(city.avg_hourly || 0)}</div></div>
                <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>DEDUCTION</div>
                  <span className={`badge badge-sm ${city.avg_deduction_ratio > 25 ? 'badge-danger' : 'badge-success'}`}>{city.avg_deduction_ratio}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
