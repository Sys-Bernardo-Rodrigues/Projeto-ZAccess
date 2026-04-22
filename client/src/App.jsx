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
import EventsPage from './pages/EventsPage';
import UsersPage from './pages/UsersPage';
import MonitoringPage from './pages/MonitoringPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import InvitationsPage from './pages/InvitationsPage';
import InviteAccessPage from './pages/InviteAccessPage';
import RelayQrAccessPage from './pages/RelayQrAccessPage';
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
        <Route path="/eventos" element={<EventsPage />} />
        <Route path="/eventos" element={<Navigate to="/" replace />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/monitoring" element={<Navigate to="/" replace />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/invites" element={<InvitationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/invite/:token" element={<InviteAccessPage />} />
      <Route path="/relay-qr/:token" element={<RelayQrAccessPage />} />
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
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: {
                primary: 'var(--accent-success)',
                secondary: 'var(--bg-card)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--accent-danger)',
                secondary: 'var(--bg-card)',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
