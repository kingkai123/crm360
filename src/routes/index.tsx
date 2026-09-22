import { createFileRoute, Link } from "@tanstack/react-router";
import { KanbanSquare, Users, CheckSquare, BellRing, ShieldCheck, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRM360 — SaaS customer relationship platform" },
      {
        name: "description",
        content:
          "CRM360 keeps customers, leads, pipeline and follow-up tasks in one secure workspace with role-based access.",
      },
      { property: "og:title", content: "CRM360 — SaaS customer relationship platform" },
      {
        property: "og:description",
        content: "Manage customers, leads, an interactive sales pipeline and team tasks in one place.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Users, title: "Customer records", text: "A single directory with full interaction history for every account." },
  { icon: KanbanSquare, title: "Drag-and-drop pipeline", text: "Move deals through six stages and see value at a glance." },
  { icon: CheckSquare, title: "Tasks & follow-ups", text: "Assign work with due dates, priorities and overdue filters." },
  { icon: BellRing, title: "Live notifications", text: "Instant alerts for assignments, stage changes and deadlines." },
  { icon: ShieldCheck, title: "Role-based access", text: "Admin, Sales Manager and Sales Executive see exactly what they should." },
  { icon: LineChart, title: "Dashboards", text: "Revenue, active leads and pending work in one overview." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-brand text-primary-foreground">
            <span className="font-display text-sm font-bold">C3</span>
          </div>
          <span className="font-display text-lg font-bold">CRM360</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-16 text-center">
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
            Every customer, lead and follow-up in one calm workspace.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            CRM360 replaces the spreadsheets and chat threads small sales teams rely on, with a secure platform for
            customer records, pipeline tracking and daily task management.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open the workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="shadow-soft">
              <CardContent className="p-6">
                <div className="mb-4 grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </div>
                <h2 className="font-display text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
