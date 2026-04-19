import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { getDashboard } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { CardSkeleton } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartDefaults = {
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
  },
  responsive: true,
  maintainAspectRatio: false,
};

function FairnessCircle({ score, label }) {
  const cls = score >= 75 ? 'score-fair' : score >= 50 ? 'score-moderate' : 'score-unfair';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div className={`score-circle ${cls}`}>
        <span>{score}</span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="kpi-grid">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
        <div className="grid-2">
          <CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }

  if (!data) return <div className="empty-state"><p>Failed to load dashboard</p></div>;

  const { kpis, fairness_score, city_comparison, insights, alerts, trend_data, platform_breakdown } = data;

  const trendLabels = trend_data.slice(-14).map(t => t.date?.slice(5));
  const trendNetData = trend_data.slice(-14).map(t => t.net_amount);
  const trendDeductData = trend_data.slice(-14).map(t => t.deductions);

  const earningsChart = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Net Earnings (PKR)',
        data: trendNetData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
      {
        label: 'Deductions (PKR)',
        data: trendDeductData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ]
  };

  const hourlyChart = {
    labels: trend_data.slice(-10).map(t => t.date?.slice(5)),
    datasets: [{
      label: 'Hourly Rate (PKR)',
      data: trend_data.slice(-10).map(t => t.hourly_rate),
      backgroundColor: trend_data.slice(-10).map(t =>
        t.hourly_rate < 1500 ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.7)'
      ),
      borderRadius: 6,
    }]
  };

  const platformKeys = Object.keys(platform_breakdown || {});
  const platformChart = platformKeys.length > 0 ? {
    labels: platformKeys,
    datasets: [{
      data: platformKeys.map(k => platform_breakdown[k].total),
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
    }]
  } : null;

  const cityMedian = city_comparison?.city_median;
  const yourAvg = city_comparison?.your_avg || 0;
  const medianVal = cityMedian?.median || 0;
  const comparisonPct = medianVal > 0 ? Math.round(((yourAvg - medianVal) / medianVal) * 100) : 0;

  return (
    <div>
      {/* Alerts */}
      {alerts?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.slice(0, 2).map((alert, i) => (
            <div key={i} className={`alert alert-${alert.severity === 'high' ? 'danger' : 'warning'}`}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.type.replace(/_/g, ' ').toUpperCase()}</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>{alert.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Story Insights */}
      {insights?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {insights.slice(0, 2).map((insight, i) => (
            <div key={i} className={`alert alert-${insight.severity === 'positive' ? 'success' : insight.severity === 'high' ? 'danger' : 'warning'}`}>
              <span>💡</span>
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: 'rgba(99,102,241,0.15)' }}>💰</div>
          <div className="label">Total Earnings</div>
          <div className="value">PKR {(kpis.total_earnings || 0).toLocaleString()}</div>
          <div className="change pos">↑ All time</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: 'rgba(16,185,129,0.15)' }}>📅</div>
          <div className="label">Weekly Earnings</div>
          <div className="value">PKR {(kpis.weekly_earnings || 0).toLocaleString()}</div>
          <div className="change" style={{ color: 'var(--text-muted)' }}>Last 7 days</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: 'rgba(245,158,11,0.15)' }}>⏱</div>
          <div className="label">Avg Hourly Rate</div>
          <div className="value">PKR {Math.round(kpis.avg_hourly_rate || 0)}</div>
          <div className="change" style={{ color: 'var(--text-muted)' }}>Per hour</div>
        </div>
        <div className="kpi-card" style={{ border: `1px solid ${(fairness_score?.score || 0) >= 75 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label">⭐ Fairness Score</div>
              <div className="value">{fairness_score?.score || 0}</div>
              <div className="change" style={{ color: fairness_score?.score >= 75 ? 'var(--success)' : 'var(--warning)' }}>
                {fairness_score?.label}
              </div>
            </div>
            <FairnessCircle score={fairness_score?.score || 0} label={fairness_score?.label || ''} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Deduction: {fairness_score?.components?.deduction_score}  | Stability: {fairness_score?.components?.stability_score}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Earnings Trend</div>
              <div className="card-subtitle">Net earnings vs deductions (last 14 entries)</div>
            </div>
          </div>
          <div className="chart-wrap">
            <Line data={earningsChart} options={chartDefaults} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Hourly Rate</div>
              <div className="card-subtitle">Per-session hourly rate trend</div>
            </div>
          </div>
          <div className="chart-wrap">
            <Bar data={hourlyChart} options={chartDefaults} />
          </div>
        </div>
      </div>

      {/* City Comparison & Platform Breakdown */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚖️ You vs City Median</div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Your Average</span>
                  <span style={{ fontWeight: 700 }}>PKR {yourAvg.toLocaleString()}</span>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#6366f1', height: '100%', width: `${Math.min(100, (yourAvg / Math.max(yourAvg, medianVal)) * 100)}%`, borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>City Median ({cityMedian?.city})</span>
                  <span style={{ fontWeight: 700 }}>PKR {medianVal.toLocaleString()}</span>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#10b981', height: '100%', width: `${Math.min(100, (medianVal / Math.max(yourAvg, medianVal)) * 100)}%`, borderRadius: 4 }} />
                </div>
              </div>
              <div className={`badge ${comparisonPct >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 12 }}>
                {comparisonPct >= 0 ? '↑' : '↓'} {Math.abs(comparisonPct)}% {comparisonPct >= 0 ? 'above' : 'below'} median
              </div>
              {cityMedian?.sample_size > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Based on {cityMedian.sample_size} verified records
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Platform Breakdown</div>
          </div>
          {platformChart ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 120, height: 120 }}>
                <Doughnut data={platformChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }} />
              </div>
              <div style={{ flex: 1 }}>
                {platformKeys.map((key, i) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ['#6366f1','#10b981','#f59e0b','#ef4444'][i] }} />
                      {key}
                    </span>
                    <span style={{ fontWeight: 600 }}>PKR {(platform_breakdown[key].total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state"><p>No platform data yet</p></div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="card">
        <div className="card-header"><div className="card-title">Overview Stats</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { label: 'Total Entries', value: kpis.total_entries },
            { label: 'Verified', value: kpis.verified_count, color: 'var(--success)' },
            { label: 'Anomalies Detected', value: alerts?.length || 0, color: alerts?.length > 0 ? 'var(--danger)' : 'var(--text-muted)' },
            { label: 'Insights', value: insights?.length || 0, color: 'var(--accent)' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color || 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
