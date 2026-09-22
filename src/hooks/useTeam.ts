import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeamMember = { id: string; full_name: string; email: string; role: string | null };

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<TeamMember[]> => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? [])
        .filter((p) => roleMap.has(p.id))
        .map((p) => ({
          ...p,
          role: roleMap.get(p.id) ?? null,
        }));
    },
  });
}

export function memberName(team: TeamMember[] | undefined, id: string | null | undefined) {
  if (!id) return "Unassigned";
  return team?.find((m) => m.id === id)?.full_name ?? "Unknown";
}
