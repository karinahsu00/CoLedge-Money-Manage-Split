import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import MobileLayout from './components/MobileLayout';

import LoginPage from './pages/LoginPage';
import Register from './pages/Register';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import SplitPage from './pages/SplitPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MorePage from './pages/MorePage';

function App() {
  const wrap = (node) => <MobileLayout>{node}</MobileLayout>;

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {wrap(<DashboardPage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                {wrap(<TransactionsPage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/split"
            element={
              <ProtectedRoute>
                {wrap(<SplitPage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                {wrap(<AccountsPage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/account/:id"
            element={
              <ProtectedRoute>
                {wrap(<AccountDetailPage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                {wrap(<AnalyticsPage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/more"
            element={
              <ProtectedRoute>
                {wrap(<MorePage />)}
              </ProtectedRoute>
            }
          />

          <Route
            path="/more"
            element={
              <ProtectedRoute>
                <MorePage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;