import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You are Forge, an expert front-end engineer that builds complete web apps.
Always reply with:
1. One or two short sentences describing what you built or changed.
2. The COMPLETE app as a single self-contained HTML document inside one \`\`\`html fenced block.

Rules for the HTML:
- One file. Use React 18 and ReactDOM from https://unpkg.com (UMD builds) with Babel standalone for JSX, and Tailwind via https://cdn.tailwindcss.com.
- Persist data with localStorage when the app needs saved state.
- Make it polished, responsive and fully working. No placeholders, no TODOs.
- When changing an existing app, return the whole updated file, not a diff.`;

type Msg = { role: "user" | "assistant"; content: string };

async function callClaude(messages: Msg[]): Promise<string> {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-5",
      max_tokens: 32000,
      system: SYSTEM,
      messages,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text();
    console.error("AI gateway error", res.status, body);
    let msg = `AI request failed (${res.status}).`;
    try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? msg; } catch {}
    if (res.status === 402) msg = "Out of AI credits. " + msg;
    if (res.status === 429) msg = "Too many requests, try again in a moment.";
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let stop: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        let evt: any;
        try { evt = JSON.parse(data); } catch { continue; }
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") text += evt.delta.text;
        if (evt.type === "message_delta" && evt.delta?.stop_reason) stop = evt.delta.stop_reason;
        if (evt.type === "error") throw new Error(evt.error?.message ?? "AI stream error.");
      }
    }
  }
  if (stop === "refusal") throw new Error("The AI declined this request.");
  return text;
}

export function extractHtml(text: string): { html: string | null; summary: string } {
  const m = text.match(/```html\s*([\s\S]*?)(```|$)/i);
  const html = m?.[1] ? m[1].trim() : null;
  const summary = (m ? text.slice(0, m.index) : text).trim() || "Updated the app.";
  return { html, summary };
}

export const generateApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; prompt: string }) => {
    if (!input?.projectId || typeof input.prompt !== "string") throw new Error("Invalid input");
    const prompt = input.prompt.trim();
    if (!prompt || prompt.length > 8000) throw new Error("Prompt must be 1-8000 characters.");
    return { projectId: input.projectId, prompt };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error: pErr } = await supabase.from("projects").select("id, code, name").eq("id", data.projectId).single();
    if (pErr || !project) throw new Error("Project not found.");

    await supabase.from("messages").insert({ project_id: project.id, user_id: userId, role: "user", content: data.prompt });

    const { data: history } = await supabase
      .from("messages").select("role, content").eq("project_id", project.id)
      .order("created_at", { ascending: true }).limit(20);

    const msgs: Msg[] = (history ?? []).map((m) => ({ role: m.role as Msg["role"], content: m.content }));
    const last = msgs[msgs.length - 1];
    if (project.code && last) {
      last.content = `Current app code:\n\`\`\`html\n${project.code}\n\`\`\`\n\nRequest: ${last.content}`;
    }

    const text = await callClaude(msgs);
    const { html, summary } = extractHtml(text);

    await supabase.from("messages").insert({ project_id: project.id, user_id: userId, role: "assistant", content: summary });
    const patch: { updated_at: string; code?: string; name?: string } = { updated_at: new Date().toISOString() };
    if (html) patch.code = html;
    if (project.name === "Untitled app") patch.name = data.prompt.slice(0, 48);
    await supabase.from("projects").update(patch).eq("id", project.id);

    return { summary, code: html ?? project.code };
  });
