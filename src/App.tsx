import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/core/state/store';
import { hasAuthToken } from '@/core/api/client';

const MainLayout = lazy(() => import('@/shared/components/layout/MainLayout'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ContractsPage = lazy(() => import('@/features/contracts/ContractsPage'));
const AssetsPage = lazy(() => import('@/features/assets/AssetsPage'));
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'));
const ClientSupportReportPage = lazy(() => import('@/features/client-support-report/ClientSupportReportPage'));
const ClientSupportPage = lazy(() => import('@/features/client-support/ClientSupportPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ProjectMembersPage = lazy(() => import('@/features/project-members/ProjectMembersPage'));
const ApiTestPage = lazy(() => import('@/features/api-test/ApiTestPage'));
const NoticesPage = lazy(() => import('@/features/notices/NoticesPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        화면을 불러오는 중입니다.
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const location = useLocation();
  const isLoginPath = location.pathname === '/login';
  if (isAuthenticated && hasAuthToken()) return <>{children}</>;
  if (isLoginPath) return null;
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <HashRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <Suspense fallback={<RouteFallback />}>
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
            <Route path="notices" element={<NoticesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="project-members" element={<ProjectMembersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="api-test" element={<ApiTestPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
