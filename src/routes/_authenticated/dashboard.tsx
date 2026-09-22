import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Target, CheckSquare, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGES, currency, stageLabel, getActivityCutoff } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CRM360" },
      { name: "description", content: "Live view of customers, active leads, pending tasks and closed revenue." },
      { property: "og:title", content: "Dashboard — CRM360" },
      { property: "og:description", content: "Live view of your sales performance in CRM360." },
    ],
  }),
  component: Dashboard,
});

function Kpi({ label, value, icon: Icon, hint }: { label: string; value: string; icon: typeof Users; hint?: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [customers, leads, tasks, activities] = await Promise.all([
        supabase.from("customers").select("id"),
        supabase.from("leads").select("id, stage, value, created_at"),
        supabase.from("tasks").select("id, status, due_date"),
        supabase
          .from("activities")
          .select("*")
          .gt("created_at", getActivityCutoff())
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      return {
        customers: customers.data ?? [],
        leads: leads.data ?? [],
        tasks: tasks.data ?? [],
        activities: activities.data ?? [],
      };
    },
  });

  const leads = data?.leads ?? [];
  const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.stage));
  const won = leads.filter((l) => l.stage === "won");
  const pendingTasks = (data?.tasks ?? []).filter((t) => t.status !== "completed");

  const stageData = STAGES.map((s) => ({
    stage: s.label,
    count: leads.filter((l) => l.stage === s.id).length,
    value: leads.filter((l) => l.stage === s.id).reduce((a, l) => a + Number(l.value), 0),
  }));

  const pieColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "var(--color-muted-foreground)"];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total customers" value={String(data?.customers.length ?? 0)} icon={Users} />
        <Kpi label="Active leads" value={String(activeLeads.length)} icon={Target} hint={`${leads.length} total`} />
        <Kpi label="Pending tasks" value={String(pendingTasks.length)} icon={CheckSquare} />
        <Kpi
          label="Closed revenue"
          value={currency(won.reduce((a, l) => a + Number(l.value), 0))}
          icon={TrendingUp}
          hint={`${won.length} deals won`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Pipeline value by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-card-foreground)",
                  }}
                  formatter={(v: number) => currency(v)}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-base">Leads by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageData} dataKey="count" nameKey="stage" innerRadius={50} outerRadius={85}>
                  {stageData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-base">Recent activity</CardTitle>
            <Link to="/activity" className="text-sm text-muted-foreground underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.activities ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
            {(data?.activities ?? []).map((a) => (
              <div key={a.id} className="flex gap-3 border-l-2 border-primary/40 pl-3">
                <div>
                  <p className="text-sm">{a.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-base">Stage breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STAGES.map((s) => {
              const count = leads.filter((l) => l.stage === s.id).length;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm">{stageLabel(s.id)}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
