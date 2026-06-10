import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, ShoppingCart, Package, Clipboard, AlertTriangle,
  BarChart2, Users, Truck, LogOut, Menu, Sun, Moon, Pill,
  FileText, Clock, PackageX
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "Point of Sale", href: "/pos" },
  { icon: Package, label: "Products", href: "/products", roles: ["admin", "pharmacist"] },
  { icon: FileText, label: "Documents", href: "/documents", roles: ["admin"] },
  { icon: Clipboard, label: "Inventory", href: "/inventory", roles: ["admin", "pharmacist"] },
  { icon: PackageX, label: "Loss Management", href: "/inventory-loss", roles: ["admin", "pharmacist"] },
  { icon: AlertTriangle, label: "Expiry", href: "/expiry", roles: ["admin", "pharmacist"] },
  { icon: Clock, label: "End of Day", href: "/end-of-day", roles: ["admin"] },
  { icon: BarChart2, label: "Reports", href: "/reports", roles: ["admin"] },
  { icon: Users, label: "Users", href: "/users", roles: ["admin"] },
  { icon: Truck, label: "Suppliers", href: "/suppliers", roles: ["admin", "pharmacist"] },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  pharmacist: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cashier: "bg-green-500/20 text-green-300 border-green-500/30",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? "")
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20">
          <Pill className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div>
          <p className="text-sidebar-foreground font-semibold text-sm leading-tight">PharmaCare</p>
          <p className="text-sidebar-foreground/50 text-xs">Management System</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground text-xs font-semibold truncate">{user?.name}</p>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 mt-0.5 border", ROLE_COLORS[user?.role ?? "cashier"])}>
              {user?.role}
            </Badge>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors p-1 rounded"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={logout}
          data-testid="button-logout"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 h-full bg-sidebar border-r border-sidebar-border z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground" data-testid="button-mobile-menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">PharmaCare</span>
          </div>
          <div className="w-5" />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
