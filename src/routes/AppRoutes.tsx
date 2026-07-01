import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks/reduxHooks";
import Loader from "@/components/Loader/Loader";

const ExecutiveSummary = lazy(() => import("@/pages/ExecutiveSummary/ExecutiveSummary"));
const EnergyMonitoring = lazy(() => import("@/pages/EnergyMonitoring/EnergyMonitoring"));
const ProcessAnalysis = lazy(() => import("@/pages/ProcessAnalysis/ProcessAnalysis"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage/AlertsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage/SettingsPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage/LoginPage"));
const NotFound = lazy(() => import("@/pages/NotFound/NotFound"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

const AppRoutes = () => (
  <Suspense fallback={<Loader fullScreen />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ExecutiveSummary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/energy"
        element={
          <ProtectedRoute>
            <EnergyMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/process"
        element={
          <ProtectedRoute>
            <ProcessAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/user-management" element={<Navigate to="/settings?tab=user-management" replace />} />
      <Route path="/blend-tracker" element={<Navigate to="/settings?tab=blend-tracker" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
