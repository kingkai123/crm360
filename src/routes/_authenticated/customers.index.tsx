import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logActivity } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — CRM360" },
      { name: "description", content: "Add, search and manage every customer record in one place." },
      { property: "og:title", content: "Customers — CRM360" },
      { property: "og:description", content: "Your full customer directory with interaction history." },
    ],
  }),
  component: CustomersPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255).or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  status: z.string(),
  notes: z.string().trim().max(1000).optional(),
});

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  status: string;
  notes: string | null;
};

function CustomerForm({
  initial,
  onDone,
}: {
  initial?: Partial<CustomerRow> & { id?: string };
  onDone: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    company: initial?.company ?? "",
    address: initial?.address ?? "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const payload = {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: form.phone || null,
        company: form.company || null,
        address: form.address || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (initial?.id) {
        const { error } = await supabase.from("customers").update(payload).eq("id", initial.id);
        if (error) throw error;
        await logActivity({
          entity_type: "customer",
          entity_id: initial.id,
          customer_id: initial.id,
          action: "updated",
          description: `Updated customer ${payload.name}`,
        });
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({ ...payload, created_by: user!.id, owner_id: user!.id })
          .select()
          .single();
        if (error) throw error;
        await logActivity({
          entity_type: "customer",
          entity_id: data.id,
          customer_id: data.id,
          action: "created",
          description: `Added customer ${payload.name}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Customer saved");
      void qc.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-company">Company</Label>
          <Input id="c-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-status">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger id="c-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-address">Address</Label>
          <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-notes">Notes</Label>
        <Textarea id="c-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" disabled={save.isPending} className="w-full">
        Save customer
      </Button>
    </form>
  );
}

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (row: CustomerRow) => {
      const { data: deletedRows, error } = await supabase.from("customers").delete().eq("id", row.id).select();
      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) return;
      await logActivity({
        entity_type: "customer",
        entity_id: row.id,
        action: "deleted",
        description: `Deleted customer ${row.name}`,
      });
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: () => toast.error("You do not have permission to delete this customer"),
    onSettled: () => setDeletingId(null),
  });

  const term = search.trim().toLowerCase().slice(0, 80);
  const rows = data.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (term === "" ||
        [c.name, c.email, c.company, c.phone].some((f) => (f ?? "").toLowerCase().includes(term))),
  );

  return (
    <AppShell
      title="Customers"
      actions={
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> New customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Add customer</DialogTitle>
            </DialogHeader>
            <CustomerForm onDone={() => setAdding(false)} />
          </DialogContent>
        </Dialog>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, company…"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && (
          <Card className="shadow-soft">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">No customers found.</CardContent>
          </Card>
        )}
        {rows.map((c) => (
          <Card key={c.id} className="shadow-soft transition-shadow hover:shadow-lg">
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-48 flex-1">
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: c.id }}
                  className="font-display font-semibold hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-muted-foreground">{c.company || "—"}</p>
              </div>
              <div className="min-w-48 text-sm text-muted-foreground">
                <p>{c.email || "No email"}</p>
                <p>{c.phone || "No phone"}</p>
              </div>
              <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">
                {c.status}
              </Badge>
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Edit customer" onClick={() => setEditing(c)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete customer"
                  disabled={deletingId === c.id}
                  onClick={() => {
                    if (deletingId) return;
                    setDeletingId(c.id);
                    remove.mutate(c);
                  }}
                >
                  {deletingId === c.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Edit customer</DialogTitle>
          </DialogHeader>
          {editing && <CustomerForm initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
