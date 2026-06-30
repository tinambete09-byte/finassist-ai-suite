import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, upsertTask, deleteTask } from "@/lib/data.functions";
import { aiSuggestTasks } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — FinAssist AI" }] }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  client_name: string | null;
  category: string | null;
};

function TasksPage() {
  const qc = useQueryClient();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => listTasks() });

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [aiCtx, setAiCtx] = useState("");

  const add = useMutation({
    mutationFn: () =>
      upsertTask({
        data: {
          title,
          client_name: client || null,
          due_date: due || null,
          priority,
          status: "todo",
          category: "client-review",
        },
      }),
    onSuccess: () => {
      setTitle(""); setClient(""); setDue("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: Task["status"] }) =>
      upsertTask({ data: { id: vars.id, status: vars.status, title: " ", priority: "medium" as const } as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const aiSuggest = useMutation({
    mutationFn: () => aiSuggestTasks({ data: { context: aiCtx } }),
    onSuccess: async (d) => {
      for (const t of d.tasks) {
        const due = t.due_in_days
          ? new Date(Date.now() + t.due_in_days * 86400000).toISOString().slice(0, 10)
          : null;
        await upsertTask({ data: { title: t.title, notes: t.notes, priority: t.priority, status: "todo", category: t.category, due_date: due } });
      }
      toast.success(`Added ${d.tasks.length} tasks`);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: { key: Task["status"]; label: string }[] = [
    { key: "todo", label: "To do" },
    { key: "in_progress", label: "In progress" },
    { key: "done", label: "Done" },
  ];
  const all: Task[] = (tasks.data ?? []) as Task[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">AI Task Planner</h1>
        <p className="text-sm text-muted-foreground">Client reviews, compliance, and admin in one pipeline.</p>
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto_auto] md:items-end">
          <div>
            <Label>Task</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prepare annual review pack" />
          </div>
          <div>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Naidoo Family Trust" />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => add.mutate()} disabled={!title || add.isPending} className="bg-gradient-brand">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 inline-flex items-center gap-1 font-display text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI suggest tasks</h2>
        <p className="text-xs text-muted-foreground">Paste meeting notes or a client situation — AI will propose tasks.</p>
        <Textarea className="mt-2" rows={3} value={aiCtx} onChange={(e) => setAiCtx(e.target.value)} placeholder="E.g. Client wants to consolidate three RAs; FICA expires next month; needs Reg 28 review." />
        <Button className="mt-2" variant="outline" onClick={() => aiSuggest.mutate()} disabled={aiSuggest.isPending || aiCtx.trim().length < 5}>
          {aiSuggest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Suggest
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((col) => {
          const items = all.filter((t) => t.status === col.key);
          return (
            <Card key={col.key} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display font-semibold">{col.label}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{items.length}</span>
              </div>
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.client_name ? `${t.client_name} · ` : ""}
                          {t.due_date ? `due ${t.due_date}` : "no date"}
                          {t.category ? ` · ${t.category}` : ""}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${t.priority === "high" ? "bg-destructive/15 text-destructive" : t.priority === "medium" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{t.priority}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Select
                        value={t.status}
                        onValueChange={(v) => setStatus.mutate({ id: t.id, status: v as Task["status"] })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To do</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)} aria-label="Delete task">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="text-xs text-muted-foreground">Nothing here.</li>}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
