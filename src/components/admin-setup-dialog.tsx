import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { completeAdminSetup } from "@/lib/admin.functions";
import { checkPhone, emailSchema, passwordSchema } from "@/lib/validation";

/** Shown once, right after the very first administrator sign-in. */
export function AdminSetupDialog() {
  const { profile, role, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "" });

  const open = role === "admin" && profile?.must_setup === true;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = emailSchema.safeParse(form.email);
    if (!em.success) {
      toast.error(em.error.issues[0]!.message);
      return;
    }
    const pw = passwordSchema.safeParse(form.password);
    if (!pw.success) {
      toast.error(pw.error.issues[0]!.message);
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Both passwords must match");
      return;
    }
    const phoneError = checkPhone(form.phone, { required: true });
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setBusy(true);
    try {
      await completeAdminSetup({
        data: { email: em.data, password: pw.data, fullName: form.fullName, phone: form.phone },
      });
      await refresh();
      toast.success("Admin account set up — use your new email and password next time");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display">Set up your admin account</DialogTitle>
          <DialogDescription>
            Choose the email and password you will use from now on. This step is required before you can continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="as-name">Full name</Label>
            <Input
              id="as-name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="as-email">Email</Label>
            <Input
              id="as-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="as-phone">Phone number</Label>
            <Input
              id="as-phone"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="as-pw">New password</Label>
              <Input
                id="as-pw"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-pw2">Confirm password</Label>
              <Input
                id="as-pw2"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Save and continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
