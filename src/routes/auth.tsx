import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseConfigError, isSupabaseConfigured } from "@/lib/supabase-ready";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - Spark to Live Studio" },
      {
        name: "description",
        content: "Sign in or create an account to build and save your AI-generated apps.",
      },
      { property: "og:title", content: "Sign in - Spark to Live Studio" },
      {
        property: "og:description",
        content: "Sign in or create an account to build and save your AI-generated apps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const googleSvg = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

function getAuthRedirectUrl(): string {
  return new URL("/auth", window.location.origin).toString();
}

function formatAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/invalid.*url/i.test(message)) {
    return "Invalid Supabase or Redirect URL. Verify VITE_SUPABASE_URL is https://<project-ref>.supabase.co and add this app's URL to Supabase Auth Redirect URLs.";
  }
  return message || "Authentication failed. Please try again.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data.user) navigate({ to: "/dashboard", replace: true });
      })
      .catch(() => {
        // Handled when the user submits the form
      });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const configError = getSupabaseConfigError();
    if (configError) {
      toast.error(configError);
      return;
    }

    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: getAuthRedirectUrl() },
        });
        if (error) {
          toast.error(formatAuthError(error));
          return;
        }
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          toast.error(formatAuthError(error));
          return;
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function socialGoogle(): Promise<void> {
    const configError = getSupabaseConfigError();
    if (configError) {
      toast.error(configError);
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthRedirectUrl() },
      });
      if (error) {
        toast.error(formatAuthError(error));
      }
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section
        aria-labelledby="auth-heading"
        className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg sm:p-8"
      >
        <header className="text-center">
          <div className="flex justify-center">
            <Link to="/" aria-label="Back to home">
              <Logo size="lg" />
            </Link>
          </div>
          <h1 id="auth-heading" className="mt-6 text-2xl font-bold text-foreground">
            {mode === "in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "in"
              ? "Sign in to continue building your apps."
              : "Sign up to start building and saving your apps."}
          </p>
        </header>

        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2"
            onClick={socialGoogle}
          >
            {googleSvg} Continue with Google
          </Button>
        </div>

        <div className="relative my-6 flex items-center" role="separator">
          <div className="flex-1 border-t" />
          <span className="px-4 text-xs text-muted-foreground">or continue with email</span>
          <div className="flex-1 border-t" />
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="mt-2 h-10 w-full">
            {mode === "in" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <footer className="mt-6 text-center">
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
        </footer>
      </section>
    </main>
  );
}
