import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Target,
  KanbanSquare,
  CheckSquare,
  History,
  UserCog,
  Moon,
  Sun,
  LogOut,
  Menu,
  CircleUser,
} from "lucide-react";
import { useAuth, roleLabel } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notification-bell";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/leads", label: "Leads", icon: Target },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/activity", label: "Activity", icon: History },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isPrivileged, role } = useAuth();
  const items = [...NAV, ...(role === "admin" ? [{ to: "/team", label: "Team", icon: UserCog } as const] : [])];
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
      {isPrivileged && (
        <p className="mt-4 px-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          Team-wide visibility enabled
        </p>
      )}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="grid size-9 place-items-center rounded-xl bg-brand text-primary-foreground">
        <span className="font-display text-sm font-bold">C3</span>
      </div>
      <div>
        <p className="font-display text-base font-bold leading-none">CRM360</p>
        <p className="text-[11px] text-muted-foreground">Sales workspace</p>
      </div>
    </div>
  );
}

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-sidebar-accent"
        >
          <CircleUser className="size-8 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.full_name || "Profile"}</p>
            <p className="truncate text-xs text-muted-foreground">{role ? roleLabel[role] : "—"}</p>
          </div>
        </Link>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <div className="mt-8">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="font-display text-lg font-semibold">{title}</h1>
          {role && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {roleLabel[role]}
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-1">
            {actions}
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggle}
              className="min-h-11 min-w-11"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut} className="min-h-11 min-w-11">
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
