import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // FIX: Allow 'superadmin' role in addition to 'admin' role.
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
