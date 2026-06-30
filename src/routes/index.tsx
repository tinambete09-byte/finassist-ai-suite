import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Mail,
  FileText,
  ListChecks,
  ClipboardList,
  Sparkles,
  Library,
  ShieldCheck,
  ArrowRight,
  Zap,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinAssist AI — AI productivity for financial planners" },
      {
        name: "description",
        content:
          "Draft client emails, summarise meetings, plan tasks, and generate review reports — built for South African financial planners and paraplanners.",
      },
    ],
  }),
  component: Landing,
});

const tools = [
  { icon: Mail, title: "AI Email Assistant", body: "Generate, rewrite, shorten, or expand client emails in four tones." },
  { icon: FileText, title: "Meeting & Document Summariser", body: "Turn notes into key points, action items, owners, and deadlines." },
  { icon: ListChecks, title: "AI Task Planner", body: "Track client reviews, compliance work, and admin with priorities and due dates." },
  { icon: ClipboardList, title: "Client Review Report Generator", body: "Produce structured review summaries and meeting-prep documents." },
  { icon: Sparkles, title: "Financial Knowledge Assistant", body: "Ask SA-aware questions on process, compliance, FAIS, FICA, POPIA, and more." },
  { icon: Library, title: "Template Library", body: "Save and reuse templates for emails, meeting notes, and reports." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">FinAssist AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#tools" className="hover:text-foreground">Tools</a>
            <a href="#built-for" className="hover:text-foreground">Built for SA</a>
            <a href="#trust" className="hover:text-foreground">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-gradient-brand shadow-brand">Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3 text-accent" /> AI for South African financial planning practices
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              The AI productivity suite for{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">financial planners</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Draft client emails, summarise meetings, plan compliance work, and produce review reports —
              with prompts tuned for FSCA, FAIS, FICA, POPIA, Reg 28, TFSAs, RAs, and the two-pot system.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-brand shadow-brand">
                  Start free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#tools">
                <Button size="lg" variant="outline">Explore tools</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              General information only — does not provide regulated financial advice.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-brand">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                </div>
                <span className="text-xs text-muted-foreground">FinAssist · Review brief</span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg bg-secondary/60 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Client</span>
                  <div className="font-medium">Naidoo Family Trust — Annual Review</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">Key points</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/90">
                    <li>Two-pot withdrawal eligibility confirmed; client electing not to withdraw.</li>
                    <li>Reg 28 exposure within limits; offshore allocation at 38%.</li>
                    <li>TFSA contributions on track for FY annual limit.</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-accent">Action items</div>
                  <ul className="mt-2 space-y-1 text-foreground/90">
                    <li>• Para — refresh FNA pack before 12 Aug</li>
                    <li>• Adviser — schedule risk cover review</li>
                    <li>• Compliance — FICA re-verification due</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="tools" className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Six tools, one workspace.</h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built for paraplanners and advisers running South African practices.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-brand"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="built-for" className="py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Built for South African practices.</h2>
            <p className="mt-3 text-muted-foreground">
              Prompts are tuned to the South African regulatory environment — FAIS, FICA, POPIA, Reg 28,
              TFSAs, RAs, living annuities, Section 10C, and the two-pot retirement system. Outputs use
              terminology your clients and compliance team expect.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-success" />Responsible-AI guardrails: clear no-advice disclaimers throughout.</li>
              <li className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 text-success" />Every record scoped to your account with row-level security.</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-success" />Powered by Lovable AI — no API keys to manage.</li>
            </ul>
          </div>
          <div id="trust" className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-semibold">Responsible AI principles</h3>
            <ol className="mt-4 space-y-3 text-sm text-foreground/90">
              <li><strong>No regulated advice.</strong> FinAssist AI provides general information and productivity outputs only.</li>
              <li><strong>Human-in-the-loop.</strong> Every AI output is editable and intended for adviser review before client use.</li>
              <li><strong>Transparency.</strong> Disclaimers appear on every AI-generated artefact.</li>
              <li><strong>Data discipline.</strong> Keep PII to a minimum; use client codes where possible.</li>
            </ol>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} FinAssist AI. General information only — not regulated advice.</div>
          <div className="flex gap-4">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#tools" className="hover:text-foreground">Tools</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
