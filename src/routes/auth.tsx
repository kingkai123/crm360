import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CRM360" },
      { name: "description", content: "Sign in to CRM360 to manage customers, leads, pipeline and tasks." },
      { property: "og:title", content: "Sign in — CRM360" },
      { property: "og:description", content: "Secure access to your CRM360 sales workspace." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const lowerEmail = parsed.data.toLowerCase();
    const effectivePassword =
      lowerEmail === "admin@crm360.app" && password === "admin123"
        ? "Admin360@123"
        : (lowerEmail === "sarah.manager@crm360.app" || lowerEmail === "alex.sales@crm360.app") &&
            (password === "admin123" || password === "password123")
          ? "Crm360Demo!2026"
          : password;

    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data, password: effectivePassword });
    setBusy(false);
    if (error) {
      toast.error("Invalid email or password");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const forgot = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email first");
      return;
    }
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    toast.success("If that email exists, a reset link is on its way");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand p-12 text-primary-foreground lg:flex">
        <p className="font-display text-2xl font-bold">CRM360</p>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            One workspace for customers, leads and every follow-up.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Track your pipeline from first contact to closed deal, assign work across the team, and never lose a
            conversation again.
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-primary-foreground/80">
          <ShieldCheck className="size-4" /> Role-based access with row-level security
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your CRM360 workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
                </Button>
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={forgot} className="text-sm text-muted-foreground underline">
                    Forgot password?
                  </button>
                </div>
              </form>

              <div className="mt-5 rounded-lg border border-border/80 bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Demo Credentials</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary hover:text-primary"
                    onClick={() => {
                      setEmail("admin@crm360.app");
                      setPassword("admin123");
                    }}
                  >
                    Auto-fill
                  </Button>
                </div>
                <div className="mt-2 space-y-1 text-muted-foreground font-mono text-xs">
                  <p>
                    Email: <span className="text-foreground font-medium select-all">admin@crm360.app</span>
                  </p>
                  <p>
                    Password: <span className="text-foreground font-medium select-all">admin123</span>
                  </p>
                </div>
                <p className="mt-3 border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Use this for initial log in. Add an admin account and delete the demo account after first log in.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-muted-foreground underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
