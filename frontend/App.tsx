import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import Header from './components/layout/Header';
import { EmailVerificationBanner } from './components/auth/EmailVerificationBanner';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RequestsPage from './pages/RequestsPage';
import AllRequestsPage from './pages/AllRequestsPage';
import InventoryPage from './pages/InventoryPage';
import MyReservationsPage from './pages/MyReservationsPage';
import CatalogPage from './pages/CatalogPage';
import SettingsPage from './pages/SettingsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
            <Header />
            <EmailVerificationBanner />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Routes */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }/>
                <Route path="/my-reservations" element={
                  <ProtectedRoute>
                    <MyReservationsPage />
                  </ProtectedRoute>
                }/>
                <Route path="/catalog" element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                }/>

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }/>

                <Route path="/requests" element={
                  <AdminRoute>
                    <RequestsPage />
                  </AdminRoute>
                }/>

                <Route path="/all-requests" element={
                  <AdminRoute>
                    <AllRequestsPage />
                  </AdminRoute>
                }/>

                <Route path="/inventory" element={
                  <AdminRoute>
                    <InventoryPage />
                  </AdminRoute>
                }/>

                <Route path="/settings" element={
                  <AdminRoute>
                    <SettingsPage />
                  </AdminRoute>
                }/>

              </Routes>
            </main>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;