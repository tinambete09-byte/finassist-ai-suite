import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Sparkles,
  LayoutDashboard,
  Mail,
  FileText,
  ListChecks,
  ClipboardList,
  MessageSquare,
  Library,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { toast } from "sonner";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/email", label: "Email Assistant", icon: Mail },
  { to: "/app/summariser", label: "Summariser", icon: FileText },
  { to: "/app/tasks", label: "Task Planner", icon: ListChecks },
  { to: "/app/reports", label: "Client Reports", icon: ClipboardList },
  { to: "/app/knowledge", label: "Knowledge", icon: MessageSquare },
  { to: "/app/templates", label: "Templates", icon: Library },
] as const;

export function AppShell({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/60 glass">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-r border-sidebar-border bg-sidebar p-0">
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate font-display text-sm font-semibold text-muted-foreground">
                FinAssist AI
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <Link to="/app" onClick={onNavigate} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display font-bold tracking-tight">FinAssist AI</span>
        </Link>
        {onNavigate && (
          <Button variant="ghost" size="icon" onClick={onNavigate} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? loc.pathname === item.to
            : loc.pathname === item.to || loc.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-gradient-brand text-primary-foreground shadow-brand"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
        General information only — not regulated financial advice.
      </div>
    </div>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .toString()
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-primary-foreground">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/app/profile" })}>
          <UserCircle className="mr-2 h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out");
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
