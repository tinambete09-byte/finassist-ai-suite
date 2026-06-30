import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGateway, DEFAULT_MODEL } from "./ai-gateway.server";

const SA_CONTEXT = `You are FinAssist AI, an assistant for South African financial planners, financial advisers, and paraplanners.
- Use South African terminology and regulators where relevant (FSCA, FAIS Act, FICA, POPIA, Reg 28, TFSA, Living Annuity, Retirement Annuity, two-pot retirement system, CFP®, FPI).
- Always include a brief disclaimer when discussing anything that could be construed as advice: "General information only — not regulated financial advice."
- Be concise, professional, and practical.`;

/* --------------------------- Email Assistant --------------------------- */
const EmailInput = z.object({
  prompt: z.string().min(1).max(8000),
  tone: z.enum(["formal", "friendly", "persuasive", "concise"]),
  mode: z.enum(["generate", "rewrite", "improve", "shorten", "expand"]),
  context: z.string().max(4000).optional(),
});

export const aiGenerateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmailInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = createLovableAiGateway();
    const toneMap = {
      formal: "formal, polished, professional",
      friendly: "warm, approachable, friendly",
      persuasive: "persuasive, confident, action-oriented",
      concise: "concise, direct, no fluff",
    } as const;
    const modeMap = {
      generate: "Draft a new professional email based on the user's brief.",
      rewrite: "Rewrite the provided email keeping intent, improving clarity and tone.",
      improve: "Improve grammar, flow, and professionalism of the provided email.",
      shorten: "Shorten the provided email while preserving key information.",
      expand: "Expand the provided email with more detail and supporting context.",
    } as const;

    const system = `${SA_CONTEXT}
You write client-ready emails for financial planning practices.
Tone: ${toneMap[data.tone]}.
Task: ${modeMap[data.mode]}
Output ONLY the email body. Include a subject line on the first line as: "Subject: ..."
Avoid giving regulated investment advice; suggest a follow-up meeting where appropriate.`;

    const { text } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system,
      prompt: `${data.context ? `Context: ${data.context}\n\n` : ""}Brief / Source:\n${data.prompt}`,
    });

    const { supabase, userId } = context;
    const { data: saved } = await supabase
      .from("email_drafts")
      .insert({
        user_id: userId,
        prompt: data.prompt,
        tone: data.tone,
        mode: data.mode,
        result: text,
        title: text.split("\n")[0].replace(/^Subject:\s*/i, "").slice(0, 120) || "Untitled draft",
      })
      .select("id, title, result, tone, mode, created_at")
      .single();
    await supabase.from("activity_log").insert({
      user_id: userId,
      kind: "email",
      summary: `Email draft (${data.tone}): ${saved?.title ?? "Untitled"}`,
    });
    return { text, draft: saved };
  });

/* --------------------------- Summariser --------------------------- */
const SummaryInput = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(20).max(40000),
});

export const aiSummarise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummaryInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = createLovableAiGateway();
    const system = `${SA_CONTEXT}
You extract structured summaries from meeting notes / documents for paraplanners.
Return STRICT JSON only, no markdown fences, matching:
{
  "summary": string (3-5 sentence overview),
  "key_points": string[] (5-10 concise bullets),
  "action_items": [{ "owner": string, "task": string, "deadline": string | null }],
  "risks": string[] (compliance, suitability, FICA/POPIA, disclosures, missing info)
}`;
    const { text } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system,
      prompt: `Title: ${data.title}\n\nContent:\n${data.text}`,
    });

    let parsed: {
      summary: string;
      key_points: string[];
      action_items: Array<{ owner: string; task: string; deadline: string | null }>;
      risks: string[];
    };
    try {
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { summary: text, key_points: [], action_items: [], risks: [] };
    }

    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("summaries")
      .insert({
        user_id: userId,
        source_title: data.title,
        source_text: data.text,
        summary: parsed.summary,
        key_points: parsed.key_points,
        action_items: parsed.action_items,
        risks: parsed.risks,
      })
      .select("*")
      .single();
    await supabase.from("activity_log").insert({
      user_id: userId,
      kind: "summary",
      summary: `Summarised: ${data.title}`,
    });
    return { ...parsed, id: row?.id };
  });

/* --------------------------- Report Generator --------------------------- */
const ReportInput = z.object({
  clientName: z.string().min(1).max(200),
  meetingDate: z.string().optional(),
  agenda: z.string().max(4000).optional(),
  notes: z.string().max(20000).optional(),
  templateBody: z.string().max(20000).optional(),
});

export const aiGenerateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = createLovableAiGateway();
    const system = `${SA_CONTEXT}
You produce structured client review reports / meeting-prep documents for SA financial planning practices.
Output in Markdown with these sections:
# Client Review — {{Client}}
## Meeting Overview
## Financial Position Snapshot
## Goals & Objectives
## Recommendations to Discuss
## Action Items
## Compliance & Disclosures (FAIS / FICA / POPIA)
## Next Review
Keep recommendations educational. Add this footer:
"_General information only — not regulated financial advice. Verify with FSCA-authorised adviser._"`;

    const userPrompt = `Client: ${data.clientName}
Meeting date: ${data.meetingDate ?? "TBC"}
Agenda: ${data.agenda ?? "(none provided)"}
Adviser notes:
${data.notes ?? "(none provided)"}
${data.templateBody ? `\nReference template to follow:\n${data.templateBody}` : ""}`;

    const { text } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system,
      prompt: userPrompt,
    });

    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        client_name: data.clientName,
        meeting_date: data.meetingDate ?? null,
        agenda: data.agenda ?? null,
        notes: data.notes ?? null,
        content: text,
        status: "draft",
      })
      .select("*")
      .single();
    await supabase.from("activity_log").insert({
      user_id: userId,
      kind: "report",
      summary: `Report drafted for ${data.clientName}`,
    });
    return { content: text, report: row };
  });

/* --------------------------- Task Suggest --------------------------- */
const TaskSuggestInput = z.object({
  context: z.string().min(5).max(8000),
});

export const aiSuggestTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TaskSuggestInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = createLovableAiGateway();
    const system = `${SA_CONTEXT}
You are a task planner for a financial planning practice. From the user's context, produce 3-7 concrete tasks.
Return STRICT JSON: { "tasks": [{ "title": string, "notes": string, "priority": "low"|"medium"|"high", "due_in_days": number, "category": string }] }
Categories: "client-review", "compliance", "admin", "research", "follow-up".`;
    const { text } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system,
      prompt: data.context,
    });
    try {
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(cleaned) as {
        tasks: Array<{
          title: string;
          notes: string;
          priority: "low" | "medium" | "high";
          due_in_days: number;
          category: string;
        }>;
      };
    } catch {
      return { tasks: [] as const };
    }
  });
