import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faCode, faDisplay, faDatabase } from "@fortawesome/free-solid-svg-icons";
import { ChevronDown, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const features = [
  {
    icon: faComments,
    title: "Chat to build",
    text: "Describe the app in plain words and keep refining it.",
  },
  {
    icon: faCode,
    title: "Real code",
    text: "AI writes a complete working app you can read and copy.",
  },
  {
    icon: faDisplay,
    title: "Live preview",
    text: "Every change runs instantly in an isolated preview window.",
  },
  {
    icon: faDatabase,
    title: "Saved projects",
    text: "Your apps and conversations are stored in your account.",
  },
];

const steps = [
  {
    number: "01",
    title: "Describe your idea",
    description:
      "Start with a plain-language prompt describing the app, tool, or workflow you want to create.",
  },
  {
    number: "02",
    title: "Watch it build live",
    description:
      "Spark to Live Studio writes complete, working code and runs it immediately in a live preview.",
  },
  {
    number: "03",
    title: "Iterate and save",
    description:
      "Chat to refine layouts, add features, and keep every project and conversation saved in your account.",
  },
];

const testimonials = [
  {
    quote:
      "I described an internal client portal over lunch and had a working prototype running side by side in under ten minutes.",
    author: "Daniela Reyes",
    role: "Product Lead, Northwind Ops",
    initials: "DR",
    tag: "Internal Tool",
  },
  {
    quote:
      "Seeing every change update live next to the chat makes iterating feel effortless. We shipped our booking calculator in a single afternoon.",
    author: "Marcus Chen",
    role: "Founder, Atelier Grid",
    initials: "MC",
    tag: "Web App",
  },
  {
    quote:
      "Having clean, readable code alongside saved project history means I can test ideas quickly and hand off solid foundations to my team.",
    author: "Priya Nair",
    role: "Engineering Manager, Kestrel",
    initials: "PN",
    tag: "Dashboard",
  },
];

const starterPrompts = [
  "A web app that tracks daily habits with streaks and charts",
  "A web app that manages team tasks on a kanban board",
  "A web app that builds and exports clean invoices",
];

export default function App() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [promptTouched, setPromptTouched] = useState(false);
  const [starterIndex, setStarterIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const trimmedPrompt = prompt.trim();
  const isPromptEmpty = trimmedPrompt.length === 0;
  const showEmptyError = promptTouched && isPromptEmpty;

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 400);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleScrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    if (isPromptEmpty) {
      setPromptTouched(true);
      return;
    }
    sessionStorage.setItem("pending_prompt", trimmedPrompt);
    navigate({ to: "/dashboard" });
  }

  function insertStarterPrompt() {
    setPrompt(starterPrompts[starterIndex % starterPrompts.length]);
    setPromptTouched(false);
    setStarterIndex((i) => i + 1);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <nav aria-label="Primary actions" className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/dashboard">Get started</Link>
          </Button>
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-48 rounded-lg border bg-popover p-2 shadow-lg"
            >
              <nav aria-label="Navigation menu" className="flex flex-col gap-2">
                <a
                  href="#how-it-works"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  How it Works
                </a>
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Sign Up
                </Link>
              </nav>
            </PopoverContent>
          </Popover>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section
          aria-labelledby="hero-heading"
          className="mx-auto flex max-w-3xl flex-col items-center py-20 text-center md:py-28"
        >
          <h1
            id="hero-heading"
            className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
          >
            Describe an app. Watch it get built.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Spark to Live Studio turns your words into a working web app and runs it right next to
            the conversation.
          </p>

          <form
            onSubmit={handleBuild}
            noValidate
            className={`mt-10 w-full max-w-2xl rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors motion-reduce:transition-none ${
              showEmptyError ? "border-destructive" : ""
            }`}
          >
            <label htmlFor="hero-prompt" className="sr-only">
              Describe your web app
            </label>
            <textarea
              id="hero-prompt"
              rows={3}
              value={prompt}
              aria-invalid={showEmptyError}
              aria-describedby="hero-prompt-feedback"
              onChange={(e) => {
                setPrompt(e.target.value);
                if (!promptTouched) setPromptTouched(true);
              }}
              onBlur={() => setPromptTouched(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleBuild(e);
                }
              }}
              placeholder="A web app that..."
              className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <p
              id="hero-prompt-feedback"
              role={showEmptyError ? "alert" : "status"}
              aria-live="polite"
              className={`mt-2 text-xs ${
                showEmptyError ? "font-medium text-destructive" : "text-muted-foreground"
              }`}
            >
              {showEmptyError
                ? "Please describe the app you want to build to continue."
                : !isPromptEmpty
                  ? `Ready to build (${trimmedPrompt.length} characters)`
                  : "Describe your idea above or click + for an example prompt."}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={insertStarterPrompt}
                aria-label="Insert example prompt"
                title="Insert example prompt"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
                  Build <ChevronDown className="h-4 w-4" />
                </span>
                <Button type="submit" size="sm" disabled={isPromptEmpty}>
                  Start building
                </Button>
              </div>
            </div>
          </form>
        </section>

        <section
          id="features"
          aria-label="Key features"
          className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <article key={f.title} className="bg-card p-6">
              <FontAwesomeIcon icon={f.icon} className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="py-20 md:py-28"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-sm text-primary">How it works</p>
            <h2 id="how-it-works-heading" className="mt-4 text-3xl font-bold sm:text-4xl">
              From prompt to live preview
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Go from a single sentence to a working web application in three simple steps.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.number}>
                <article className="h-full rounded-xl border bg-card p-6">
                  <span className="font-mono text-sm font-medium text-primary">{step.number}</span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="testimonials"
          aria-labelledby="testimonials-heading"
          className="pb-20 pt-8 md:pb-28 md:pt-12"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-sm text-primary">Testimonials</p>
            <h2 id="testimonials-heading" className="mt-4 text-3xl font-bold sm:text-4xl">
              Built by makers shipping faster
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              See how founders, product leads, and engineers turn plain-language prompts into live
              apps.
            </p>
          </div>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <li key={item.author}>
                <article className="flex h-full flex-col justify-between rounded-xl border bg-card p-6">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{item.tag}</span>
                    <blockquote className="mt-4 text-sm text-foreground">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>
                  </div>
                  <footer className="mt-6 flex items-center gap-4 border-t pt-4">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-medium text-secondary-foreground"
                    >
                      {item.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.author}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                    </div>
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
            <div className="max-w-xs">
              <Link to="/" aria-label="Home">
                <Logo size="sm" />
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Turn plain-language ideas into working web apps with an instant live preview.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:gap-12">
              <nav aria-label="Product links">
                <h2 className="text-sm font-semibold text-foreground">Product</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#features" className="transition-colors hover:text-foreground">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className="transition-colors hover:text-foreground">
                      How it Works
                    </a>
                  </li>
                  <li>
                    <a href="#testimonials" className="transition-colors hover:text-foreground">
                      Testimonials
                    </a>
                  </li>
                </ul>
              </nav>
              <nav aria-label="Account links">
                <h2 className="text-sm font-semibold text-foreground">Account</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/auth" className="transition-colors hover:text-foreground">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="transition-colors hover:text-foreground">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Spark to Live Studio. All rights reserved.
          </div>
        </div>
      </footer>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleScrollToTop}
        aria-label="Scroll to top"
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
        className={`fixed bottom-6 right-6 z-40 h-10 rounded-lg border bg-card/90 px-4 font-semibold text-foreground shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none ${
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        Back to top
      </Button>
    </div>
  );
}
