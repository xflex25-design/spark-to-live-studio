function getEnv(viteKey: string, serverKey: string): string | undefined {
  const fromVite = import.meta.env[viteKey];
  if (typeof fromVite === "string" && fromVite.trim()) {
    return fromVite.trim();
  }
  if (typeof process !== "undefined") {
    const fromProcess = process.env[serverKey];
    if (typeof fromProcess === "string" && fromProcess.trim()) {
      return fromProcess.trim();
    }
  }
  return undefined;
}

export function getSupabaseConfigError(): string | null {
  const url = getEnv("VITE_SUPABASE_URL", "SUPABASE_URL");
  const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");

  if (!url || !key) {
    return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your Secrets panel.";
  }

  if (url.includes("YOUR_PROJECT_REF") || key.includes("YOUR_SUPABASE_PUBLISHABLE_KEY")) {
    return "Replace the placeholder Supabase values with your real Project URL and publishable key.";
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Invalid VITE_SUPABASE_URL. Use your full Supabase Project URL (e.g. https://<project-ref>.supabase.co).";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Invalid VITE_SUPABASE_URL protocol. It must start with https://";
  }

  if (parsed.hostname === "supabase.com" && parsed.pathname.startsWith("/dashboard")) {
    return "VITE_SUPABASE_URL is set to the Supabase Dashboard URL. Use the API Project URL instead (https://<project-ref>.supabase.co).";
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigError() === null;
}
