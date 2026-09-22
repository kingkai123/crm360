import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, roleLabel } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — CRM360" },
      { name: "description", content: "Update your CRM360 profile details and password." },
      { property: "og:title", content: "My profile — CRM360" },
      { property: "og:description", content: "Manage your CRM360 account details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, role, user, refresh } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", job_title: "" });
  const [pw, setPw] = useState({ current: "", next: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        job_title: profile.job_title ?? "",
      });
    }
  }, [profile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim().slice(0, 80),
        phone: form.phone.trim().slice(0, 20) || null,
        job_title: form.job_title.trim().slice(0, 80) || null,
      })
      .eq("id", user!.id);
    if (error) {
      toast.error("Could not save your profile");
      return;
    }
    await refresh();
    toast.success("Profile updated");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next)) {
      toast.error("Use at least 8 characters with letters and numbers");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.current } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw({ current: "", next: "" });
    toast.success("Password changed");
  };

  return (
    <AppShell title="My profile">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display">Profile details</CardTitle>
            <CardDescription>
              Signed in as {profile?.email} · {role ? roleLabel[role] : "no role"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="space-y-2">
                <Label htmlFor="p-name">Full name</Label>
                <Input id="p-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-title">Job title</Label>
                <Input id="p-title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Phone</Label>
                <Input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display">Change password</CardTitle>
            <CardDescription>Choose a strong password you don't use elsewhere.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={changePassword}>
              <div className="space-y-2">
                <Label htmlFor="p-current">Current password</Label>
                <Input
                  id="p-current"
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-next">New password</Label>
                <Input
                  id="p-next"
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  required
                />
              </div>
              <Button type="submit">Update password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
