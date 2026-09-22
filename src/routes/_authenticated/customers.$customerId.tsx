import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Building2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logActivity, currency, stageLabel } from "@/lib/crm";
import { useTeam, memberName } from "@/hooks/useTeam";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer detail — CRM360" },
      { name: "description", content: "Full customer profile with linked leads, tasks and interaction history." },
      { property: "og:title", content: "Customer detail — CRM360" },
      { property: "og:description", content: "Full customer profile and interaction timeline." },
    ],
  }),
  component: CustomerDetail,
  errorComponent: ({ error }) => <p role="alert" className="p-8">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Customer not found.</p>,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const qc = useQueryClient();
  const { data: team } = useTeam();
  const [note, setNote] = useState("");

  const { data } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const [customer, leads, tasks, activities] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
        supabase.from("leads").select("*").eq("customer_id", customerId),
        supabase.from("tasks").select("*").eq("customer_id", customerId),
        supabase
          .from("activities")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      ]);
      return {
        customer: customer.data,
        leads: leads.data ?? [],
        tasks: tasks.data ?? [],
        activities: activities.data ?? [],
      };
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const text = note.trim().slice(0, 1000);
      if (!text) throw new Error("Write something first");
      await logActivity({
        entity_type: "customer",
        entity_id: customerId,
        customer_id: customerId,
        action: "note",
        description: text,
      });
    },
    onSuccess: () => {
      setNote("");
      toast.success("Interaction logged");
      void qc.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = data?.customer;

  return (
    <AppShell title={c?.name ?? "Customer"}>
      <Link to="/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      {!c && <p className="text-sm text-muted-foreground">Loading customer…</p>}

      {c && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="font-display">{c.name}</CardTitle>
                <Badge variant="secondary" className="w-fit capitalize">
                  {c.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" /> {c.company || "—"}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" /> {c.email || "—"}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" /> {c.phone || "—"}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" /> {c.address || "—"}
                </p>
                <p className="text-muted-foreground">Owner: {memberName(team, c.owner_id)}</p>
                {c.notes && <p className="rounded-lg bg-muted p-3">{c.notes}</p>}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-base">Linked leads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.leads.length === 0 && <p className="text-muted-foreground">No linked leads.</p>}
                {data.leads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span>{l.title}</span>
                    <Badge variant="outline">{stageLabel(l.stage)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-base">Open tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.tasks.length === 0 && <p className="text-muted-foreground">No tasks.</p>}
                {data.tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span>{t.title}</span>
                    <Badge variant="outline" className="capitalize">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-soft lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-base">Interaction history</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-2">
                <Textarea
                  placeholder="Log a call, meeting or email…"
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button size="sm" onClick={() => addNote.mutate()} disabled={addNote.isPending}>
                  Log interaction
                </Button>
              </div>
              <ol className="space-y-4">
                {data.activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing logged for this customer yet.</p>
                )}
                {data.activities.map((a) => (
                  <li key={a.id} className="relative border-l-2 border-primary/40 pl-4">
                    <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
                    <p className="text-sm">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {memberName(team, a.actor_id)} · {new Date(a.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
