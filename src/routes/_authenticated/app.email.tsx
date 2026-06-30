import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiGenerateEmail } from "@/lib/ai.functions";
import { listEmailDrafts } from "@/lib/data.functions";
import { upsertTemplate } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Disclaimer } from "@/components/disclaimer";

export const Route = createFileRoute("/_authenticated/app/email")({
  head: () => ({ meta: [{ title: "Email Assistant — FinAssist AI" }] }),
  component: EmailAssistant,
});

type Tone = "formal" | "friendly" | "persuasive" | "concise";
type Mode = "generate" | "rewrite" | "improve" | "shorten" | "expand";

function EmailAssistant() {
  const qc = useQueryClient();
  const [tone, setTone] = useState<Tone>("formal");
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");

  const drafts = useQuery({ queryKey: ["emailDrafts"], queryFn: () => listEmailDrafts() });

  const gen = useMutation({
    mutationFn: () =>
      aiGenerateEmail({ data: { prompt, tone, mode, context: context || undefined } }),
    onSuccess: (d) => {
      setResult(d.text);
      qc.invalidateQueries({ queryKey: ["emailDrafts"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTpl = useMutation({
    mutationFn: () =>
      upsertTemplate({
        data: {
          kind: "email",
          title: result.split("\n")[0].replace(/^Subject:\s*/i, "").slice(0, 100) || "Email template",
          body: result,
          tags: [tone],
        },
      }),
    onSuccess: () => toast.success("Saved to templates"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">AI Email Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Draft, rewrite, improve, shorten, or expand professional emails.
          </p>
        </div>

        <Card className="space-y-4 p-5">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
              <TabsTrigger value="improve">Improve</TabsTrigger>
              <TabsTrigger value="shorten">Shorten</TabsTrigger>
              <TabsTrigger value="expand">Expand</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="persuasive">Persuasive</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ctx">Context (optional)</Label>
            <Input
              id="ctx"
              placeholder="Client name, meeting date, product line, etc."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="prm">
              {mode === "generate" ? "Brief" : "Email to edit"}
            </Label>
            <Textarea
              id="prm"
              rows={8}
              placeholder={
                mode === "generate"
                  ? "Email a client to confirm next week's annual review, request updated FICA docs, and outline agenda."
                  : "Paste the email you want to edit…"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <Button
            onClick={() => gen.mutate()}
            disabled={gen.isPending || prompt.trim().length === 0}
            className="bg-gradient-brand"
          >
            {gen.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {mode === "generate" ? "Draft email" : "Run"}
          </Button>
          <Disclaimer />
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Result</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!result}
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  toast.success("Copied");
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" variant="outline" disabled={!result || saveTpl.isPending} onClick={() => saveTpl.mutate()}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save template
              </Button>
            </div>
          </div>
          {result ? (
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-secondary/50 p-4 text-sm">{result}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">Your generated email will appear here.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Recent drafts</h2>
          {drafts.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (drafts.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts yet.</p>
          ) : (
            <ul className="space-y-2">
              {(drafts.data ?? []).slice(0, 8).map((d: { id: string; title: string | null; tone: string; result: string }) => (
                <li key={d.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium">{d.title ?? "Untitled"}</div>
                    <span className="text-xs text-muted-foreground">{d.tone}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 px-0 text-xs"
                    onClick={() => setResult(d.result)}
                  >
                    Load into editor
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
