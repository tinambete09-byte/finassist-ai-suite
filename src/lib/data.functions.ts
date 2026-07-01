import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ------------------------------ TEMPLATES ------------------------------ */
const TemplateKind = z.enum(["email", "meeting", "report", "client_comm"]);
export type TemplateKind = z.infer<typeof TemplateKind>;

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        kind: TemplateKind,
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(20000),
        tags: z.array(z.string().max(40)).max(20).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: existing } = await supabase
        .from("templates")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        const { data: last } = await supabase
          .from("template_versions")
          .select("version")
          .eq("template_id", data.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        await supabase.from("template_versions").insert({
          template_id: data.id,
          user_id: userId,
          version: (last?.version ?? 0) + 1,
          kind: existing.kind,
          title: existing.title,
          body: existing.body,
          tags: existing.tags ?? [],
        });
      }
      const { data: row, error } = await supabase
        .from("templates")
        .update({ kind: data.kind, title: data.title, body: data.body, tags: data.tags })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("templates")
      .insert({ user_id: userId, kind: data.kind, title: data.title, body: data.body, tags: data.tags })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listTemplateVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ templateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("template_versions")
      .select("*")
      .eq("template_id", data.templateId)
      .eq("user_id", context.userId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const restoreTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ templateId: z.string().uuid(), versionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v, error: vErr } = await supabase
      .from("template_versions")
      .select("*")
      .eq("id", data.versionId)
      .eq("template_id", data.templateId)
      .eq("user_id", userId)
      .single();
    if (vErr || !v) throw new Error(vErr?.message ?? "Version not found");
    const { data: existing } = await supabase
      .from("templates")
      .select("*")
      .eq("id", data.templateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { data: last } = await supabase
        .from("template_versions")
        .select("version")
        .eq("template_id", data.templateId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      await supabase.from("template_versions").insert({
        template_id: data.templateId,
        user_id: userId,
        version: (last?.version ?? 0) + 1,
        kind: existing.kind,
        title: existing.title,
        body: existing.body,
        tags: existing.tags ?? [],
      });
    }
    const { data: row, error } = await supabase
      .from("templates")
      .update({ kind: v.kind, title: v.title, body: v.body, tags: v.tags })
      .eq("id", data.templateId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("template_versions")
      .delete()
      .eq("id", data.versionId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("templates")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ TASKS ------------------------------ */
const TaskPriority = z.enum(["low", "medium", "high"]);
const TaskStatus = z.enum(["todo", "in_progress", "done"]);

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).max(300),
        notes: z.string().max(4000).optional().nullable(),
        priority: TaskPriority.default("medium"),
        status: TaskStatus.default("todo"),
        due_date: z.string().optional().nullable(),
        client_name: z.string().max(200).optional().nullable(),
        category: z.string().max(100).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      title: data.title,
      notes: data.notes ?? null,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date ?? null,
      client_name: data.client_name ?? null,
      category: data.category ?? null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({ user_id: userId, ...payload })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: TaskStatus }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ EMAIL DRAFTS ------------------------------ */
export const listEmailDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("email_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------ SUMMARIES ------------------------------ */
export const listSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("summaries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------ REPORTS ------------------------------ */
export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateReportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), content: z.string().max(40000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reports")
      .update({ content: data.content })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ DASHBOARD ------------------------------ */
export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [tasksOpen, drafts, summaries, reports, activity, upcoming] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "done"),
      supabase.from("email_drafts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekAgo),
      supabase.from("summaries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekAgo),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekAgo),
      supabase.from("activity_log").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
      supabase.from("tasks").select("*").eq("user_id", userId).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(5),
    ]);
    return {
      counts: {
        openTasks: tasksOpen.count ?? 0,
        weeklyDrafts: drafts.count ?? 0,
        weeklySummaries: summaries.count ?? 0,
        weeklyReports: reports.count ?? 0,
      },
      activity: activity.data ?? [],
      upcomingTasks: upcoming.data ?? [],
    };
  });

/* ------------------------------ PROFILE ------------------------------ */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().max(200).optional().nullable(),
        firm: z.string().max(200).optional().nullable(),
        job_title: z.string().max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, ...data })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
