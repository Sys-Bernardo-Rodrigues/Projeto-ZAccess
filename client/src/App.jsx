import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './hooks/useAuth';

import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import LocationsPage from './pages/LocationsPage';
import RelaysPage from './pages/RelaysPage';
import InputsPage from './pages/InputsPage';
import SchedulesPage from './pages/SchedulesPage';
import LogsPage from './pages/LogsPage';
import AutomationsPage from './pages/AutomationsPage';
import UsersPage from './pages/UsersPage';
import MonitoringPage from './pages/MonitoringPage';
import ReportsPage from './pages/ReportsPage';
import InvitationsPage from './pages/InvitationsPage';
import InviteAccessPage from './pages/InviteAccessPage';
import AlertListener from './components/Alerts/AlertListener';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return !user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <SocketProvider>
              <AppLayout />
            </SocketProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/relays" element={<RelaysPage />} />
        <Route path="/inputs" element={<InputsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/automations" element={<AutomationsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/invites" element={<InvitationsPage />} />
      </Route>
      <Route path="/invite/:token" element={<InviteAccessPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlertListener />
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1a1f35',
              color: '#f1f5f9',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '12px',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#1a1f35',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1a1f35',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
