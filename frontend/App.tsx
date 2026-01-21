import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { FacultyRoute } from './components/auth/FacultyRoute';
import Header from './components/layout/Header';
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
import MyEndorsementsPage from './pages/MyEndorsementsPage';
import CatalogPage from './pages/CatalogPage';
import SettingsPage from './pages/SettingsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
            <Header />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Verification Route */}
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }/>
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

                {/* Faculty Routes */}
                <Route path="/my-endorsements" element={
                  <FacultyRoute>
                    <MyEndorsementsPage />
                  </FacultyRoute>
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
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
