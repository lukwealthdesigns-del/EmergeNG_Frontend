import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { ThemeProvider } from "../theme/ThemeProvider";
import { I18nProvider, useI18n } from "../i18n";
import { ToastProvider } from "../components/ui";
import { AuthProvider } from "../auth/AuthProvider";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { MainShell, StaffShell, PlainShell, PageFallback } from "../layouts/Shells";
import { P } from "./lazy";
import { RequireAuth, RequireAccess, opsCheck, adminCheck, partnerCheck, permCheck } from "./guards";
import Splash from "../pages/public/Splash";
import { ls } from "../lib/utils";
import { setObserver } from "../api/client";
import { reportReachable, startConnectivity } from "../offline/connectivity";
import { syncNow, refreshPending, registerBackgroundSync } from "../offline/syncManager";
import { requestPersistence } from "../offline/idb";
import UpdatePrompt from "../components/common/UpdatePrompt";

import { ONBOARDED_KEY } from "../lib/constants";

// Wire the API client's reachability signals into the connectivity state machine, then start monitoring.
setObserver({ onSuccess: () => reportReachable(true), onNetworkFailure: () => reportReachable(false), onServerUnavailable: () => reportReachable(false) });

function Boot({ children }) {
  useEffect(() => {
    startConnectivity(() => { syncNow(); registerBackgroundSync(); });
    refreshPending(); requestPersistence();
  }, []);
  return children;
}

/** Decides home vs. welcome each time the "/" route renders. (It used to be read once in Routing(), which does not re-render
 *  after Onboarding saves the flag, so Skip / Continue bounced back to /welcome.) */
function HomeGate() {
  return ls.get(ONBOARDED_KEY) === "1"
    ? <Suspense fallback={<PageFallback />}><P.Home /></Suspense>
    : <Navigate to="/welcome" replace />;
}

function Routing() {
  const { t } = useI18n();
  const S = (el) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;
  return (
    <ErrorBoundary t={t}>
      <Routes>
        <Route path="/welcome" element={<PlainShell />}><Route index element={S(<P.Onboarding />)} /></Route>
        <Route element={<MainShell />}>
          <Route index element={<HomeGate />} />
          <Route path="location" element={S(<P.ShareLocation />)} />
          <Route path="nearby" element={S(<P.NearbyHelp />)} />
          <Route path="report" element={S(<P.Report />)} />
          <Route path="report/done/:id" element={S(<P.ReportDone />)} />
          <Route path="track" element={S(<P.Track />)} />
          <Route path="offline" element={S(<P.OfflineMode />)} />
          <Route path="about" element={S(<P.About />)} />
          <Route path="privacy" element={S(<P.Privacy />)} />
          <Route path="terms" element={S(<P.Terms />)} />
          <Route path="signin" element={S(<P.SignIn />)} />
          <Route path="signup" element={S(<P.SignUp />)} />
          <Route path="verify-email" element={S(<P.VerifyEmail />)} />
          <Route path="forgot-password" element={S(<P.Forgot />)} />
          <Route path="session-expired" element={S(<P.SessionExpired />)} />
          <Route path="forbidden" element={S(<P.Forbidden />)} />
          <Route path="error" element={S(<P.ServerError />)} />
          <Route path="offline-page" element={S(<P.OfflinePage />)} />
          <Route path="*" element={S(<P.NotFound />)} />
          <Route path="app" element={<RequireAuth><Outlet /></RequireAuth>}>
            <Route index element={S(<P.Dashboard />)} />
            <Route path="profile" element={S(<P.EmergencyProfile />)} />
            <Route path="contacts" element={S(<P.Contacts />)} />
            <Route path="places" element={S(<P.Places />)} />
            <Route path="incidents" element={S(<P.Incidents />)} />
            <Route path="incidents/:id" element={S(<P.IncidentDetail />)} />
            <Route path="notifications" element={S(<P.Notifications />)} />
            <Route path="emergency-card" element={S(<P.EmergencyCard />)} />
            <Route path="settings" element={S(<P.Settings />)} />
          </Route>
        </Route>
        <Route path="ops" element={<RequireAuth><RequireAccess check={opsCheck}><StaffShell kind="ops" /></RequireAccess></RequireAuth>}>
          <Route index element={S(<P.OpsOverview />)} />
          <Route path="queue" element={S(<P.OpsQueue />)} />
          <Route path="map" element={S(<P.OpsMap />)} />
          <Route path="incidents/:id" element={S(<P.OpsIncident />)} />
          <Route path="analytics" element={S(<P.OpsAnalytics />)} />
          <Route path="geo" element={S(<P.OpsGeo />)} />
          <Route path="partners" element={S(<P.OpsPartners />)} />
          <Route path="notifications" element={S(<P.OpsNotifications />)} />
          <Route path="abuse" element={S(<P.OpsAbuse />)} />
          <Route path="health" element={S(<P.OpsHealth />)} />
          <Route path="audit" element={S(<P.OpsAudit />)} />
        </Route>
        <Route path="partner" element={<RequireAuth><RequireAccess check={partnerCheck}><StaffShell kind="partner" /></RequireAccess></RequireAuth>}>
          <Route index element={S(<P.Partner />)} />
        </Route>
        <Route path="admin/login" element={<PlainShell />}><Route index element={S(<P.AdminSignIn />)} /></Route>
        <Route path="admin" element={<RequireAuth loginPath="/admin/login"><RequireAccess check={adminCheck}><StaffShell kind="admin" /></RequireAccess></RequireAuth>}>
          <Route index element={S(<P.AdminOverview />)} />
          <Route path="users" element={S(<P.AdminUsers />)} />
          <Route path="roles" element={S(<P.AdminRoles />)} />
          <Route path="organizations" element={S(<P.AdminOrgs />)} />
          <Route path="integrations" element={S(<P.AdminIntegrations />)} />
          <Route path="security" element={S(<P.AdminSecurity />)} />
          <Route path="settings" element={S(<P.AdminSettings />)} />
          <Route path="privacy" element={S(<P.AdminPrivacy />)} />
          <Route path="approvals" element={S(<P.AdminApprovals />)} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  const [splash, setSplash] = useState(() => !sessionStorageGet("emergeng.splash"));
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <Boot>
                  {splash && <Splash onDone={() => { try { sessionStorage.setItem("emergeng.splash", "1"); } catch { /* ignore */ } setSplash(false); }} />}
                  <Routing /><UpdatePrompt />
                </Boot>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }