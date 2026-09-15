import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './components/Login.jsx';
import CustomerPortal from './pages/CustomerPortal.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import ShowcaseDashboard from './pages/ShowcaseDashboard.jsx';
import CustomerAuthModal from './components/CustomerAuthModal.jsx';
import RequireCustomer from './components/RequireCustomer.jsx';
import { useAuth } from './context/AuthContext.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import CustomerHistory from './pages/CustomerHistory.jsx';
import CasesPage from './pages/admin/CasesPage.jsx';
import ActivityPage from './pages/admin/ActivityPage.jsx';
import AuditPage from './pages/admin/AuditPage.jsx';

function DashboardRoute() {
  const [open, setOpen] = useState(false);
  const { customerToken } = useAuth();
  const loc = useLocation();
  return (
    <>
      <ShowcaseDashboard onAuthClick={() => setOpen(true)} />
      <CustomerAuthModal open={open || new URLSearchParams(loc.search).get('auth') === '1'} onClose={(didAuth) => { setOpen(false); if (didAuth) window.location.href = '/customer'; }} />
      {customerToken && <div style={{ marginTop: 12, textAlign: 'center' }}><a className="btn" href="/customer">Go to My Cases →</a></div>}
    </>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardRoute />} />
        <Route path="/customer" element={<RequireCustomer><CustomerPortal /></RequireCustomer>} />
        <Route path="/customer/history" element={<RequireCustomer><CustomerHistory /></RequireCustomer>} />
        <Route path="/customer/profile" element={<RequireCustomer><CustomerProfile /></RequireCustomer>} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPortal /></ProtectedRoute>} />
        <Route path="/admin/cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
        <Route path="/admin/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
