import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signup } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'worker', city: 'Lahore', platform: 'Uber' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signup(form);
      setAuth(res.data.user, res.data.token);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand">Fair<span>Gig</span></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" name="role" value={form.role} onChange={handleChange}>
                <option value="worker">Worker</option>
                <option value="verifier">Verifier</option>
                <option value="advocate">Advocate</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <select className="form-input" name="city" value={form.city} onChange={handleChange}>
                <option>Lahore</option>
                <option>Karachi</option>
                <option>Islamabad</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Platform</label>
            <select className="form-input" name="platform" value={form.platform} onChange={handleChange}>
              <option>Uber</option>
              <option>Foodpanda</option>
              <option>Fiverr</option>
              <option>Multiple</option>
              <option>Other</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Creating Account...' : 'Create Account →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
