import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const unread = data.filter((n) => !n.is_read).length;

  const markAll = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative min-h-11 min-w-11">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-display text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>}
          {data.map((n) => (
            <div key={n.id} className="border-b px-4 py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.is_read && <Badge variant="secondary">new</Badge>}
              </div>
              {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t p-2">
          <Link to="/activity" className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
            View activity log
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
