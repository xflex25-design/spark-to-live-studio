import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faTrash, faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";

const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("id, name, updated_at").order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your apps - Forge" },
      { name: "description", content: "Start a new AI-built app or continue one of your projects." },
      { property: "og:title", content: "Your apps - Forge" },
      { property: "og:description", content: "Start a new AI-built app or continue one of your projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(): Promise<void> {
    if (!prompt.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("projects").insert({}).select("id").single();
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Could not create project"); return; }
    navigate({ to: "/project/$id", params: { id: data.id }, search: { prompt: prompt.trim() } });
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">What do you want to build?</h1>
        <div className="mt-6 rounded-lg border bg-card p-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(); } }}
            placeholder="A habit tracker with weekly streaks and a clean calendar view"
            className="min-h-24 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          />
          <div className="flex justify-end">
            <Button onClick={start} disabled={busy || !prompt.trim()}>Build <FontAwesomeIcon icon={faArrowUp} /></Button>
          </div>
        </div>

        <h2 className="mt-16 text-sm font-medium uppercase tracking-wider text-muted-foreground">Your apps</h2>
        {projects.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No apps yet. Describe one above to get started.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border bg-card">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link to="/project/$id" params={{ id: p.id }} className="flex min-w-0 items-center gap-3 hover:text-primary">
                  <FontAwesomeIcon icon={faWindowMaximize} className="text-muted-foreground" />
                  <span className="truncate">{p.name}</span>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</span>
                  <Button variant="ghost" size="icon" aria-label="Delete app" onClick={() => remove(p.id)}><FontAwesomeIcon icon={faTrash} /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
