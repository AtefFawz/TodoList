/* Nawa service worker: installable app shell, offline assets and notification interactions. */
const CACHE_PREFIX = "nawa-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v5`;
const APP_ROOT = new URL("./", self.registration.scope).href;

async function cacheResponse(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (response.ok && response.type !== "opaque") {
      await cache.put(url, response.clone());
      return response;
    }
  } catch (error) {
    // One missing optional asset should not prevent the app from being installed.
    console.info("Nawa skipped an asset during offline setup:", url, error);
  }
  return null;
}

async function precacheAppShell(cache, htmlResponse) {
  const html = await htmlResponse.clone().text();
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("data:") && !value.startsWith("javascript:"));
  const assetUrls = new Set([
    new URL("manifest.json", APP_ROOT).href,
    new URL("favicon.svg", APP_ROOT).href,
    new URL("logo192.png", APP_ROOT).href,
    ...references.map((value) => {
      try { return new URL(value, APP_ROOT).href; }
      catch { return ""; }
    }),
  ]);

  const sameOriginAssets = [...assetUrls].filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.origin === self.location.origin && parsed.href !== APP_ROOT;
    } catch {
      return false;
    }
  });
  const responses = await Promise.all(sameOriginAssets.map((url) => cacheResponse(cache, url)));

  // Pre-cache local fonts and images referenced from the compiled CSS as well.
  const cssAssets = [];
  for (let index = 0; index < responses.length; index += 1) {
    const response = responses[index];
    if (!response || !sameOriginAssets[index].split("?")[0].endsWith(".css")) continue;
    const css = await response.clone().text();
    const referencesInCss = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((match) => match[1]);
    referencesInCss.forEach((reference) => {
      try {
        const asset = new URL(reference, sameOriginAssets[index]);
        if (asset.origin === self.location.origin) cssAssets.push(asset.href);
      } catch {
        // Ignore malformed or non-URL CSS references.
      }
    });
  }
  await Promise.all([...new Set(cssAssets)].map((url) => cacheResponse(cache, url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(APP_ROOT, { cache: "reload" });
      if (response.ok) {
        await cache.put(APP_ROOT, response.clone());
        await precacheAppShell(cache, response);
      }
    } catch (error) {
      // A fresh installation still works online; a later successful visit will cache the shell.
      console.info("Nawa shell will be cached on the next successful visit.", error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          await cache.put(APP_ROOT, response.clone());
        }
        return response;
      } catch (error) {
        const cachedPage = await caches.match(request) || await caches.match(APP_ROOT);
        if (cachedPage) return cachedPage;
        return new Response("نَواة غير متاحة دون اتصال لأول مرة. افتح التطبيق مرة واحدة أثناء الاتصال بالإنترنت.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
    return;
  }

  if (url.pathname.includes("/static/") || /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?|ttf|ico|json)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) {
        fetch(request).then(async (response) => {
          if (response.ok && response.type !== "opaque") {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
        }).catch(() => {});
        return cached;
      }
      const response = await fetch(request);
      if (response.ok && response.type !== "opaque") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data && event.notification.data.taskId;
  const destination = new URL("./", self.registration.scope);
  if (taskId) destination.searchParams.set("task", taskId);

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        if ("navigate" in client) await client.navigate(destination.href);
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(destination.href);
    return undefined;
  })());
});

self.addEventListener("push", (event) => {
  const rawPayload = event.data ? event.data.text() : "";
  let payload = {};
  try { payload = rawPayload ? JSON.parse(rawPayload) : {}; }
  catch { payload = { body: rawPayload || "لديك تذكير جديد." }; }
  const title = typeof payload.title === "string" ? payload.title : "تذكير من نَواة";
  const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "لديك مهمة تحتاج إلى انتباهك.",
    icon: new URL("logo192.png", self.registration.scope).href,
    badge: new URL("favicon.svg", self.registration.scope).href,
    data: { taskId },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
