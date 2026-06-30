import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiSummarise } from "@/lib/ai.functions";
import { listSummaries } from "@/lib/data.functions";
import { upsertTask } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FileDown, ListPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Disclaimer } from "@/components/disclaimer";

export const Route = createFileRoute("/_authenticated/app/summariser")({
  head: () => ({ meta: [{ title: "Summariser — FinAssist AI" }] }),
  component: SummariserPage,
});

type Result = {
  summary: string;
  key_points: string[];
  action_items: Array<{ owner: string; task: string; deadline: string | null }>;
  risks: string[];
};

function SummariserPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const summaries = useQuery({ queryKey: ["summaries"], queryFn: () => listSummaries() });

  const run = useMutation({
    mutationFn: () => aiSummarise({ data: { title, text } }),
    onSuccess: (d) => {
      setResult(d);
      qc.invalidateQueries({ queryKey: ["summaries"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUpload = async (file: File) => {
    if (file.size > 1_000_000) return toast.error("Keep files under 1 MB (paste text instead).");
    const txt = await file.text();
    setText(txt);
    if (!title) setTitle(file.name);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Meeting & Document Summariser</h1>
        <p className="text-sm text-muted-foreground">Turn raw notes into key points, action items, and risks.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="space-y-4 p-5">
          <div>
            <Label htmlFor="ttl">Title</Label>
            <Input id="ttl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naidoo Family Trust — Annual review notes" />
          </div>
          <div>
            <Label htmlFor="src">Notes or document text</Label>
            <Textarea id="src" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste meeting notes or a document excerpt…" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".txt,.md,.csv"
              id="upl"
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && onUpload(e.target.files[0])}
            />
            <Button variant="outline" asChild>
              <label htmlFor="upl" className="cursor-pointer"><FileDown className="mr-2 h-4 w-4" /> Upload .txt/.md</label>
            </Button>
            <Button onClick={() => run.mutate()} disabled={run.isPending || text.trim().length < 20 || !title} className="bg-gradient-brand">
              {run.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Summarise
            </Button>
          </div>
          <Disclaimer />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Result</h2>
          {!result ? (
            <p className="text-sm text-muted-foreground">Run a summary to see structured output here.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <section>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">Summary</div>
                <p className="mt-1 whitespace-pre-wrap">{result.summary}</p>
              </section>
              <section>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">Key points</div>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {result.key_points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </section>
              <section>
                <div className="text-xs font-semibold uppercase tracking-wide text-accent">Action items</div>
                <ul className="mt-1 space-y-2">
                  {result.action_items.map((a, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 rounded-md border border-border bg-background p-2">
                      <div>
                        <div className="font-medium">{a.task}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.owner} {a.deadline ? `· due ${a.deadline}` : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await upsertTask({
                            data: {
                              title: a.task,
                              notes: `From "${title}". Owner: ${a.owner}`,
                              priority: "medium",
                              status: "todo",
                              due_date: a.deadline ?? null,
                              category: "follow-up",
                            },
                          });
                          toast.success("Added to tasks");
                          qc.invalidateQueries({ queryKey: ["tasks"] });
                        }}
                      >
                        <ListPlus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
              {result.risks.length > 0 && (
                <section>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-warning">
                    <AlertTriangle className="h-3 w-3" /> Risks & compliance flags
                  </div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {result.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Recent summaries</h2>
        {summaries.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (summaries.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No summaries yet.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {(summaries.data ?? []).slice(0, 6).map((s: { id: string; source_title: string; summary: string | null; created_at: string }) => (
              <li key={s.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="font-medium">{s.source_title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.summary ?? ""}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
