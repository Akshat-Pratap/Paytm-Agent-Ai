import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAdmin, isLoggingOut } = useAuth();
  const loc = useLocation();
  if (isLoggingOut) return null;
  if (!isAdmin) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}
