import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './frontend/contexts/AuthContext';
import { NotificationProvider } from './frontend/contexts/NotificationContext';
import { ProtectedRoute } from './frontend/components/auth/ProtectedRoute';
import { AdminRoute } from './frontend/components/auth/AdminRoute';
import Header from './frontend/components/layout/Header';
import { EmailVerificationBanner } from './frontend/components/auth/EmailVerificationBanner';
import LoginPage from './frontend/pages/LoginPage';
import RegisterPage from './frontend/pages/RegisterPage';
import ForgotPasswordPage from './frontend/pages/ForgotPasswordPage';
import HomePage from './frontend/pages/HomePage';
import ProfilePage from './frontend/pages/ProfilePage';
// FIX: Corrected import path for AdminDashboardPage to point to the unified `frontend` directory.
import AdminDashboardPage from './frontend/pages/AdminDashboardPage';
import RequestsPage from './frontend/pages/RequestsPage';
import AllRequestsPage from './frontend/pages/AllRequestsPage';
import InventoryPage from './frontend/pages/InventoryPage';
import MyReservationsPage from './frontend/pages/MyReservationsPage';
import CatalogPage from './frontend/pages/CatalogPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <Header />
            <EmailVerificationBanner />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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

              </Routes>
            </main>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
