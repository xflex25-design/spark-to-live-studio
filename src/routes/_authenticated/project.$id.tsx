import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faCode, faDisplay, faRotateRight, faCopy, faCubes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { generateApp } from "@/lib/generate.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { cn } from "@/lib/utils";

const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const [p, m] = await Promise.all([
        supabase.from("projects").select("id, name, code").eq("id", id).single(),
        supabase.from("messages").select("id, role, content, created_at").eq("project_id", id).order("created_at"),
      ]);
      if (p.error) throw p.error;
      if (m.error) throw m.error;
      return { project: p.data, messages: m.data };
    },
  });

export const Route = createFileRoute("/_authenticated/project/$id")({
  validateSearch: (s: Record<string, unknown>): { prompt?: string } => (typeof s["prompt"] === "string" ? { prompt: s["prompt"] } : {}),
  head: () => ({
    meta: [
      { title: "Builder - Forge" },
      { name: "description", content: "Chat with Forge to build your app and see it live." },
      { property: "og:title", content: "Builder - Forge" },
      { property: "og:description", content: "Chat with Forge to build your app and see it live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(projectQuery(params.id)),
  component: Builder,
});

type ChatMsg = { id: string; role: string; content: string };

function Builder() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(projectQuery(id));
  const qc = useQueryClient();
  const generate = useServerFn(generateApp);

  const [pending, setPending] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [frameKey, setFrameKey] = useState(0);
  const sent = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const messages: ChatMsg[] = [...data.messages, ...pending];
  const code = data.project.code;

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    setPending([{ id: "pending", role: "user", content: prompt }]);
    try {
      await generate({ data: { projectId: id, prompt } });
      await qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setTab("preview");
      setFrameKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
      await qc.invalidateQueries({ queryKey: ["project", id] });
    } finally {
      setPending([]);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (search.prompt && !sent.current) {
      sent.current = true;
      const p = search.prompt;
      navigate({ search: {}, replace: true });
      send(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, busy]);

  return (
    <div className="flex h-screen flex-col">
      <AppHeader><span className="truncate text-sm text-muted-foreground">{data.project.name}</span></AppHeader>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex min-h-0 flex-col border-b bg-panel md:w-[400px] md:border-r md:border-b-0 h-1/2 md:h-auto">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !busy && <p className="text-sm text-muted-foreground">Describe the app you want to build.</p>}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="ml-8 rounded-lg bg-bubble px-3 py-2 text-sm text-bubble-foreground whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div key={m.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground"><FontAwesomeIcon icon={faCubes} className="h-3 w-3" /></span>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <FontAwesomeIcon icon={faSpinner} spin /> Writing your app. This can take a minute.
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="border-t p-3">
            <div className="rounded-lg border bg-card p-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={code ? "Ask for a change" : "Describe your app"}
                className="min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <div className="flex justify-end">
                <Button size="icon" aria-label="Send" onClick={() => send(input)} disabled={busy || !input.trim()}><FontAwesomeIcon icon={faArrowUp} /></Button>
              </div>
            </div>
          </div>
        </aside>
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
            <div className="flex gap-1">
              {(["preview", "code"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn("inline-flex items-center gap-2 rounded px-3 py-1 text-sm", tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <FontAwesomeIcon icon={t === "preview" ? faDisplay : faCode} /> {t === "preview" ? "Preview" : "Code"}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" aria-label="Reload preview" onClick={() => setFrameKey((k) => k + 1)}><FontAwesomeIcon icon={faRotateRight} /></Button>
              <Button variant="ghost" size="icon" aria-label="Copy code" disabled={!code} onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied"); }}><FontAwesomeIcon icon={faCopy} /></Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-panel">
            {!code ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {busy ? <span><FontAwesomeIcon icon={faSpinner} spin /> Building preview</span> : "Your app will appear here."}
              </div>
            ) : tab === "preview" ? (
              <iframe key={frameKey} title="App preview" srcDoc={code} sandbox="allow-scripts allow-forms allow-modals allow-popups" className="h-full w-full border-0 bg-card" />
            ) : (
              <pre className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-muted-foreground"><code>{code}</code></pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
