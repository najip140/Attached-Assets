import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { initApiAuth } from "@/lib/api";

import LoginPage from "@/pages/login";
import SetupPage from "@/pages/setup";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import ExpiryPage from "@/pages/expiry";
import ReportsPage from "@/pages/reports";
import UsersPage from "@/pages/users";
import SuppliersPage from "@/pages/suppliers";
import DocumentsPage from "@/pages/documents";
import EndOfDayPage from "@/pages/end-of-day";
import InventoryLossPage from "@/pages/inventory-loss";
import BackupPage from "@/pages/backup";
import NotFound from "@/pages/not-found";

initApiAuth();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function SetupGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const res = await fetch("/api/setup/status");
      return res.json() as Promise<{ needsSetup: boolean }>;
    },
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && data?.needsSetup) {
      setLocation("/setup");
    }
  }, [isLoading, data?.needsSetup, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data?.needsSetup) return null;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/setup" component={SetupPage} />
      <Route path="/login">
        {() => (
          <SetupGuard>
            <LoginPage />
          </SetupGuard>
        )}
      </Route>
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>

      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/pos">
        {() => (
          <ProtectedRoute>
            <Layout><POSPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/products">
        {() => (
          <ProtectedRoute roles={["admin", "pharmacist"]}>
            <Layout><ProductsPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/documents">
        {() => (
          <ProtectedRoute roles={["admin"]}>
            <Layout><DocumentsPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/inventory">
        {() => (
          <ProtectedRoute roles={["admin", "pharmacist"]}>
            <Layout><InventoryPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/inventory-loss">
        {() => (
          <ProtectedRoute roles={["admin", "pharmacist"]}>
            <Layout><InventoryLossPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/expiry">
        {() => (
          <ProtectedRoute roles={["admin", "pharmacist"]}>
            <Layout><ExpiryPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/end-of-day">
        {() => (
          <ProtectedRoute roles={["admin"]}>
            <Layout><EndOfDayPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/reports">
        {() => (
          <ProtectedRoute roles={["admin"]}>
            <Layout><ReportsPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/users">
        {() => (
          <ProtectedRoute roles={["admin"]}>
            <Layout><UsersPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/suppliers">
        {() => (
          <ProtectedRoute roles={["admin", "pharmacist"]}>
            <Layout><SuppliersPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/backup">
        {() => (
          <ProtectedRoute roles={["admin"]}>
            <Layout><BackupPage /></Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
