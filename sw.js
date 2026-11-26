// Zabaan offline support.
// Pages, scripts and lessons: network first so updates arrive, but after 4 seconds on a weak
// connection (or if the network fails) the saved copy is used instead.
// The database library, fonts and icons never change between releases, so they load from the device.
const CACHE = "my-language-1.1.0";
const SHELL = ["./", "index.html", "style.css", "sync.js", "app.js", "data/french.js", "data/persian.js", "config.js", "vendor/supabase.js",
  "fonts/NotoNastaliqUrdu.ttf", "fonts/nunito-latin.woff2", "fonts/nunito-latin-ext.woff2",
  "img/airplane.png", "img/books.png", "img/brain.png", "img/bulb.png", "img/bullseye.png", "img/calendar.png", "img/chart.png", "img/check.png", "img/crown.png", "img/fire.png", "img/flags/fr.svg", "img/flags/ir.svg", "img/food.png", "img/gear.png", "img/gem.png", "img/globe.png", "img/graduation.png", "img/house.png", "img/lock.png", "img/map.png", "img/muscle.png", "img/newspaper.png", "img/open-book.png", "img/party.png", "img/pencil.png", "img/scroll.png", "img/sparkles.png", "img/speaker.png", "img/star.png", "img/tea.png", "img/trophy.png", "img/wave.png",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const STATIC = /\/(vendor\/supabase\.js|fonts\/[^/]+|img\/.+|icon-192\.png|icon-512\.png|apple-touch-icon\.png)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("my-language-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req) {
  return fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.endsWith("version.json")) return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached && STATIC.test(url.pathname)) return cached;
    const net = fromNetwork(req);
    try {
      const res = await (cached ? Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error("slow")), 4000))]) : net);
      if (res.ok || !cached) return res;
      return cached;
    } catch (err) {
      if (cached) return cached;
      if (req.mode === "navigate") {
        const page = await caches.match("index.html");
        if (page) return page;
      }
      throw err;
    }
  })());
});
