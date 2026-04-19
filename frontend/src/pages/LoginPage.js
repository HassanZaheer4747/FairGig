import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email, password) => {
    setForm({ email, password });
    setLoading(true);
    try {
      const res = await login({ email, password });
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Quick login failed — ensure backend is running');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand">Fair<span>Gig</span></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Gig Worker Income & Rights Platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          — Quick Demo Login —
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: '👷 Worker', email: 'worker@demo.com', pass: 'demo1234' },
            { label: '⚖️ Advocate', email: 'advocate@demo.com', pass: 'demo1234' },
            { label: '🛡 Verifier', email: 'verifier@demo.com', pass: 'demo1234' },
          ].map(d => (
            <button
              key={d.email}
              className="btn btn-ghost btn-sm"
              onClick={() => quickLogin(d.email, d.pass)}
              disabled={loading}
              style={{ justifyContent: 'center', fontSize: 11 }}
            >
              {d.label}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
