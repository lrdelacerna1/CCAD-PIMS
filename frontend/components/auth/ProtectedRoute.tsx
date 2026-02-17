import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const emailVerificationExempt = ['pending-faculty', 'guest'].includes(user.role);

  if (!user.emailVerified && !emailVerificationExempt) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};