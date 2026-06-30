import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTemplates, upsertTemplate, deleteTemplate, type TemplateKind } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/templates")({
  head: () => ({ meta: [{ title: "Templates — FinAssist AI" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: () => listTemplates() });
  const [editing, setEditing] = useState<{ id?: string; kind: TemplateKind; title: string; body: string }>({
    kind: "email", title: "", body: "",
  });

  const save = useMutation({
    mutationFn: () =>
      upsertTemplate({
        data: { id: editing.id, kind: editing.kind, title: editing.title, body: editing.body, tags: [] },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setEditing({ kind: "email", title: "", body: "" });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="space-y-3 p-5">
        <h1 className="font-display text-xl font-bold">{editing.id ? "Edit template" : "New template"}</h1>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Kind</Label>
            <Select value={editing.kind} onValueChange={(v) => setEditing((e) => ({ ...e, kind: v as TemplateKind }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting notes</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="client_comm">Client communication</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={editing.title} onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label>Body</Label>
          <Textarea rows={14} value={editing.body} onChange={(e) => setEditing((s) => ({ ...s, body: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={!editing.title || !editing.body || save.isPending} className="bg-gradient-brand">
            <Plus className="mr-2 h-4 w-4" /> {editing.id ? "Update" : "Create"}
          </Button>
          {editing.id && <Button variant="outline" onClick={() => setEditing({ kind: "email", title: "", body: "" })}>New</Button>}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Library</h2>
        {templates.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (templates.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates yet — create one on the left.</p>
        ) : (
          <ul className="space-y-2">
            {(templates.data ?? []).map((t: { id: string; kind: TemplateKind; title: string; body: string }) => (
              <li key={t.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-primary">{t.kind}</div>
                    <div className="truncate font-medium">{t.title}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(t.body); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ id: t.id, kind: t.kind, title: t.title, body: t.body })}><Plus className="h-4 w-4 rotate-45" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
