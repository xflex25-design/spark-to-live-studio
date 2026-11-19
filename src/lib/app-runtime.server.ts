import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  isValidCollectionName,
  isValidUuid,
  normalizeEmail,
  verifyPassword,
} from "./runtime-crypto";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

function getSupabaseServerConfig(): { url: string; key: string } | null {
  const url = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").trim();
  const key = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function buildSupabaseHeaders(key: string, extra?: Record<string, string>): Headers {
  const headers = new Headers(extra);
  headers.set("apikey", key);
  if (!key.startsWith("sb_publishable_") && !key.startsWith("sb_secret_")) {
    headers.set("Authorization", `Bearer ${key}`);
  }
  return headers;
}

async function pgRest<T>(
  cfg: { url: string; key: string },
  path: string,
  options: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  const headers = buildSupabaseHeaders(cfg.key, {
    "Content-Type": "application/json",
    ...(options.prefer ? { Prefer: options.prefer } : {}),
  });

  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const errObj = parsed as { message?: string; details?: string } | null;
    return {
      data: null,
      error: errObj?.message || errObj?.details || `Database error (${res.status})`,
      status: res.status,
    };
  }

  return { data: parsed as T, error: null, status: res.status };
}

type AppUserRow = {
  id: string;
  project_id: string;
  email: string;
  name: string;
  password_hash: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type PublicUser = {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function toPublicUser(row: AppUserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function resolveSessionUser(
  cfg: { url: string; key: string },
  projectId: string,
  request: Request,
): Promise<PublicUser | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const tokenHash = await hashSessionToken(token);
  const { data: sessions } = await pgRest<Array<{ user_id: string; expires_at: string }>>(
    cfg,
    `app_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}&project_id=eq.${encodeURIComponent(projectId)}&select=user_id,expires_at&limit=1`,
  );

  const session = sessions?.[0];
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await pgRest(cfg, `app_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
      method: "DELETE",
    });
    return null;
  }

  const { data: users } = await pgRest<AppUserRow[]>(
    cfg,
    `app_users?id=eq.${encodeURIComponent(session.user_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,project_id,email,name,metadata,created_at&limit=1`,
  );

  return users?.[0] ? toPublicUser(users[0]) : null;
}

async function createSession(
  cfg: { url: string; key: string },
  projectId: string,
  userId: string,
): Promise<string> {
  const rawToken = generateSessionToken();
  const tokenHash = await hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await pgRest(cfg, "app_sessions", {
    method: "POST",
    body: {
      token_hash: tokenHash,
      project_id: projectId,
      user_id: userId,
      expires_at: expiresAt,
    },
  });

  if (error) throw new Error(error);
  return rawToken;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function handleAppRuntimeRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/runtime/")) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const cfg = getSupabaseServerConfig();
  if (!cfg) {
    return jsonResponse(
      {
        error:
          "App backend runtime is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Secrets panel.",
      },
      503,
    );
  }

  const segments = url.pathname
    .slice("/api/runtime/".length)
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));

  const [projectId, resource, actionOrCollection, recordId] = segments;
  if (!projectId || !isValidUuid(projectId)) {
    return jsonResponse({ error: "Invalid project ID." }, 400);
  }

  try {
    // --- AUTH ROUTES ---
    if (resource === "auth") {
      if (actionOrCollection === "signup" && request.method === "POST") {
        const body = await readJsonBody(request);
        const email = normalizeEmail(String(body.email ?? ""));
        const password = String(body.password ?? "");
        const name = String(body.name ?? "")
          .trim()
          .slice(0, 120);

        if (!email) return jsonResponse({ error: "Please enter a valid email address." }, 400);
        if (password.length < 6) {
          return jsonResponse({ error: "Password must be at least 6 characters." }, 400);
        }

        const { data: existing } = await pgRest<Array<{ id: string }>>(
          cfg,
          `app_users?project_id=eq.${encodeURIComponent(projectId)}&email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
        );
        if (existing && existing.length > 0) {
          return jsonResponse({ error: "An account with this email already exists." }, 409);
        }

        const passwordHash = await hashPassword(password);
        const { data: inserted, error } = await pgRest<AppUserRow[]>(cfg, "app_users", {
          method: "POST",
          prefer: "return=representation",
          body: {
            project_id: projectId,
            email,
            name,
            password_hash: passwordHash,
            metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
          },
        });

        if (error || !inserted?.[0]) {
          return jsonResponse({ error: error || "Could not create account." }, 500);
        }

        const user = toPublicUser(inserted[0]);
        const token = await createSession(cfg, projectId, user.id);
        return jsonResponse({ user, token }, 201);
      }

      if (actionOrCollection === "login" && request.method === "POST") {
        const body = await readJsonBody(request);
        const email = normalizeEmail(String(body.email ?? ""));
        const password = String(body.password ?? "");

        if (!email || !password) {
          return jsonResponse({ error: "Email and password are required." }, 400);
        }

        const { data: users } = await pgRest<AppUserRow[]>(
          cfg,
          `app_users?project_id=eq.${encodeURIComponent(projectId)}&email=eq.${encodeURIComponent(email)}&select=id,project_id,email,name,password_hash,metadata,created_at&limit=1`,
        );

        const row = users?.[0];
        if (!row || !(await verifyPassword(password, row.password_hash))) {
          return jsonResponse({ error: "Invalid email or password." }, 401);
        }

        const user = toPublicUser(row);
        const token = await createSession(cfg, projectId, user.id);
        return jsonResponse({ user, token });
      }

      if (actionOrCollection === "logout" && request.method === "POST") {
        const token = readBearerToken(request);
        if (token) {
          const tokenHash = await hashSessionToken(token);
          await pgRest(
            cfg,
            `app_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}&project_id=eq.${encodeURIComponent(projectId)}`,
            { method: "DELETE" },
          );
        }
        return jsonResponse({ ok: true });
      }

      if (actionOrCollection === "me" && request.method === "GET") {
        const user = await resolveSessionUser(cfg, projectId, request);
        if (!user) return jsonResponse({ error: "Not authenticated." }, 401);
        return jsonResponse({ user });
      }

      return jsonResponse({ error: "Unknown auth endpoint." }, 404);
    }

    // --- DATABASE COLLECTION ROUTES ---
    if (resource === "db" && actionOrCollection) {
      if (!isValidCollectionName(actionOrCollection)) {
        return jsonResponse({ error: "Invalid collection name." }, 400);
      }

      const currentUser = await resolveSessionUser(cfg, projectId, request);

      if (request.method === "GET" && !recordId) {
        const mineOnly = url.searchParams.get("mine") === "true";
        if (mineOnly && !currentUser) {
          return jsonResponse({ error: "Sign in required to load your records." }, 401);
        }
        const rawLimit = Number(url.searchParams.get("limit") ?? 100);
        const limit = Number.isFinite(rawLimit)
          ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
          : 100;

        let query =
          `app_records?project_id=eq.${encodeURIComponent(projectId)}` +
          `&collection=eq.${encodeURIComponent(actionOrCollection)}` +
          `&select=id,collection,owner_id,data,created_at,updated_at` +
          `&order=created_at.desc&limit=${limit}`;
        if (mineOnly && currentUser) {
          query += `&owner_id=eq.${encodeURIComponent(currentUser.id)}`;
        }

        const { data: records, error } = await pgRest<unknown[]>(cfg, query);
        if (error) return jsonResponse({ error }, 500);
        return jsonResponse({ records: records ?? [] });
      }

      if (request.method === "POST" && !recordId) {
        const body = await readJsonBody(request);
        const payload = body.data !== undefined ? body.data : body;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return jsonResponse({ error: "Record data must be a JSON object." }, 400);
        }

        const { data: inserted, error } = await pgRest<unknown[]>(cfg, "app_records", {
          method: "POST",
          prefer: "return=representation",
          body: {
            project_id: projectId,
            collection: actionOrCollection,
            owner_id: currentUser?.id ?? null,
            data: payload,
          },
        });

        if (error || !inserted?.[0]) {
          return jsonResponse({ error: error || "Could not create record." }, 500);
        }
        return jsonResponse({ record: inserted[0] }, 201);
      }

      if ((request.method === "PATCH" || request.method === "DELETE") && recordId) {
        if (!isValidUuid(recordId)) {
          return jsonResponse({ error: "Invalid record ID." }, 400);
        }

        const { data: existing } = await pgRest<
          Array<{ id: string; owner_id: string | null; data: Record<string, unknown> }>
        >(
          cfg,
          `app_records?id=eq.${encodeURIComponent(recordId)}&project_id=eq.${encodeURIComponent(projectId)}&collection=eq.${encodeURIComponent(actionOrCollection)}&select=id,owner_id,data&limit=1`,
        );

        const row = existing?.[0];
        if (!row) return jsonResponse({ error: "Record not found." }, 404);
        if (row.owner_id && row.owner_id !== currentUser?.id) {
          return jsonResponse({ error: "Forbidden." }, 403);
        }

        if (request.method === "DELETE") {
          const { error } = await pgRest(
            cfg,
            `app_records?id=eq.${encodeURIComponent(recordId)}&project_id=eq.${encodeURIComponent(projectId)}`,
            { method: "DELETE" },
          );
          if (error) return jsonResponse({ error }, 500);
          return jsonResponse({ ok: true });
        }

        const body = await readJsonBody(request);
        const patch = body.data !== undefined ? body.data : body;
        if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
          return jsonResponse({ error: "Update data must be a JSON object." }, 400);
        }

        const merged = { ...(row.data ?? {}), ...(patch as Record<string, unknown>) };
        const { data: updated, error } = await pgRest<unknown[]>(
          cfg,
          `app_records?id=eq.${encodeURIComponent(recordId)}&project_id=eq.${encodeURIComponent(projectId)}`,
          {
            method: "PATCH",
            prefer: "return=representation",
            body: {
              data: merged,
              updated_at: new Date().toISOString(),
            },
          },
        );
        if (error || !updated?.[0]) {
          return jsonResponse({ error: error || "Could not update record." }, 500);
        }
        return jsonResponse({ record: updated[0] });
      }
    }

    return jsonResponse({ error: "Not found." }, 404);
  } catch (err) {
    console.error("[AppRuntime]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal runtime error." },
      500,
    );
  }
}
