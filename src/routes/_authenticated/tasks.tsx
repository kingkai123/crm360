import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logActivity, notify } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";
import { useTeam, memberName } from "@/hooks/useTeam";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — CRM360" },
      { name: "description", content: "Assign tasks with due dates and priorities, and track what is overdue." },
      { property: "og:title", content: "Tasks — CRM360" },
      { property: "og:description", content: "Team task management with due dates, priorities and status." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: team } = useTeam();
  const [adding, setAdding] = useState(false);
  const [assignee, setAssignee] = useState("all");
  const [view, setView] = useState("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    assigned_to: "",
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const title = form.title.trim().slice(0, 120);
      if (title.length < 2) throw new Error("Task title is required");
      const target = form.assigned_to || user!.id;
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          description: form.description.trim().slice(0, 1000) || null,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
          priority: form.priority as never,
          assigned_to: target,
          created_by: user!.id,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        entity_type: "task",
        entity_id: data.id,
        action: "created",
        description: `Created task “${title}”`,
      });
      if (target !== user!.id) await notify(target, "New task assigned", title, "/tasks");
    },
    onSuccess: () => {
      toast.success("Task created");
      setForm({ title: "", description: "", due_date: "", priority: "medium", assigned_to: "" });
      setAdding(false);
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (task: (typeof data)[number]) => {
      const done = task.status !== "completed";
      const { error } = await supabase
        .from("tasks")
        .update({ status: done ? "completed" : "pending", completed_at: done ? new Date().toISOString() : null })
        .eq("id", task.id);
      if (error) throw error;
      await logActivity({
        entity_type: "task",
        entity_id: task.id,
        action: done ? "completed" : "reopened",
        description: `${done ? "Completed" : "Reopened"} task “${task.title}”`,
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast.error("Could not update this task"),
    onSettled: () => setTogglingId(null),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: deletedRows, error } = await supabase.from("tasks").delete().eq("id", id).select();
      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) return;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("You cannot delete this task"),
    onSettled: () => setDeletingId(null),
  });

  const now = Date.now();
  const rows = data.filter((t) => {
    if (assignee !== "all" && t.assigned_to !== assignee) return false;
    if (view === "open") return t.status !== "completed";
    if (view === "completed") return t.status === "completed";
    if (view === "overdue") return t.status !== "completed" && t.due_date && new Date(t.due_date).getTime() < now;
    return true;
  });

  return (
    <AppShell
      title="Tasks"
      actions={
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> New task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create task</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="t-title">Title</Label>
                <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-desc">Description</Label>
                <Textarea id="t-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-due">Due date</Label>
                  <Input id="t-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-priority">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger id="t-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-assignee">Assign to</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger id="t-assignee">
                    <SelectValue placeholder="Myself" />
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
              <Button type="submit" className="w-full" disabled={create.isPending}>
                Create task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={view} onValueChange={setView}>
          <SelectTrigger className="w-44" aria-label="Filter tasks">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tasks</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-56" aria-label="Filter by assignee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {(team ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && (
          <Card className="shadow-soft">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">No tasks here.</CardContent>
          </Card>
        )}
        {rows.map((t) => {
          const overdue = t.status !== "completed" && t.due_date && new Date(t.due_date).getTime() < now;
          return (
            <Card key={t.id} className="shadow-soft">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <Checkbox
                  checked={t.status === "completed"}
                  disabled={togglingId === t.id}
                  onCheckedChange={() => {
                    if (togglingId) return;
                    setTogglingId(t.id);
                    toggle.mutate(t);
                  }}
                  aria-label={`Mark ${t.title} complete`}
                />
                <div className="min-w-52 flex-1">
                  <p className={`font-medium ${t.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                    {t.title}
                  </p>
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                </div>
                <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="capitalize">
                  {t.priority}
                </Badge>
                {t.due_date && (
                  <Badge variant={overdue ? "destructive" : "outline"}>
                    {overdue ? "Overdue · " : "Due "}
                    {new Date(t.due_date).toLocaleDateString()}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">{memberName(team, t.assigned_to)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete task"
                  disabled={deletingId === t.id}
                  onClick={() => {
                    if (deletingId) return;
                    setDeletingId(t.id);
                    remove.mutate(t.id);
                  }}
                >
                  {deletingId === t.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
