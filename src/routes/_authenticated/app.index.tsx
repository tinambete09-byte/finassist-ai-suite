import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { dashboardStats } from "@/lib/data.functions";
import { Card } from "@/components/ui/card";
import {
  Mail, FileText, ListChecks, ClipboardList, MessageSquare, Library, ArrowRight, ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statsQuery = queryOptions({
  queryKey: ["dashboardStats"],
  queryFn: () => dashboardStats(),
});

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard — FinAssist AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: Dashboard,
  errorComponent: ({ error, reset }) => (
    <div className="p-6 text-sm text-destructive">
      Could not load dashboard: {error.message}
      <button onClick={reset} className="ml-2 underline">retry</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const TOOLS = [
  { to: "/app/email", label: "Email Assistant", icon: Mail, hint: "Draft & rewrite" },
  { to: "/app/summariser", label: "Summariser", icon: FileText, hint: "Notes → actions" },
  { to: "/app/tasks", label: "Task Planner", icon: ListChecks, hint: "Pipeline & due dates" },
  { to: "/app/reports", label: "Client Reports", icon: ClipboardList, hint: "Review packs" },
  { to: "/app/knowledge", label: "Knowledge", icon: MessageSquare, hint: "Ask FinAssist" },
  { to: "/app/templates", label: "Templates", icon: Library, hint: "Reusable copy" },
];

function Dashboard() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(statsQuery);
  void qc;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Good day.</h1>
        <p className="text-sm text-muted-foreground">
          Your practice productivity hub — AI-assisted, SA-aware.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open tasks" value={data.counts.openTasks} />
        <StatCard label="Drafts (7d)" value={data.counts.weeklyDrafts} />
        <StatCard label="Summaries (7d)" value={data.counts.weeklySummaries} />
        <StatCard label="Reports (7d)" value={data.counts.weeklyReports} />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Quick tools</h2>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-success" /> Responsible AI
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-brand"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Upcoming tasks</h2>
          {data.upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks. <Link to="/app/tasks" className="text-primary underline">Plan some</Link>.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingTasks.map((t: { id: string; title: string; due_date: string | null; priority: string; client_name: string | null }) => (
                <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.client_name ? `${t.client_name} · ` : ""}
                      {t.due_date ? `due ${t.due_date}` : "no due date"}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Recent activity</h2>
          {data.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Activity from your tools will appear here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.activity.map((a: { id: string; kind: string; summary: string; created_at: string }) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="truncate"><span className="mr-2 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">{a.kind}</span>{a.summary}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: "bg-destructive/15 text-destructive",
    medium: "bg-warning/15 text-warning",
    low: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${map[priority] ?? map.low}`}>{priority}</span>;
}
