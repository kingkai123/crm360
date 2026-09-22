import { supabase } from "@/integrations/supabase/client";

export const STAGES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

export const stageLabel = (s: string) => STAGES.find((x) => x.id === s)?.label ?? s;

export const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

export const ACTIVITY_RESET_BASELINE = "2026-09-22T17:00:00.000Z";

export function getActivityCutoff(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("crm360_activities_cleared_at");
    if (saved && saved > ACTIVITY_RESET_BASELINE) {
      return saved;
    }
  }
  return ACTIVITY_RESET_BASELINE;
}

export function clearActivityLog(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("crm360_activities_cleared_at", new Date().toISOString());
  }
}

const recentActivityLogs = new Map<string, number>();

export async function logActivity(input: {
  entity_type: string;
  entity_id?: string | null;
  action: string;
  description: string;
  customer_id?: string | null;
  lead_id?: string | null;
}) {
  const now = Date.now();
  const key = `${input.entity_type}:${input.entity_id ?? ""}:${input.action}:${input.description}`;
  const lastTime = recentActivityLogs.get(key);
  if (lastTime && now - lastTime < 3000) {
    return;
  }
  recentActivityLogs.set(key, now);
  if (recentActivityLogs.size > 100) {
    for (const [k, t] of recentActivityLogs.entries()) {
      if (now - t > 10000) recentActivityLogs.delete(k);
    }
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("activities").insert({
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    action: input.action,
    description: input.description,
    customer_id: input.customer_id ?? null,
    lead_id: input.lead_id ?? null,
    actor_id: data.user.id,
  });
}

export async function notify(userId: string | null | undefined, title: string, body?: string, link?: string) {
  if (!userId) return;
  await supabase.from("notifications").insert({ user_id: userId, title, body: body ?? null, link: link ?? null });
}
