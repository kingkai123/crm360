import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, UserPlus2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STAGES, currency, logActivity, notify, stageLabel, type Stage } from "@/lib/crm";
import { useTeam, memberName } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Sales pipeline — CRM360" },
      { name: "description", content: "Drag and drop deals across New, Contacted, Qualified, Proposal Sent, Won and Lost." },
      { property: "og:title", content: "Sales pipeline — CRM360" },
      { property: "og:description", content: "An interactive Kanban board for your entire sales pipeline." },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: team } = useTeam();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const lead = data.find((l) => l.id === id);
      if (!lead || lead.stage === stage) return;
      const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
      if (error) throw error;
      await logActivity({
        entity_type: "lead",
        entity_id: id,
        lead_id: id,
        action: "stage_changed",
        description: `Moved “${lead.title}” from ${stageLabel(lead.stage)} to ${stageLabel(stage)}`,
      });
      if (lead.assigned_to && lead.assigned_to !== user?.id) {
        await notify(lead.assigned_to, "Lead stage updated", `${lead.title} → ${stageLabel(stage)}`, "/pipeline");
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => toast.error("You cannot move this deal"),
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
          created_by: user!.id,
          owner_id: lead.assigned_to ?? user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("leads").update({ is_converted: true, customer_id: customer.id }).eq("id", lead.id);
      await logActivity({
        entity_type: "lead",
        entity_id: lead.id,
        lead_id: lead.id,
        customer_id: customer.id,
        action: "converted",
        description: `Converted “${lead.title}” into customer ${customer.name}`,
      });
    },
    onSuccess: () => {
      toast.success("Converted to customer");
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: () => toast.error("Conversion failed"),
  });

  return (
    <AppShell title="Sales pipeline">
      <p className="mb-4 text-sm text-muted-foreground">Drag a deal card into another column to change its stage.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {STAGES.map((stage) => {
          const cards = data.filter((l) => l.stage === stage.id);
          const total = cards.reduce((a, l) => a + Number(l.value), 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage.id);
              }}
              onDragLeave={() => setOver((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) move.mutate({ id: dragging, stage: stage.id });
                setDragging(null);
              }}
              className={`flex min-h-64 flex-col rounded-xl border bg-card p-3 transition-colors ${
                over === stage.id ? "border-primary bg-accent/40" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-sm font-semibold">{stage.label}</p>
                <Badge variant="secondary">{cards.length}</Badge>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{currency(total)}</p>
              <div className="flex flex-1 flex-col gap-2">
                {cards.map((l) => (
                  <article
                    key={l.id}
                    draggable
                    onDragStart={() => setDragging(l.id)}
                    onDragEnd={() => setDragging(null)}
                    className={`cursor-grab rounded-lg border bg-background p-3 shadow-soft active:cursor-grabbing ${
                      dragging === l.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{l.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.contact_name}</p>
                        <p className="mt-1 text-sm font-medium">{currency(Number(l.value))}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{memberName(team, l.assigned_to)}</p>
                        {!l.is_converted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-7 px-2 text-xs"
                            onClick={() => convert.mutate(l)}
                          >
                            <UserPlus2 className="mr-1 size-3" /> Convert
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Drop deals here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
