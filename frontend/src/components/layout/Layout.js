import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['worker', 'verifier', 'advocate'] },
  { label: 'Earnings', path: '/earnings', icon: '💰', roles: ['worker'] },
  { label: 'Verification', path: '/verification', icon: '🛡', roles: ['verifier', 'advocate'] },
  { label: 'Grievances', path: '/grievances', icon: '💬', roles: ['worker', 'verifier', 'advocate'] },
  { label: 'Analytics', path: '/analytics', icon: '📈', roles: ['verifier', 'advocate'] },
  { label: 'Certificate', path: '/certificate', icon: '📄', roles: ['worker'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allowedItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">Fair<span>Gig</span></div>
          <div className="sub">Worker Rights Platform</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {allowedItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="name truncate">{user?.name || 'User'}</div>
            <div className="role">{user?.role}</div>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={handleLogout}
            title="Logout"
          >🚪</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {allowedItems.find(i => window.location.pathname.startsWith(i.path))?.label || 'FairGig'}
          </div>
          <div className="topbar-actions">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {user?.city} · {user?.platform}
            </span>
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
