import { createFileRoute, Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faComments, faCode, faDisplay, faDatabase } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge - Build apps by describing them" },
      { name: "description", content: "Type what you want. Forge writes the code with Claude and runs it in a live preview." },
      { property: "og:title", content: "Forge - Build apps by describing them" },
      { property: "og:description", content: "Type what you want. Forge writes the code with Claude and runs it in a live preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: faComments, title: "Chat to build", text: "Describe the app in plain words and keep refining it." },
  { icon: faCode, title: "Real code", text: "Claude writes a complete working app you can read and copy." },
  { icon: faDisplay, title: "Live preview", text: "Every change runs instantly in an isolated preview window." },
  { icon: faDatabase, title: "Saved projects", text: "Your apps and conversations are stored in your account." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Button asChild variant="outline" size="sm"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 md:py-32">
          <p className="font-mono text-sm text-primary">AI app builder</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Describe an app. Watch it get built.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Forge turns your words into a working web app and runs it right next to the conversation.
          </p>
          <Button asChild size="lg" className="mt-10">
            <Link to="/dashboard">Start building <FontAwesomeIcon icon={faArrowRight} /></Link>
          </Button>
        </section>
        <section className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <FontAwesomeIcon icon={f.icon} className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
        <footer className="py-12 text-sm text-muted-foreground">Forge</footer>
      </main>
    </div>
  );
}
