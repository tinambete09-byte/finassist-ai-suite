import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { aiGenerateReport } from "@/lib/ai.functions";
import { listReports, updateReportContent } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Disclaimer } from "@/components/disclaimer";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [{ title: "Client Reports — FinAssist AI" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const qc = useQueryClient();
  const [clientName, setClient] = useState("");
  const [meetingDate, setDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [content, setContent] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);

  const reports = useQuery({ queryKey: ["reports"], queryFn: () => listReports() });

  const gen = useMutation({
    mutationFn: () =>
      aiGenerateReport({
        data: { clientName, meetingDate: meetingDate || undefined, agenda, notes },
      }),
    onSuccess: (d) => {
      setContent(d.content);
      setReportId(d.report?.id ?? null);
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!reportId) throw new Error("Generate first");
      return updateReportContent({ data: { id: reportId, content } });
    },
    onSuccess: () => toast.success("Report saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Client Review Report Generator</h1>
        <p className="text-sm text-muted-foreground">Structured review packs and meeting prep documents.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="space-y-3 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Client</Label><Input value={clientName} onChange={(e) => setClient(e.target.value)} placeholder="Naidoo Family Trust" /></div>
            <div><Label>Meeting date</Label><Input type="date" value={meetingDate} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div><Label>Agenda</Label><Textarea rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Annual review, FNA refresh, two-pot decision…" /></div>
          <div><Label>Adviser notes</Label><Textarea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Background, current holdings, observations…" /></div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !clientName} className="bg-gradient-brand">
            {gen.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate report
          </Button>
          <Disclaimer />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Report</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!content} onClick={() => { navigator.clipboard.writeText(content); toast.success("Copied"); }}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
              <Button size="sm" variant="outline" disabled={!content} onClick={() => {
                const blob = new Blob([content], { type: "text/markdown" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${clientName || "report"}.md`;
                a.click();
              }}><Download className="mr-1.5 h-3.5 w-3.5" /> .md</Button>
              <Button size="sm" disabled={!reportId || save.isPending} onClick={() => save.mutate()}><Save className="mr-1.5 h-3.5 w-3.5" /> Save</Button>
            </div>
          </div>
          {!content ? (
            <p className="text-sm text-muted-foreground">Your generated report will appear here. You can edit it before saving.</p>
          ) : (
            <>
              <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} className="mb-3 font-mono text-xs" />
              <div className="prose prose-sm max-w-none rounded-lg border border-border bg-background p-4 dark:prose-invert">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Recent reports</h2>
        {reports.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (reports.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {(reports.data ?? []).slice(0, 6).map((r: { id: string; client_name: string; meeting_date: string | null; content: string }) => (
              <li key={r.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="font-medium">{r.client_name}</div>
                <div className="text-xs text-muted-foreground">{r.meeting_date ?? "no date"}</div>
                <Button size="sm" variant="ghost" className="mt-1 px-0 text-xs" onClick={() => { setContent(r.content); setReportId(r.id); setClient(r.client_name); }}>Load</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
