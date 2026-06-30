import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { listChats, createChat, deleteChat, listMessages } from "@/lib/knowledge.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { Disclaimer } from "@/components/disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Assistant — FinAssist AI" }] }),
  component: KnowledgePage,
});

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };

function KnowledgePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const chats = useQuery({ queryKey: ["chats"], queryFn: () => listChats() });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (!activeId && (chats.data ?? []).length > 0) {
      setActiveId(chats.data![0].id);
    }
  }, [chats.data, activeId]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    listMessages({ data: { chatId: activeId } }).then((rows) =>
      setMessages(rows.map((r) => ({ id: r.id, role: r.role as Msg["role"], content: r.content }))),
    );
  }, [activeId]);

  const newChat = useMutation({
    mutationFn: () => createChat({ data: {} }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      setActiveId(c.id);
      setMessages([]);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteChat({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      if (activeId === id) setActiveId(null);
    },
  });

  void navigate;

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    let chatId = activeId;
    if (!chatId) {
      const c = await createChat({ data: {} });
      qc.invalidateQueries({ queryKey: ["chats"] });
      chatId = c.id;
      setActiveId(chatId);
    }
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: Msg = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const next = [...messages, userMsg];
    setMessages([...next, assistantMsg]);
    setInput("");
    setStreaming(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId, messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
          return copy;
        });
      }
      qc.invalidateQueries({ queryKey: ["chats"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-9rem)] max-w-6xl gap-4 md:grid-cols-[260px_1fr]">
      <Card className="hidden flex-col p-3 md:flex">
        <Button onClick={() => newChat.mutate()} className="mb-3 bg-gradient-brand"><MessageSquarePlus className="mr-2 h-4 w-4" /> New chat</Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {(chats.data ?? []).map((c: { id: string; title: string }) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${activeId === c.id ? "bg-secondary" : "hover:bg-secondary/60"}`}>
              <button onClick={() => setActiveId(c.id)} className="min-w-0 flex-1 truncate text-left">{c.title}</button>
              <button onClick={() => remove.mutate(c.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Delete chat"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
            </div>
          ))}
          {(chats.data ?? []).length === 0 && <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p>}
        </div>
      </Card>

      <Card className="flex min-h-0 flex-col p-0">
        <div className="border-b border-border p-3">
          <h1 className="font-display text-lg font-semibold">Financial Knowledge Assistant</h1>
          <p className="text-xs text-muted-foreground">SA-aware general information for paraplanners and advisers.</p>
        </div>
        <div className="border-b border-border p-3"><Disclaimer /></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md py-12 text-center text-sm text-muted-foreground">
              Ask about FAIS file requirements, FICA renewals, Reg 28, two-pot system, TFSA limits, paraplanner workflows…
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-gradient-brand text-primary-foreground" : "bg-secondary"}`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <form
          className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <Textarea
            rows={2}
            placeholder="Ask FinAssist…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            autoFocus
          />
          <Button type="submit" className="bg-gradient-brand" disabled={streaming || !input.trim()}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
