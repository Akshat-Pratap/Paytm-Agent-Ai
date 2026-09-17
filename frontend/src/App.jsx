import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './components/Login.jsx';
import CustomerPortal from './pages/CustomerPortal.jsx';
import ShowcaseDashboard from './pages/ShowcaseDashboard.jsx';
import RequireCustomer from './components/RequireCustomer.jsx';
import { useAuth } from './context/AuthContext.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import CustomerHistory from './pages/CustomerHistory.jsx';
import CustomerAuth from './pages/CustomerAuth.jsx';
import CasesPage from './pages/admin/CasesPage.jsx';
import ActivityPage from './pages/admin/ActivityPage.jsx';
import AuditPage from './pages/admin/AuditPage.jsx';

function DashboardRoute() {
  const { customerToken } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <ShowcaseDashboard onAuthClick={() => nav('/auth')} />
      {customerToken && <div style={{ marginTop: 12, textAlign: 'center' }}><a className="btn" href="/customer">Go to My Cases →</a></div>}
    </>
  );
}

function Shelled({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      {/* Full-screen auth — no header */}
      <Route path="/auth" element={<CustomerAuth />} />
      <Route path="/" element={<Shelled><DashboardRoute /></Shelled>} />
      <Route path="/customer" element={<Shelled><RequireCustomer><CustomerPortal /></RequireCustomer></Shelled>} />
      <Route path="/customer/history" element={<Shelled><RequireCustomer><CustomerHistory /></RequireCustomer></Shelled>} />
      <Route path="/customer/profile" element={<Shelled><RequireCustomer><CustomerProfile /></RequireCustomer></Shelled>} />
      <Route path="/login" element={<Shelled><Login /></Shelled>} />
      <Route path="/admin" element={<Shelled><ProtectedRoute><Navigate to="/admin/cases" replace /></ProtectedRoute></Shelled>} />
      <Route path="/admin/cases" element={<Shelled><ProtectedRoute><CasesPage /></ProtectedRoute></Shelled>} />
      <Route path="/admin/activity" element={<Shelled><ProtectedRoute><ActivityPage /></ProtectedRoute></Shelled>} />
      <Route path="/admin/audit" element={<Shelled><ProtectedRoute><AuditPage /></ProtectedRoute></Shelled>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
