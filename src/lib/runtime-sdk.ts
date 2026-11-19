export function buildOrgraaSdkScript(
  projectId: string,
  apiOrigin: string,
  initialToken: string | null = null,
): string {
  const config = JSON.stringify({
    projectId,
    apiBase: `${apiOrigin.replace(/\/+$/, "")}/api/runtime/${encodeURIComponent(projectId)}`,
    initialToken,
  }).replace(/</g, "\\u003c");

  return `<script>
(function () {
  var cfg = ${config};
  var token = cfg.initialToken || null;
  var listeners = [];

  function saveToken(next) {
    token = next || null;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: "orgraa-runtime-token", projectId: cfg.projectId, token: token },
          "*"
        );
      }
    } catch (_) {}
  }

  function notify(user) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](user); } catch (_) {}
    }
  }

  async function request(path, options) {
    var headers = Object.assign({ "Content-Type": "application/json" }, (options && options.headers) || {});
    if (token) headers["Authorization"] = "Bearer " + token;
    var res = await fetch(cfg.apiBase + path, Object.assign({}, options || {}, { headers: headers }));
    var text = await res.text();
    var json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) {}
    if (!res.ok) {
      throw new Error((json && json.error) || ("Request failed (" + res.status + ")"));
    }
    return json;
  }

  window.Orgraa = {
    projectId: cfg.projectId,
    auth: {
      signUp: async function (payload) {
        var res = await request("/auth/signup", { method: "POST", body: JSON.stringify(payload || {}) });
        saveToken(res.token);
        notify(res.user);
        return res.user;
      },
      signIn: async function (payload) {
        var res = await request("/auth/login", { method: "POST", body: JSON.stringify(payload || {}) });
        saveToken(res.token);
        notify(res.user);
        return res.user;
      },
      signOut: async function () {
        try { await request("/auth/logout", { method: "POST" }); } catch (_) {}
        saveToken(null);
        notify(null);
      },
      getUser: async function () {
        if (!token) return null;
        try {
          var res = await request("/auth/me", { method: "GET" });
          return res.user || null;
        } catch (_) {
          saveToken(null);
          return null;
        }
      },
      onAuthStateChange: function (cb) {
        listeners.push(cb);
        return function () {
          listeners = listeners.filter(function (fn) { return fn !== cb; });
        };
      }
    },
    db: {
      collection: function (name) {
        var col = encodeURIComponent(name);
        return {
          list: async function (opts) {
            var qs = opts && opts.mine ? "?mine=true" : "";
            var res = await request("/db/" + col + qs, { method: "GET" });
            return res.records || [];
          },
          create: async function (data) {
            var res = await request("/db/" + col, { method: "POST", body: JSON.stringify({ data: data }) });
            return res.record;
          },
          update: async function (id, data) {
            var res = await request("/db/" + col + "/" + encodeURIComponent(id), {
              method: "PATCH",
              body: JSON.stringify({ data: data })
            });
            return res.record;
          },
          remove: async function (id) {
            await request("/db/" + col + "/" + encodeURIComponent(id), { method: "DELETE" });
            return true;
          }
        };
      }
    }
  };
})();
</script>`;
}

export function injectOrgraaSdk(
  html: string,
  projectId: string,
  apiOrigin: string,
  initialToken: string | null = null,
): string {
  if (!html) return html;
  const script = buildOrgraaSdkScript(projectId, apiOrigin, initialToken);
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n${script}`);
  }
  return `${script}\n${html}`;
}
