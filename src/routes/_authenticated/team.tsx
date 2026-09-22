import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/hooks/useTeam";
import { useAuth, roleLabel, type AppRole } from "@/hooks/useAuth";
import { logActivity } from "@/lib/crm";
import { createMember, removeMember } from "@/lib/admin.functions";
import { checkPhone, emailSchema, passwordSchema } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & roles — CRM360" },
      { name: "description", content: "Admin controls for team members and role-based permissions." },
      { property: "og:title", content: "Team & roles — CRM360" },
      { property: "og:description", content: "Add members, set their position and remove access in CRM360." },
    ],
  }),
  component: TeamPage,
});

const EMPTY = { fullName: "", email: "", phone: "", jobTitle: "", password: "", role: "sales_executive" as AppRole };

function TeamPage() {
  const { data: team = [] } = useTeam();
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [transferTo, setTransferTo] = useState("unassigned");

  const setRole = useMutation({
    mutationFn: async ({ id, next, name }: { id: string; next: AppRole; name: string }) => {
      if (id === user?.id) throw new Error("You cannot change your own role");
      await supabase.from("user_roles").delete().eq("user_id", id);
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: next });
      if (error) throw error;
      await logActivity({
        entity_type: "user",
        entity_id: id,
        action: "role_changed",
        description: `Changed ${name}'s role to ${roleLabel[next]}`,
      });
    },
    onSuccess: () => {
      toast.success("Role updated");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const em = emailSchema.safeParse(form.email);
      if (!em.success) throw new Error(em.error.issues[0]!.message);
      const pw = passwordSchema.safeParse(form.password);
      if (!pw.success) throw new Error(pw.error.issues[0]!.message);
      const phoneError = checkPhone(form.phone, { required: true });
      if (phoneError) throw new Error(phoneError);
      if (!form.fullName.trim()) throw new Error("Enter the member's full name");

      await createMember({
        data: {
          email: em.data,
          password: pw.data,
          fullName: form.fullName,
          phone: form.phone,
          jobTitle: form.jobTitle,
          role: form.role,
        },
      });
      await logActivity({
        entity_type: "user",
        action: "member_added",
        description: `Added ${form.fullName.trim()} as ${roleLabel[form.role]}`,
      });
    },
    onSuccess: () => {
      toast.success("Member added — share the starting password with them");
      setForm(EMPTY);
      setAddOpen(false);
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!removing) return;
      await removeMember({
        data: { userId: removing.id, transferTo: transferTo === "unassigned" ? null : transferTo },
      });
      await logActivity({
        entity_type: "user",
        action: "member_removed",
        description:
          transferTo === "unassigned"
            ? `Removed ${removing.name}; their records are now unassigned`
            : `Removed ${removing.name} and transferred their records`,
      });
    },
    onSuccess: () => {
      toast.success("Member removed");
      setRemoving(null);
      setTransferTo("unassigned");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") {
    return (
      <AppShell title="Team & roles">
        <p className="text-sm text-muted-foreground">Only admins can manage team members.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Team & roles"
      actions={
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-2 size-4" /> Add member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add a team member</DialogTitle>
              <DialogDescription>
                Set their position and a starting password. They can change the password from their profile.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                addMember.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="m-name">Full name</Label>
                <Input
                  id="m-name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-email">Email</Label>
                <Input
                  id="m-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-phone">Phone number</Label>
                <Input
                  id="m-phone"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-title">Job title</Label>
                <Input
                  id="m-title"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-role">Position</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger id="m-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
                    <SelectItem value="sales_executive">Sales Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-pw">Starting password</Label>
                <Input
                  id="m-pw"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="sm:col-span-2" disabled={addMember.isPending}>
                {addMember.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Create member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-3">
        {team.map((m) => (
          <Card key={m.id} className="shadow-soft">
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-52 flex-1">
                <p className="font-display font-semibold">{m.full_name || m.email}</p>
                <p className="text-sm text-muted-foreground">{m.email}</p>
              </div>
              {m.id === user?.id && <Badge variant="secondary">You</Badge>}
              <Select
                value={m.role ?? ""}
                onValueChange={(v) => setRole.mutate({ id: m.id, next: v as AppRole, name: m.full_name })}
              >
                <SelectTrigger className="w-56" aria-label={`Role for ${m.full_name}`}>
                  <SelectValue placeholder="No role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="sales_executive">Sales Executive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${m.full_name || m.email}`}
                disabled={m.id === user?.id}
                onClick={() => {
                  setRemoving({ id: m.id, name: m.full_name || m.email });
                  setTransferTo("unassigned");
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Remove {removing?.name}?</DialogTitle>
            <DialogDescription>
              They lose access immediately. Their customers, leads and tasks are kept — choose who should take them
              over.
            </DialogDescription>
          </DialogHeader>
          <Card className="border-dashed shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hand their records to</CardTitle>
              <CardDescription>You can always reassign them later.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger aria-label="Transfer records to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Leave unassigned</SelectItem>
                  {team
                    .filter((m) => m.id !== removing?.id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name || m.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Remove member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
