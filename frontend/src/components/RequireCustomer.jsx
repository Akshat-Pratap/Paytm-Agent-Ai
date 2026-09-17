import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireCustomer({ children }) {
  const { customerToken, isLoggingOut } = useAuth();
  if (isLoggingOut) return null;
  if (!customerToken) return <Navigate to="/auth" replace />;
  return children;
}
