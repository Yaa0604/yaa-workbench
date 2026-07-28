const CACHE = "wb-desk-v1";
const CORE = ["index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域请求（如 Supabase）不拦截，交给浏览器原生处理
  if (url.pathname.startsWith("/api/")) return; // 同步接口不缓存，保证实时
  // 主页面用 network-first：保证每天自动更新的热点能即时看到
  if (url.pathname.endsWith("index.html") || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }).catch(() => caches.match(req))
    );
  } else {
    // 静态资源用 cache-first
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(ca => ca.put(req, cp)); }
        return r;
      }))
    );
  }
});
