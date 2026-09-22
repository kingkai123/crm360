import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, UserPlus2, Trash2, Loader2 } from "lucide-react";
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
import { STAGES, currency, logActivity, notify, stageLabel } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";
import { useTeam, memberName } from "@/hooks/useTeam";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — CRM360" },
      { name: "description", content: "Create leads, assign them to the team and convert winners into customers." },
      { property: "og:title", content: "Leads — CRM360" },
      { property: "og:description", content: "Track every lead from first touch to conversion." },
    ],
  }),
  component: LeadsPage,
});

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  contact_name: z.string().trim().min(2, "Contact name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255).or(z.literal("")),
  value: z.number().min(0).max(1_000_000_000),
});

function LeadForm({ onDone }: { onDone: () => void }) {
  const { user, isPrivileged } = useAuth();
  const { data: team } = useTeam();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    contact_name: "",
    email: "",
    phone: "",
    company: "",
    source: "website",
    value: "0",
    stage: "new",
    assigned_to: user?.id ?? "",
    notes: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ ...form, value: Number(form.value) });
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const { data, error } = await supabase
        .from("leads")
        .insert({
          title: parsed.data.title,
          contact_name: parsed.data.contact_name,
          email: parsed.data.email || null,
          phone: form.phone || null,
          company: form.company || null,
          source: form.source,
          value: Number(form.value),
          stage: form.stage as never,
          notes: form.notes || null,
          assigned_to: isPrivileged ? form.assigned_to || user!.id : user!.id,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        entity_type: "lead",
        entity_id: data.id,
        lead_id: data.id,
        action: "created",
        description: `Created lead “${data.title}” worth ${currency(Number(data.value))}`,
      });
      if (data.assigned_to && data.assigned_to !== user!.id) {
        await notify(data.assigned_to, "New lead assigned", `${data.title} was assigned to you`, "/leads");
      }
    },
    onSuccess: () => {
      toast.success("Lead created");
      void qc.invalidateQueries({ queryKey: ["leads"] });
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
          <Label htmlFor="l-title">Lead title</Label>
          <Input id="l-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-contact">Contact name</Label>
          <Input
            id="l-contact"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-email">Email</Label>
          <Input id="l-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-phone">Phone</Label>
          <Input id="l-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-company">Company</Label>
          <Input id="l-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-value">Deal value</Label>
          <Input
            id="l-value"
            type="number"
            min={0}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-stage">Stage</Label>
          <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
            <SelectTrigger id="l-stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-owner">Assigned to</Label>
          <Select
            value={form.assigned_to}
            onValueChange={(v) => setForm({ ...form, assigned_to: v })}
            disabled={!isPrivileged}
          >
            <SelectTrigger id="l-owner">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {(team ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="l-notes">Notes / follow-up</Label>
        <Textarea id="l-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        Create lead
      </Button>
    </form>
  );
}

function LeadsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: team } = useTeam();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [adding, setAdding] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const convert = useMutation({
    mutationFn: async (lead: (typeof data)[number]) => {
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: "active",
          notes: lead.notes,
          created_by: user!.id,
          owner_id: lead.assigned_to ?? user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: updateError } = await supabase
        .from("leads")
        .update({ is_converted: true, customer_id: customer.id, stage: "won" })
        .eq("id", lead.id);
      if (updateError) throw updateError;
      await logActivity({
        entity_type: "lead",
        entity_id: lead.id,
        lead_id: lead.id,
        customer_id: customer.id,
        action: "converted",
        description: `Converted lead “${lead.title}” into customer ${customer.name}`,
      });
      await notify(lead.assigned_to, "Lead converted", `${lead.title} is now a customer`, "/customers");
    },
    onSuccess: () => {
      toast.success("Lead converted to customer");
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: async ({ id, to, title }: { id: string; to: string; title: string }) => {
      const { error } = await supabase.from("leads").update({ assigned_to: to }).eq("id", id);
      if (error) throw error;
      await logActivity({
        entity_type: "lead",
        entity_id: id,
        lead_id: id,
        action: "assigned",
        description: `Assigned lead “${title}” to ${memberName(team, to)}`,
      });
      await notify(to, "Lead assigned to you", title, "/leads");
    },
    onSuccess: () => {
      toast.success("Lead reassigned");
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("Could not reassign this lead"),
  });

  const addNote = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const text = noteText.trim().slice(0, 1000);
      if (!text) throw new Error("Write a note first");
      await logActivity({
        entity_type: "lead",
        entity_id: id,
        lead_id: id,
        action: "note",
        description: `${title}: ${text}`,
      });
    },
    onSuccess: () => {
      setNoteFor(null);
      setNoteText("");
      toast.success("Note added");
      void qc.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: deletedRows, error } = await supabase.from("leads").delete().eq("id", id).select();
      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) return;
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("You cannot delete this lead"),
    onSettled: () => setDeletingId(null),
  });

  const term = search.trim().toLowerCase().slice(0, 80);
  const rows = data.filter(
    (l) =>
      (stage === "all" || l.stage === stage) &&
      (term === "" || [l.title, l.contact_name, l.company, l.email].some((f) => (f ?? "").toLowerCase().includes(term))),
  );

  return (
    <AppShell
      title="Leads"
      actions={
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> New lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Create lead</DialogTitle>
            </DialogHeader>
            <LeadForm onDone={() => setAdding(false)} />
          </DialogContent>
        </Dialog>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search leads…"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-48" aria-label="Filter by stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && (
          <Card className="shadow-soft">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">No leads yet.</CardContent>
          </Card>
        )}
        {rows.map((l) => (
          <Card key={l.id} className="shadow-soft">
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-52 flex-1">
                <p className="font-display font-semibold">{l.title}</p>
                <p className="text-sm text-muted-foreground">
                  {l.contact_name} · {l.company || "No company"}
                </p>
              </div>
              <Badge variant="outline">{stageLabel(l.stage)}</Badge>
              <p className="font-medium">{currency(Number(l.value))}</p>
              <Select
                value={l.assigned_to ?? ""}
                onValueChange={(v) => assign.mutate({ id: l.id, to: v, title: l.title })}
              >
                <SelectTrigger className="w-48" aria-label="Assign lead">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(team ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setNoteFor(l.id)}>
                  Note
                </Button>
                <Button
                  size="sm"
                  disabled={l.is_converted || convert.isPending}
                  onClick={() => convert.mutate(l)}
                >
                  <UserPlus2 className="mr-1 size-4" />
                  {l.is_converted ? "Converted" : "Convert"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete lead"
                  disabled={deletingId === l.id}
                  onClick={() => {
                    if (deletingId) return;
                    setDeletingId(l.id);
                    remove.mutate(l.id);
                  }}
                >
                  {deletingId === l.id ? (
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

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add follow-up note</DialogTitle>
          </DialogHeader>
          <Textarea value={noteText} maxLength={1000} onChange={(e) => setNoteText(e.target.value)} />
          <Button
            onClick={() => {
              const lead = data.find((l) => l.id === noteFor);
              if (lead) addNote.mutate({ id: lead.id, title: lead.title });
            }}
          >
            Save note
          </Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
