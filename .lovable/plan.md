# FinAssist AI — Build Plan

A premium, responsive SaaS for SA financial planners/advisers/paraplanners with secure auth, six AI tools, dashboard, and template library.

## Stack & Backend
- TanStack Start + React + TypeScript + Tailwind v4 + shadcn/ui.
- Enable **Lovable Cloud** (Supabase) for auth (email/password + Google) + Postgres.
- All AI calls via **Lovable AI Gateway** using `google/gemini-3-flash-preview` through the AI SDK, server-side via `createServerFn` (streaming chat uses `/api/chat` server route).

## Design Direction (Modern Slate)
- Palette tokens (oklch) in `src/styles.css`: bg `#0F172A` (dark) / `#F1F5F9` (light), primary `#6366F1`, accent `#22D3EE`, success emerald, warning amber, semantic foreground/muted/border.
- Typography: **Space Grotesk** display + **Inter** body via `@fontsource-variable/*`.
- Dark/light toggle (`next-themes`-style hook + class on `<html>`), default system.
- Layered SaaS look: subtle gradient hero, glass cards, soft shadows, rounded-2xl, Lucide icons, smooth Framer Motion transitions on cards/nav.
- Mobile-first: collapsible sidebar (Sheet on mobile), responsive grid headers using `grid-cols-[minmax(0,1fr)_auto]` pattern.

## Routes
```
/                       Marketing landing (hero, features, pricing-ish, CTA)
/auth                   Login + Sign-up tabs, Google OAuth, forgot-password link
/auth/reset-password    Set new password (recovery flow)
/_authenticated/
  app/                  Dashboard (stats, recent activity, quick tools, pending tasks)
  app/email             AI Email Assistant
  app/summariser        Meeting & Document Summariser
  app/tasks             AI Task Planner
  app/reports           Client Review Report Generator
  app/knowledge         Financial Knowledge Assistant (chat)
  app/templates         Template Library
  app/profile           User profile + theme + sign out
```
Shared `_authenticated/app/route.tsx` renders responsive sidebar shell + topbar (search, theme toggle, avatar menu).

## Database (migrations)
- `profiles` (id→auth.users, full_name, firm, role, region default 'ZA', avatar_url) + trigger on signup.
- `user_roles` + `app_role` enum + `has_role()` security-definer (per knowledge file).
- `templates` (id, user_id, kind enum: email|meeting|report|client_comm, title, body, tags[], updated_at).
- `tasks` (id, user_id, title, notes, priority enum, status enum, due_date, client_name, category).
- `email_drafts` (id, user_id, prompt, tone, result, created_at).
- `summaries` (id, user_id, source_title, source_text, key_points jsonb, actions jsonb, created_at).
- `reports` (id, user_id, client_name, meeting_date, content, status).
- `knowledge_chats` + `knowledge_messages` (threaded chat for Knowledge Assistant).
- `activity_log` (id, user_id, kind, summary, created_at) — powers dashboard recent activity.
- RLS: every table scoped to `auth.uid()`; explicit `GRANT`s to `authenticated` + `service_role`.

## Server Functions (`src/lib/*.functions.ts`)
All use `requireSupabaseAuth`; call Gemini via shared `src/lib/ai-gateway.server.ts` helper.
- `generateEmail({ prompt, tone, mode: 'generate'|'rewrite'|'improve'|'shorten'|'expand' })`
- `summariseContent({ text, kind })` → structured output (key_points, action_items[{owner,task,deadline}], risks).
- `generateReport({ clientName, meetingDate, notes, templateId? })` → markdown report.
- `taskSuggest({ context })` → suggested tasks/priorities.
- Tasks/templates/reports CRUD server fns.
- `/api/chat` server route for Knowledge Assistant streaming chat (`streamText` + `toUIMessageStreamResponse`), with SA-focused system prompt (FSCA, FAIS, Category I/II advisers, FPI, CFP®, Reg 28, TFSA, RA, living annuity, FICA, POPIA, two-pot retirement system) and a non-advice disclaimer enforced in system prompt and shown in UI.

## AI Tool Details

**Email Assistant** — Tone selector (Formal/Friendly/Persuasive/Concise), mode tabs, source textarea + result panel with copy/save-as-template. Persists drafts.

**Summariser** — Paste notes or upload .txt/.md/.pdf (parse client-side via existing capabilities; PDF kept simple — text paste primary, file upload optional). Structured output rendered as sections with checkbox action items convertible to tasks.

**Task Planner** — Kanban-lite (To do / In progress / Done) + list view, priority badges, due dates, client tagging, optional "AI suggest tasks from context" button. Dashboard surfaces upcoming/overdue.

**Report Generator** — Form (client, date, agenda, notes, template) → streamed markdown preview, editable, save + export (copy / download .md).

**Knowledge Assistant** — Threaded chat (matches chat-agent-ui-contract: threads + database). Sidebar of threads, `/app/knowledge/$threadId` route, message persistence, optimistic UI, markdown rendering with `react-markdown`. Persistent disclaimer banner: "General information only — not regulated financial advice (FAIS Act)."

**Template Library** — Grid by kind, search, create/edit (rich textarea), insert into other tools via "Use template" action.

**Dashboard** — Cards: pending tasks count, drafts this week, summaries, reports; recent activity feed; quick-launch tiles for the 6 tools; upcoming tasks list.

## Security & Quality
- Zod input validation on every server fn and form.
- RLS + GRANTs verified per migration.
- Disclaimer banner on Knowledge Assistant + Report Generator outputs.
- Accessible: keyboard nav, focus rings, aria labels, color contrast AA in both themes.
- No service-role usage from client paths.

## Out of scope (can add later)
- Payments/subscriptions, team workspaces, calendar/Outlook sync, real document parsing for .docx, audio meeting transcription.

## Build order
1. Enable Lovable Cloud + migrations + RLS + grants.
2. Design tokens, fonts, theme toggle, app shell + sidebar.
3. Auth pages (login/signup/forgot/reset) + Google OAuth + profile.
4. Dashboard skeleton + activity log writes.
5. Templates CRUD (foundation reused elsewhere).
6. Email Assistant → Summariser → Task Planner → Report Generator.
7. Knowledge Assistant (threads + streaming chat).
8. Landing page polish, responsive QA, dark/light QA.