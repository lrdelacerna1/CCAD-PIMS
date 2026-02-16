
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './frontend/contexts/AuthContext';
import LoginPage from './frontend/pages/LoginPage';
import RegisterPage from './frontend/pages/RegisterPage';
import DashboardPage from './frontend/pages/DashboardPage';
import { Toaster } from './frontend/components/ui/Toaster';
import SuperAdminDashboard from './frontend/pages/SuperAdminDashboard';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Toaster />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
      {isSuperAdmin && (
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
      )}
    </Routes>
  );
};

export default App;
