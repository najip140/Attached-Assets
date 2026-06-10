import { useState } from "react";
import { useLocation } from "wouter";
import { Pill, Loader2, Eye, EyeOff } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        setLocation("/dashboard");
      },
      onError: () => {
        toast({ title: "Login failed", description: "Incorrect username or password.", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <Pill className="w-6 h-6 text-sidebar-primary" />
          </div>
          <div>
            <p className="text-sidebar-foreground font-bold text-lg leading-tight">PharmaCare</p>
            <p className="text-sidebar-foreground/50 text-xs">Management System</p>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Professional<br />Pharmacy<br />Management
          </h1>
          <p className="mt-4 text-sidebar-foreground/60 leading-relaxed max-w-sm">
            Streamline your dispensary operations — manage inventory, process sales, track expiry, and generate detailed reports.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: "Products", val: "8+" },
              { label: "Roles", val: "3" },
              { label: "Reports", val: "7" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-sidebar-primary">{s.val}</p>
                <p className="text-sidebar-foreground/50 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-foreground/30 text-xs">
          © 2026 PharmaCare. Secure healthcare management.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">PharmaCare</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-muted-foreground text-sm mt-1 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-submit"
              className="w-full"
              disabled={loginMutation.isPending || !username || !password}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
