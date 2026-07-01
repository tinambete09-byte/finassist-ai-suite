import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — FinAssist AI" },
      { name: "description", content: "Sign in to FinAssist AI." },
    ],
  }),
  component: AuthPage,
});

// ---- Validation schemas ----
const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(255, "Email is too long")
  .email("Enter a valid email address");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be under 72 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name is too short")
  .max(80, "Name is too long");

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't match. If you signed up with Google, use the Google button — otherwise reset your password.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email address first. Check your inbox for the verification link.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("pwned") || m.includes("compromised") || m.includes("hibp")) {
    return "This password has appeared in a known data breach. Please choose a different, unique password.";
  }
  if (m.includes("weak") || m.includes("password should")) {
    return "Password is too weak. Use at least 8 characters with upper, lower and a number.";
  }
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const initial = search.mode ?? "signin";
  const [tab, setTab] = useState<string>(initial);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 bottom-10 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display font-bold tracking-tight">FinAssist AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </span>
          </Link>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto mt-6 w-full max-w-md px-4"
      >
        <Card className="border-border/60 p-6 shadow-brand">
          <div className="mb-4 text-center">
            <h1 className="font-display text-2xl font-bold">
              {tab === "signup" ? "Create your workspace" : tab === "forgot" ? "Reset your password" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "signup"
                ? "Start planning smarter with FinAssist AI"
                : tab === "forgot"
                ? "We'll email you a secure reset link"
                : "Sign in to your FinAssist AI workspace"}
            </p>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
              <TabsTrigger value="forgot">Reset</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <SignInForm onDone={() => navigate({ to: "/app" })} onForgot={() => setTab("forgot")} />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpForm onDone={() => setTab("signin")} />
            </TabsContent>
            <TabsContent value="forgot">
              <ForgotForm onDone={() => setTab("signin")} />
            </TabsContent>
          </Tabs>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Encrypted sign-in · Leaked-password protection enabled</span>
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you accept that FinAssist AI provides general information only and not
          regulated financial advice.
        </p>
      </motion.div>
    </div>
  );
}

function GoogleButton({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (result.error) {
          toast.error(result.error.message || "Google sign-in failed");
          setLoading(false);
          return;
        }
        if (result.redirected) return;
        onDone();
      }}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-9 0-.6-.06-1.1-.16-1.6H12z"/>
    </svg>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SignInForm({ onDone, onForgot }: { onDone: () => void; onForgot: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) return toast.error(parsed.error.issues[0].message);
        if (!password) return toast.error("Enter your password");
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data,
          password,
        });
        setLoading(false);
        if (error) return toast.error(friendlyAuthError(error.message));
        toast.success("Signed in");
        onDone();
      }}
    >
      <GoogleButton onDone={onDone} />
      <div className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <PasswordField
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full bg-gradient-brand" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
      </Button>
    </form>
  );
}

function passwordStrength(pw: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const tones = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-500",
  ];
  return { score, label: labels[score], tone: tones[score] };
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(password);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const nameP = nameSchema.safeParse(name);
        if (!nameP.success) return toast.error(nameP.error.issues[0].message);
        const emailP = emailSchema.safeParse(email);
        if (!emailP.success) return toast.error(emailP.error.issues[0].message);
        const pwP = passwordSchema.safeParse(password);
        if (!pwP.success) return toast.error(pwP.error.issues[0].message);
        setLoading(true);
        const { error } = await supabase.auth.signUp({
          email: emailP.data,
          password: pwP.data,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: nameP.data },
          },
        });
        setLoading(false);
        if (error) return toast.error(friendlyAuthError(error.message));
        toast.success("Account created. Check your email to confirm.");
        onDone();
      }}
    >
      <GoogleButton onDone={onDone} />
      <div className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <div>
        <Label htmlFor="su-name">Full name</Label>
        <Input
          id="su-name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="su-email">Work email</Label>
        <Input
          id="su-email"
          type="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="su-pw">Password</Label>
        <PasswordField
          id="su-pw"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
        />
        {password.length > 0 && (
          <div className="mt-1.5 space-y-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < strength.score ? strength.tone : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Strength: {strength.label} · Min 8 chars, upper, lower and a number
            </p>
          </div>
        )}
      </div>
      <Button type="submit" className="w-full bg-gradient-brand" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
      </Button>
    </form>
  );
}

function ForgotForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) return toast.error(parsed.error.issues[0].message);
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        setLoading(false);
        if (error) return toast.error(friendlyAuthError(error.message));
        toast.success("If an account exists, a reset link has been sent.");
        onDone();
      }}
    >
      <div>
        <Label htmlFor="fp-email">Email</Label>
        <Input
          id="fp-email"
          type="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
      </Button>
    </form>
  );
}
