import { useState } from "react";
import { useLocation } from "wouter";
import { Pill, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
export default function SetupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      login(data.token);
      toast({ title: "Account created!", description: `Welcome, ${data.user.name}. You are logged in as Admin.` });
      setLocation("/dashboard");
    } catch (err: unknown) {
      toast({ title: "Setup failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
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
          <div className="w-14 h-14 rounded-2xl bg-sidebar-primary/20 flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-sidebar-primary" />
          </div>
          <h1 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            First Time<br />Setup
          </h1>
          <p className="mt-4 text-sidebar-foreground/60 leading-relaxed max-w-sm">
            Create your administrator account to get started. You'll be able to add more staff accounts from the Users page after signing in.
          </p>
          <div className="mt-8 space-y-3">
            {["Full access to all modules", "Manage staff accounts & roles", "View all reports & financials"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sidebar-foreground/70 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-foreground/30 text-xs">© 2026 PharmaCare. Secure healthcare management.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">PharmaCare</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Create Admin Account</h2>
          <p className="text-muted-foreground text-sm mt-1 mb-8">
            Set up your credentials to manage the system
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Dr. Ahmed Hassan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                autoComplete="username"
                required
                minLength={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@pharmacy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                  required
                  minLength={6}
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

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loading || !name || !username || !password || !confirm}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>
              ) : (
                "Create Admin Account"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
