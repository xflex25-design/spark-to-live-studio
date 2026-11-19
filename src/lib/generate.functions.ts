import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { GoogleGenAI } from "@google/genai";

const SYSTEM = `You are Forge, an expert full-stack engineer that builds complete, database-backed web apps.
Always reply with:
1. One or two short sentences describing what you built or changed.
2. The COMPLETE app as a single self-contained HTML document inside one \`\`\`html fenced block.

Rules for the HTML:
- One file. Use React 18 and ReactDOM from https://unpkg.com (UMD builds) with Babel standalone for JSX, and Tailwind via https://cdn.tailwindcss.com.
- A real Supabase-backed backend SDK is pre-injected globally as \`window.Orgraa\` for EVERY app:
  - Auth (real accounts + sessions persisted across refreshes):
    - \`await window.Orgraa.auth.signUp({ email, password, name })\` -> returns user \`{ id, email, name }\`
    - \`await window.Orgraa.auth.signIn({ email, password })\` -> returns user \`{ id, email, name }\`
    - \`await window.Orgraa.auth.signOut()\`
    - \`await window.Orgraa.auth.getUser()\` -> returns current user or \`null\`
  - Database (real Postgres collections persisted across refreshes and devices):
    - \`const col = window.Orgraa.db.collection("tasks")\` (use descriptive lowercase names)
    - \`await col.list()\` or \`await col.list({ mine: true })\` -> returns array of \`{ id, owner_id, data, created_at, updated_at }\`
    - \`await col.create({ title: "...", done: false })\` -> returns created record \`{ id, owner_id, data, ... }\`
    - \`await col.update(id, { done: true })\` -> returns updated record
    - \`await col.remove(id)\` -> deletes record
- Always use \`window.Orgraa.auth\` when the user asks for login/signup/accounts, and always use \`window.Orgraa.db.collection(...)\` to save and load data so all data persists in Postgres across refreshes. Do NOT use localStorage for app data (sandboxed iframes block localStorage).
- Handle loading and error states cleanly around async \`window.Orgraa\` calls.
- Make it polished, responsive and fully working. No placeholders, no TODOs.
- When changing an existing app, return the whole updated file, not a diff.`;

type Msg = { role: "user" | "assistant"; content: string };

async function callGemini(messages: Msg[]): Promise<string> {
  const apiKey =
    process.env["GEMINI_API_KEY"] || process.env["LOVABLE_API_KEY"] || process.env["API_KEY"];
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Please add your GEMINI_API_KEY in the Settings > Secrets panel.",
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const streamRes = await ai.models.generateContentStream({
      model: "gemini-4-neon",
      contents,
      config: {
        systemInstruction: SYSTEM,
      },
    });

    let text = "";
    for await (const chunk of streamRes) {
      if (chunk.text) text += chunk.text;
    }
    return text;
  } catch (err) {
    console.error("Gemini API error", err);
    const msg = err instanceof Error ? err.message : "AI generation failed.";
    if (/API_KEY_INVALID|PERMISSION_DENIED|403|400/i.test(msg)) {
      throw new Error(
        "Invalid or missing API key. Please check your GEMINI_API_KEY in the Settings > Secrets panel.",
      );
    }
    throw new Error(msg);
  }
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
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, code, name")
      .eq("id", data.projectId)
      .single();
    if (pErr || !project) throw new Error("Project not found.");

    await supabase
      .from("messages")
      .insert({ project_id: project.id, user_id: userId, role: "user", content: data.prompt });

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const msgs: Msg[] = (history ?? []).map((m) => ({
      role: m.role as Msg["role"],
      content: m.content,
    }));
    const last = msgs[msgs.length - 1];
    if (project.code && last) {
      last.content = `Current app code:\n\`\`\`html\n${project.code}\n\`\`\`\n\nRequest: ${last.content}`;
    }

    const text = await callGemini(msgs);
    const { html, summary } = extractHtml(text);

    await supabase
      .from("messages")
      .insert({ project_id: project.id, user_id: userId, role: "assistant", content: summary });
    const patch: { updated_at: string; code?: string; name?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (html) patch.code = html;
    if (project.name === "Untitled app") patch.name = data.prompt.slice(0, 48);
    await supabase.from("projects").update(patch).eq("id", project.id);

    return { summary, code: html ?? project.code };
  });
