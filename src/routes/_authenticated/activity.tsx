import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeam, memberName } from "@/hooks/useTeam";
import { getActivityCutoff, clearActivityLog } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity log — CRM360" },
      { name: "description", content: "Audit trail of every customer, lead and task change in CRM360." },
      { property: "og:title", content: "Activity log — CRM360" },
      { property: "og:description", content: "Audit trail of key events across your sales workspace." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const qc = useQueryClient();
  const { data: team } = useTeam();
  const { data = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .gt("created_at", getActivityCutoff())
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const handleClear = () => {
    clearActivityLog();
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Activity log cleared");
  };

  return (
    <AppShell
      title="Activity log"
      actions={
        data.length > 0 ? (
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-2 text-xs">
            <Trash2 className="size-3.5" />
            Clear log
          </Button>
        ) : null
      }
    >
      <Card className="shadow-soft">
        <CardContent className="p-0">
          {data.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No activity yet.</p>}
          <ol className="divide-y">
            {data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Badge variant="outline" className="capitalize">
                  {a.entity_type}
                </Badge>
                <span className="text-sm">{a.description}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {memberName(team, a.actor_id)} · {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </AppShell>
  );
}
