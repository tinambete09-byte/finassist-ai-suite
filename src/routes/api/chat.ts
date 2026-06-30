import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGateway, DEFAULT_MODEL } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM = `You are FinAssist AI's Financial Knowledge Assistant for South African financial planners, advisers, and paraplanners.

Scope:
- Help with workflow, process, productivity, paraplanning, and compliance administration in a South African context.
- Reference SA regulators and frameworks when relevant: FSCA, FAIS Act, FICA, POPIA, Reg 28, TFSA, Retirement Annuity (RA), Living Annuity, two-pot retirement system, Section 10C, Estate Duty, CFP®, FPI.
- Be concise, structured, and practical. Use markdown headings/bullets for clarity.

Limits:
- Do NOT give regulated financial, investment, tax, or legal advice. Educate, summarise, and explain processes.
- When a question crosses into product/investment recommendations or personal financial advice, decline and direct to a FSCA-authorised adviser.
- End every substantive answer with: "_General information only — not regulated financial advice (FAIS Act)._"`;

type IncomingMessage = { role: "user" | "assistant" | "system"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice("Bearer ".length).trim();
        if (!token || token.split(".").length !== 3) {
          return new Response("Unauthorized", { status: 401 });
        }

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Server misconfigured", { status: 500 });

        const supabase = createClient<Database>(url, key, {
          global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userData } = await supabase.auth.getUser(token);
        const userId = userData.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        let body: { chatId?: string; messages?: IncomingMessage[] };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const chatId = body.chatId;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!chatId || messages.length === 0) {
          return new Response("Missing chatId or messages", { status: 400 });
        }

        // verify chat ownership
        const { data: chat } = await supabase
          .from("knowledge_chats")
          .select("id")
          .eq("id", chatId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!chat) return new Response("Chat not found", { status: 404 });

        // persist the latest user message
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("knowledge_messages").insert({
            chat_id: chatId,
            user_id: userId,
            role: "user",
            content: lastUser.content.slice(0, 16000),
          });
        }

        const gateway = createLovableAiGateway();
        const modelMessages: ModelMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = streamText({
          model: gateway(DEFAULT_MODEL),
          system: SYSTEM,
          messages: modelMessages,
        });

        const encoder = new TextEncoder();
        let fullText = "";
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const delta of result.textStream) {
                fullText += delta;
                controller.enqueue(encoder.encode(delta));
              }
              controller.close();
              // persist assistant message + update chat timestamp/title
              await supabase.from("knowledge_messages").insert({
                chat_id: chatId,
                user_id: userId,
                role: "assistant",
                content: fullText,
              });
              const isFirstAssistant =
                messages.filter((m) => m.role === "assistant").length === 0;
              if (isFirstAssistant && lastUser) {
                const title = lastUser.content.replace(/\s+/g, " ").trim().slice(0, 80);
                await supabase
                  .from("knowledge_chats")
                  .update({ title })
                  .eq("id", chatId)
                  .eq("user_id", userId);
              } else {
                await supabase
                  .from("knowledge_chats")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", chatId)
                  .eq("user_id", userId);
              }
              await supabase.from("activity_log").insert({
                user_id: userId,
                kind: "knowledge",
                summary: `Knowledge chat reply`,
              });
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
