"use strict";
/* My Language hosted: sign-in, sync through Supabase, demo, offline cache and updates.
   Progress is three documents in the shared `docs` table (same account as My Budget):
   zb_state/settings {lang, script}, zb_state/fr {...}, zb_state/fa {...}.
   Every key in localStorage starts with "zb." because the site shares its origin with
   My Budget and Kanban on github.io. */
(function () {
  const APP_VERSION = "1.2.0";
  const REMOTE = "https://hamza-1224.github.io/my-language/";
  const FEEDS = "https://raw.githubusercontent.com/hamza-1224/my-language/feeds/";
  const NATIVE = location.protocol === "capacitor:" || location.protocol === "tauri:" || !!window.ZB_NATIVE_TEST;
  const COLL = "zb_state", IDS = ["settings", "fr", "fa"];
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isNetErr = e => !navigator.onLine || /fetch|network|load failed|timeout/i.test(String((e && (e.message || e.details)) || e || ""));

  /* ---------- merging two copies of one language's progress (used when both sides changed) ---------- */
  function mergeLang(a, b) {
    if (!a) return b; if (!b) return a;
    const out = Object.assign({}, b, a);
    const cards = Object.assign({}, b.cards);
    for (const [id, c] of Object.entries(a.cards || {})) {
      const o = cards[id];
      cards[id] = !o || (c.reps || 0) > (o.reps || 0) || ((c.reps || 0) === (o.reps || 0) && (c.due || 0) >= (o.due || 0)) ? c : o;
    }
    out.cards = cards;
    out.lessons = Object.assign({}, b.lessons);
    for (const [k, d] of Object.entries(a.lessons || {})) out.lessons[k] = Math.max(d, out.lessons[k] || 0);
    const log = Object.assign({}, b.log);
    for (const [d, n] of Object.entries(a.log || {})) log[d] = Math.max(n, log[d] || 0);
    out.log = log;
    const uniq = (x, y, key) => { const seen = new Set(), r = []; for (const it of (y || []).concat(x || [])) { const k = key(it); if (!seen.has(k)) { seen.add(k); r.push(it); } } return r; };
    out.read = uniq(a.read, b.read, x => x);
    out.custom = uniq(a.custom, b.custom, c => c.lvl + "|" + (c.v && c.v[0]));
    out.saved = uniq(a.saved, b.saved, s => s.id || s.link).sort((x, y) => (x.d || 0) - (y.d || 0));
    out.writing = uniq(a.writing, b.writing, w => w.d + "|" + w.text).sort((x, y) => x.d - y.d);
    const ia = a.intro || { d: 0, n: 0 }, ib = b.intro || { d: 0, n: 0 };
    out.intro = ia.d !== ib.d ? (ia.d > ib.d ? ia : ib) : { d: ia.d, n: Math.max(ia.n, ib.n) };
    out.ts = Math.max(a.ts || 0, b.ts || 0);
    return out;
  }

  /* ---------- the store: local copy first, outbox, Supabase, Realtime ---------- */
  function makeStore(sb, uid) {
    const KEY = "zb.cache." + uid, OUT = "zb.outbox." + uid;
    let data = LS.get(KEY) || {}, pending = LS.get(OUT) || [], live = false, flushing = null, onChange = () => {};
    const persist = () => { LS.set(KEY, data); LS.set(OUT, pending); };
    function take(id, remote) {
      const local = data[id];
      if (pending.includes(id)) data[id] = id === "settings" ? local : mergeLang(local, remote);
      else if (!local || (remote.ts || 0) >= (local.ts || 0)) data[id] = remote;
    }
    async function pull() {
      const { data: rows, error } = await sb.from("docs").select("coll,id,data").in("coll", [COLL]);
      if (error) throw error;
      rows.forEach(r => { if (IDS.includes(r.id)) take(r.id, r.data); });
      live = true; persist(); onChange();
      if (pending.length) flush().catch(() => {});
    }
    function flush() {
      if (flushing) return flushing;
      flushing = (async () => {
        while (pending.length) {
          const id = pending[0], doc = data[id];
          let r;
          try { r = await sb.from("docs").upsert({ user_id: uid, coll: COLL, id, data: doc, updated_at: new Date().toISOString() }, { onConflict: "user_id,coll,id" }); }
          catch (e) { r = { error: e }; }
          if (r.error) { if (isNetErr(r.error)) return; pending.shift(); persist(); throw r.error; }
          if (data[id] === doc) { pending.shift(); persist(); } // changed again meanwhile: send once more
        }
      })().finally(() => { flushing = null; status(); });
      return flushing;
    }
    function write(id, doc) {
      data[id] = doc; if (!pending.includes(id)) pending.push(id); persist(); status();
      flush().catch(e => toast("Couldn't save: " + (e.message || e)));
    }
    sb.channel("zb-" + uid)
      .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "user_id=eq." + uid }, p => {
        const r = p.new;
        if (!r || r.coll !== COLL || !IDS.includes(r.id) || pending.includes(r.id)) return;
        take(r.id, r.data); persist(); onChange();
      }).subscribe();
    return { get: id => data[id], write, pull, flush, isLive: () => live, pendingCount: () => pending.length,
      onChange: f => { onChange = f; }, clear() { LS.del(KEY); LS.del(OUT); } };
  }
  function makeLocalStore(KEY) {
    let data = LS.get(KEY) || {};
    return { get: id => data[id], write(id, doc) { data[id] = doc; LS.set(KEY, data); }, pull: () => Promise.resolve(), flush: () => Promise.resolve(),
      isLive: () => true, pendingCount: () => 0, onChange() {}, clear() { LS.del(KEY); } };
  }

  /* ---------- small UI: sign-in, settings, toast, notices ---------- */
  function overlay(html) {
    let el = document.getElementById("zbOverlay");
    if (!el) { el = document.createElement("div"); el.id = "zbOverlay"; document.body.appendChild(el); }
    el.innerHTML = html; el.hidden = !html; return el;
  }
  let toastT = 0;
  function toast(msg) {
    let el = document.getElementById("zbToast");
    if (!el) { el = document.createElement("div"); el.id = "zbToast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2800);
  }
  function notice(msg) {
    let el = document.getElementById("zbNotice");
    if (!el) { el = document.createElement("div"); el.id = "zbNotice"; const main = document.getElementById("main"); main.parentNode.insertBefore(el, main); }
    el.textContent = msg || ""; el.hidden = !msg;
  }
  let store = null, user = null, demo = false, sb = null;
  function status() {
    if (demo) return notice("Demo: your progress stays in this browser only and never reaches the database.");
    if (!store) return;
    notice(navigator.onLine ? "" : "You're offline. Progress is saved here and syncs when you're back online." + (store.pendingCount() ? " (" + store.pendingCount() + " waiting)" : ""));
  }
  const brand = '<div class="auth-hero"><img src="img/wave.png" alt=""><div class="logo">my language</div></div>';
  function showLogin(msg) {
    const el = overlay('<div class="zb-auth"><div class="card zb-auth-card">' + brand +
      '<h2>Sign in</h2><p class="muted">Use your My Budget account. Your progress syncs between your iPhone and Mac.</p>' +
      '<form id="zbForm"><label class="muted" for="zbE">Email</label><input id="zbE" type="email" autocomplete="email" inputmode="email" required>' +
      '<label class="muted" for="zbP">Password</label><input id="zbP" type="password" autocomplete="current-password" required>' +
      '<div class="zb-err" id="zbErr" role="alert">' + esc(msg || "") + '</div><button class="btn green wide" id="zbGo" type="submit">Sign in</button></form>' +
      '<button class="btn wide" id="zbDemo" type="button">Try the demo</button><p class="muted" style="text-align:center">The demo keeps its progress in your browser only.</p></div></div>');
    el.querySelector("#zbForm").addEventListener("submit", async e => {
      e.preventDefault(); const b = el.querySelector("#zbGo"), err = el.querySelector("#zbErr"); b.disabled = true; err.textContent = "";
      try { const r = await sb.auth.signInWithPassword({ email: el.querySelector("#zbE").value.trim(), password: el.querySelector("#zbP").value }); if (r.error) throw r.error; }
      catch (x) { b.disabled = false; const m = String(x.message || x); err.textContent = /invalid login/i.test(m) ? "That email and password don't match." : isNetErr(x) ? "Can't reach the server. Check your connection." : m; }
    });
    el.querySelector("#zbDemo").addEventListener("click", startDemo);
  }
  function showMessage(title, body) {
    overlay('<div class="zb-auth"><div class="card zb-auth-card">' + brand + '<h2>' + esc(title) + '</h2><p class="muted">' + esc(body) + '</p><button class="btn green wide" onclick="location.reload()">Try again</button></div></div>');
  }
  function openSettings() {
    const el = overlay('<div class="zb-sheet-scrim" id="zbScrim"><div class="card zb-sheet" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between"><h2>Settings</h2><button class="x" id="zbClose" aria-label="Close">✕</button></div>' +
      (demo ? '<p><b>Demo</b><br><span class="muted">Progress is kept in this browser only.</span></p>'
            : '<p><b>Signed in as</b><br><span class="muted">' + esc(user && user.email) + '</span></p><p><b>Sync</b><br><span class="muted">' + (navigator.onLine ? (store.pendingCount() ? store.pendingCount() + " change(s) waiting" : "Up to date") : "Offline") + '</span></p>') +
      '<p><b>Progress file</b><br><span class="muted">Bring in progress.json from the laptop version, or save a copy.</span></p>' +
      '<div class="row"><label class="zb-file"><input type="file" id="zbImport" accept=".json,application/json" hidden><span>Import progress.json</span></label><button class="btn" id="zbExport">Save a copy</button></div>' +
      '<p class="row" style="margin-top:18px"><button id="zbOut" class="btn red-outline">' + (demo ? "Leave demo" : "Sign out") + '</button></p>' +
      '<p class="muted">Version ' + APP_VERSION + '. Same account as My Budget and Kanban; each app keeps its data separate.</p></div></div>');
    const close = () => overlay("");
    el.querySelector("#zbClose").addEventListener("click", close);
    el.querySelector("#zbScrim").addEventListener("click", e => { if (e.target.id === "zbScrim") close(); });
    el.querySelector("#zbImport").addEventListener("change", async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (!j || typeof j !== "object" || !(j.fr || j.fa)) throw new Error("This isn't a My Language progress file.");
        const cur = api.current();
        const merged = { lang: j.lang || cur.lang, script: j.script || cur.script, fr: mergeLang(j.fr, cur.fr), fa: mergeLang(j.fa, cur.fa) };
        api.apply(merged); save(merged); close(); toast("Progress imported");
      } catch (x) { toast(String(x.message || x)); }
    });
    el.querySelector("#zbExport").addEventListener("click", async () => {
      const text = JSON.stringify(api.current(), null, 1), file = new File([text], "progress.json", { type: "application/json" });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = "progress.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    const out = el.querySelector("#zbOut");
    out.addEventListener("click", async () => {
      if (demo) { LS.del("zb.demo.on"); LS.del("zb.demo.data"); location.reload(); return; }
      if (!out.dataset.armed) { out.dataset.armed = "1"; out.textContent = "Tap again to sign out"; return; }
      try { store.clear(); } catch (e) {}
      await sb.auth.signOut({ scope: "local" }).catch(() => {}); location.reload();
    });
  }

  /* ---------- saving: split the app's state into the three documents ---------- */
  const lastJSON = {};
  let saveT = 0;
  function save(S) {
    if (!store) return;
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const parts = { settings: { lang: S.lang, script: S.script }, fr: S.fr, fa: S.fa };
      for (const id of IDS) {
        const j = JSON.stringify(parts[id]);
        if (j === lastJSON[id]) continue;
        lastJSON[id] = j; store.write(id, Object.assign(JSON.parse(j), { ts: Date.now() }));
      }
    }, 400);
  }
  function snapshot() {
    const st = store.get("settings") || {}, s = {};
    if (st.lang) s.lang = st.lang; if (st.script) s.script = st.script;
    for (const l of ["fr", "fa"]) { const d = store.get(l); if (d) { const c = Object.assign({}, d); delete c.ts; s[l] = c; } }
    return s;
  }
  function remember(S) { lastJSON.settings = JSON.stringify({ lang: S.lang, script: S.script }); lastJSON.fr = JSON.stringify(S.fr); lastJSON.fa = JSON.stringify(S.fa); }

  /* ---------- start ---------- */
  let api = null; // {apply(stateFromStore), current()} provided by app.js
  function begin(st, u) {
    store = st; user = u; overlay("");
    document.body.classList.remove("zb-out");
    api.apply(snapshot()); remember(api.current());
    store.onChange(() => { const s = snapshot(); if (!Object.keys(s).length) return; api.apply(s); remember(api.current()); });
    const refresh = () => store.flush().catch(() => {}).finally(() => store.pull().then(status).catch(e => { if (!isNetErr(e)) toast("Couldn't load your progress: " + (e.message || e)); status(); }));
    refresh(); status();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { refresh(); checkUpdate(); } });
    addEventListener("online", refresh); addEventListener("offline", status);
  }
  function startDemo() { LS.set("zb.demo.on", true); demo = true; begin(makeLocalStore("zb.demo.data"), { id: "demo" }); }

  /* ---------- updates ---------- */
  function newer(a, b) { a = String(a).split(".").map(Number); b = String(b).split(".").map(Number); for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i] || 0, y = b[i] || 0; if (x !== y) return x > y; } return false; }
  // The iPhone and Mac apps keep one self-contained page: the website's index.html with its
  // own scripts and stylesheet written into it (the database library, config and fonts ship inside the app).
  async function inlinePage(base, v) {
    const get = async p => { const r = await fetch(base + p + "?v=" + encodeURIComponent(v), { cache: "no-store" }); if (!r.ok) throw new Error(p); return r.text(); };
    let html = await get("index.html");
    const css = html.match(/<link rel="stylesheet" href="([^"]+)">/g) || [];
    for (const tag of css) { const p = tag.match(/href="([^"]+)"/)[1]; const code = await get(p); html = html.replace(tag, () => "<style>\n" + code + "\n</style>"); }
    const js = html.match(/<script src="((?:data\/)?[a-z-]+\.js)"><\/script>/g) || [];
    for (const tag of js) { const p = tag.match(/src="([^"]+)"/)[1]; if (p === "config.js") continue; const code = (await get(p)).replace(/<\/script/gi, "<\\/script"); html = html.replace(tag, () => "<script>\n" + code + "\n</script>"); }
    return html;
  }
  async function nativeFetchUpdate(v) {
    const st = LS.get("zb.native.app"); if (st && st.v === v) return true;
    const html = await inlinePage(REMOTE, v);
    if (!html.includes('APP_VERSION = "' + v + '"')) return false;
    try { localStorage.setItem("zb.native.app", JSON.stringify({ v, html })); localStorage.removeItem("zb.native.boot"); return true; } catch (e) { return false; }
  }
  async function checkUpdate() {
    try {
      const r = await fetch((NATIVE ? REMOTE : "") + "version.json?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) return; const j = await r.json();
      if (NATIVE && !(j && j.v && newer(j.v, APP_VERSION) && await nativeFetchUpdate(j.v))) return;
      if (j && j.v && j.v !== APP_VERSION && !document.getElementById("zbUpd")) {
        const b = document.createElement("button"); b.id = "zbUpd"; b.className = "btn green"; b.textContent = "Update ready · tap to reload";
        b.addEventListener("click", () => location.reload()); document.body.appendChild(b);
      }
    } catch (e) {}
  }

  /* ---------- weekly reading list for B1–C2, picked by a GitHub Action on the "feeds" branch ---------- */
  async function feed(lang) {
    try {
      const r = await fetch(FEEDS + lang + ".json?t=" + Math.floor(Date.now() / 6e5), { cache: "no-store" }); if (!r.ok) throw 0;
      const j = await r.json(); LS.set("zb.feed." + lang, j); return j;
    } catch (e) { return LS.get("zb.feed." + lang) || {}; } // {week, levels: {B1: [...], …}}
  }

  // In the Mac app, web links open in the browser.
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[href^='http']"), op = window.__TAURI__ && window.__TAURI__.opener; if (!a || !op) return; e.preventDefault(); op.openUrl(a.href).catch(() => {}); });

  async function init(appApi) {
    api = appApi;
    try { localStorage.removeItem("zb.native.boot"); } catch (e) {}
    const gear = document.getElementById("zbGear"); if (gear) gear.addEventListener("click", openSettings);
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
    checkUpdate(); setInterval(checkUpdate, 30 * 60 * 1000);
    if (LS.get("zb.demo.on") === true) { startDemo(); return; }
    document.body.classList.add("zb-out");
    const C = window.MB_CONFIG;
    if (!C || !window.supabase) return showMessage("Couldn't finish loading", "Part of the app didn't download, usually because the signal is weak.");
    sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: true, autoRefreshToken: true } });
    let session = null; try { session = (await sb.auth.getSession()).data.session; } catch (e) {}
    if (session) begin(makeStore(sb, session.user.id), session.user); else showLogin();
    sb.auth.onAuthStateChange((ev, s) => { if (s && !store && !demo && (ev === "SIGNED_IN" || ev === "INITIAL_SESSION")) begin(makeStore(sb, s.user.id), s.user); if (ev === "SIGNED_OUT" && store && !demo) location.reload(); });
  }

  window.ZB = { init, save, feed, toast, mergeLang, APP_VERSION, inlinePage, base: NATIVE ? REMOTE : "" };
})();
