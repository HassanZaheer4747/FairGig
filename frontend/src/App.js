import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import EarningsPage from './pages/EarningsPage';
import GrievancesPage from './pages/GrievancesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CertificatePage from './pages/CertificatePage';
import VerificationPage from './pages/VerificationPage';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '10px', fontSize: '13px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="grievances" element={<GrievancesPage />} />
          <Route path="analytics" element={<ProtectedRoute roles={['advocate', 'verifier']}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="certificate" element={<CertificatePage />} />
          <Route path="verification" element={<ProtectedRoute roles={['verifier', 'advocate']}><VerificationPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
