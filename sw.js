/**
 * Service Worker — 网络优先策略。
 * 在线时永远拿最新版（根治「改动没生效」的旧缓存问题），断网时回退缓存，离线可跑。
 * 只拦本站同源 GET；字体等外链直接走网络。改任何站内文件后无需动此文件。
 */
const CACHE = "xiangji-cache-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 字体等外链不拦
  e.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const clone = fresh.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return fresh;
      } catch (err) {
        const hit = await caches.match(req);
        if (hit) return hit;
        throw err;
      }
    })()
  );
});
