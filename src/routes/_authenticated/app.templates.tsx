import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTemplates,
  upsertTemplate,
  deleteTemplate,
  listTemplateVersions,
  restoreTemplateVersion,
  deleteTemplateVersion,
  type TemplateKind,
} from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/templates")({
  head: () => ({ meta: [{ title: "Templates — FinAssist AI" }] }),
  component: TemplatesPage,
});

type Template = {
  id: string;
  kind: TemplateKind;
  title: string;
  body: string;
  tags: string[] | null;
  updated_at: string;
  created_at: string;
};

const KIND_LABELS: Record<TemplateKind, string> = {
  email: "Email",
  meeting: "Meeting notes",
  report: "Report",
  client_comm: "Client comm",
};

const KIND_FILTERS: (TemplateKind | "all")[] = [
  "all",
  "email",
  "report",
  "meeting",
  "client_comm",
];

function emptyDraft(): { id?: string; kind: TemplateKind; title: string; body: string; tags: string[] } {
  return { kind: "email", title: "", body: "", tags: [] };
}

function TemplatesPage() {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: () => listTemplates() });

  const [filter, setFilter] = useState<TemplateKind | "all">("all");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [tagInput, setTagInput] = useState("");
  const [historyFor, setHistoryFor] = useState<Template | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);

  const items = (templates.data ?? []) as Template[];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((t) => {
      if (filter !== "all" && t.kind !== filter) return false;
      if (!s) return true;
      return (
        t.title.toLowerCase().includes(s) ||
        t.body.toLowerCase().includes(s) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(s))
      );
    });
  }, [items, filter, search]);

  const save = useMutation({
    mutationFn: () =>
      upsertTemplate({
        data: {
          id: draft.id,
          kind: draft.kind,
          title: draft.title,
          body: draft.body,
          tags: draft.tags,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success(draft.id ? "Template updated" : "Template created");
      setEditorOpen(false);
      setDraft(emptyDraft());
      setTagInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setDraft(emptyDraft());
    setTagInput("");
    setEditorOpen(true);
  };

  const openEdit = (t: Template) => {
    setDraft({ id: t.id, kind: t.kind, title: t.title, body: t.body, tags: t.tags ?? [] });
    setTagInput("");
    setEditorOpen(true);
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (draft.tags.includes(v)) return;
    setDraft((d) => ({ ...d, tags: [...d.tags, v] }));
    setTagInput("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Template Library</h1>
          <p className="text-sm text-muted-foreground">
            Reusable snippets for emails, meetings, reports and client communications — with version history.
          </p>
        </div>
        <Button onClick={openNew} className="bg-gradient-brand">
          <Plus className="mr-2 h-4 w-4" /> New template
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, body or tag"
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as TemplateKind | "all")}>
            <TabsList>
              {KIND_FILTERS.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {k === "all" ? "All" : KIND_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {templates.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "No templates yet — create your first one."
              : "No templates match your filters."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {KIND_LABELS[t.kind]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(t.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="truncate font-medium">{t.title}</h3>
                </div>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {t.body}
              </p>
              {(t.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(t.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap justify-end gap-1 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(t.body);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="mr-1 h-4 w-4" /> Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setHistoryFor(t)}>
                  <History className="mr-1 h-4 w-4" /> History
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(t)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>
              {draft.id
                ? "Changes are saved as a new version — previous versions stay in history."
                : "Create a reusable template for your workflow."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Kind</Label>
                <Select
                  value={draft.kind}
                  onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as TemplateKind }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(KIND_LABELS) as TemplateKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Annual review — client welcome"
                />
              </div>
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                rows={12}
                value={draft.body}
                onChange={(e) => setDraft((s) => ({ ...s, body: e.target.value }))}
                placeholder="Write the template content. Use placeholders like {{client_name}}."
              />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {draft.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {draft.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, tags: d.tags.filter((x) => x !== tag) }))
                        }
                        className="rounded-full hover:bg-muted-foreground/20"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!draft.title || !draft.body || save.isPending}
              className="bg-gradient-brand"
            >
              <Save className="mr-2 h-4 w-4" />
              {save.isPending ? "Saving…" : draft.id ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version history dialog */}
      <VersionHistoryDialog
        template={historyFor}
        onClose={() => setHistoryFor(null)}
        onRestored={() => qc.invalidateQueries({ queryKey: ["templates"] })}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" and all of its version history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Version = {
  id: string;
  template_id: string;
  version: number;
  kind: TemplateKind;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string;
};

function VersionHistoryDialog({
  template,
  onClose,
  onRestored,
}: {
  template: Template | null;
  onClose: () => void;
  onRestored: () => void;
}) {
  const qc = useQueryClient();
  const enabled = !!template;
  const versions = useQuery({
    queryKey: ["template-versions", template?.id],
    queryFn: () => listTemplateVersions({ data: { templateId: template!.id } }),
    enabled,
  });
  const [preview, setPreview] = useState<Version | null>(null);

  const restore = useMutation({
    mutationFn: (v: Version) =>
      restoreTemplateVersion({ data: { templateId: v.template_id, versionId: v.id } }),
    onSuccess: () => {
      toast.success("Version restored — current content saved as a new version");
      qc.invalidateQueries({ queryKey: ["template-versions", template?.id] });
      onRestored();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeVersion = useMutation({
    mutationFn: (v: Version) => deleteTemplateVersion({ data: { versionId: v.id } }),
    onSuccess: () => {
      toast.success("Version deleted");
      qc.invalidateQueries({ queryKey: ["template-versions", template?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (versions.data ?? []) as Version[];

  return (
    <Dialog open={enabled} onOpenChange={(o) => !o && (setPreview(null), onClose())}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {template?.title} — each save creates a snapshot of the previous version.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-4 overflow-hidden md:grid-cols-[240px_1fr]">
          <div className="overflow-y-auto rounded-lg border border-border">
            {versions.isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : list.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No prior versions yet. Edit the template to start building history.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setPreview(v)}
                      className={`flex w-full flex-col items-start gap-0.5 p-3 text-left text-sm hover:bg-muted/50 ${
                        preview?.id === v.id ? "bg-muted/60" : ""
                      }`}
                    >
                      <span className="font-medium">Version {v.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {v.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-h-[300px] flex-col overflow-hidden rounded-lg border border-border">
            {preview ? (
              <>
                <div className="flex items-center justify-between border-b border-border p-3">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Version {preview.version} · {new Date(preview.created_at).toLocaleString()}
                    </div>
                    <div className="font-medium">{preview.title}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restore.mutate(preview)}
                      disabled={restore.isPending}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" /> Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        removeVersion.mutate(preview);
                        setPreview(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <pre className="flex-1 overflow-auto whitespace-pre-wrap p-3 font-sans text-sm">
                  {preview.body}
                </pre>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => (setPreview(null), onClose())}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
