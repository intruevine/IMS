import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/core/state/store';
import { hasAuthToken } from '@/core/api/client';

import MainLayout from '@/shared/components/layout/MainLayout';

import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ContractsPage from '@/features/contracts/ContractsPage';
import AssetsPage from '@/features/assets/AssetsPage';
import CalendarPage from '@/features/calendar/CalendarPage';
import ClientSupportReportPage from '@/features/client-support-report/ClientSupportReportPage';
import ClientSupportPage from '@/features/client-support/ClientSupportPage';
import ReportsPage from '@/features/reports/ReportsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import ProjectMembersPage from '@/features/project-members/ProjectMembersPage';
import ApiTestPage from '@/features/api-test/ApiTestPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const location = useLocation();
  const isLoginPath = location.pathname === '/login';
  if (isAuthenticated && hasAuthToken()) return <>{children}</>;
  if (isLoginPath) return null;
  return <Navigate to="/login" replace />;
}

function App() {
  const loadDashboardData = useAppStore((state) => state.loadDashboardData);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !hasAuthToken()) return;
    loadDashboardData();
  }, [isAuthenticated, loadDashboardData]);

  return (
    <BrowserRouter
      basename="/MA"
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="client-support-report" element={<ClientSupportReportPage />} />
          <Route path="client-support" element={<ClientSupportPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="project-members" element={<ProjectMembersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="api-test" element={<ApiTestPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
