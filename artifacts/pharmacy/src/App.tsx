import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { initApiAuth } from "@/lib/api";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import ExpiryPage from "@/pages/expiry";
import ReportsPage from "@/pages/reports";
import UsersPage from "@/pages/users";
import SuppliersPage from "@/pages/suppliers";
import NotFound from "@/pages/not-found";

initApiAuth();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
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

      <Route path="/inventory">
        {() => (
          <ProtectedRoute>
            <Layout><InventoryPage /></Layout>
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

      <Route path="/reports">
        {() => (
          <ProtectedRoute roles={["admin", "pharmacist"]}>
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
