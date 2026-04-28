/* Sunday Fun Day — service worker.
 *
 * Phase 6 goal: keep the score-entry write path resilient under flaky
 * mobile networks. Strategy:
 *   - Intercept PUT /api/games/:id/scores fetches.
 *   - Try the network. On 2xx/3xx/4xx, return the response unchanged
 *     (4xx is a logical failure the UI must surface, not a transient one).
 *   - On 5xx or thrown fetch (offline), serialise the request to IndexedDB,
 *     return a synthetic 202 with { queued: true } so the optimistic UI is
 *     unaffected, and ask the BackgroundSync API to wake us up later.
 *   - On `sync` events (Android/Chrome) and `message` { type: "sync-now" }
 *     (iOS Safari fallback button), drain the queue.
 *   - Notify all open clients on every queue change so the header badge
 *     stays accurate without polling.
 *
 * The script runs as a *Service Worker* — no module imports, no Next types.
 * Logic kept here intentionally small; reusable bits live in
 * /src/lib/sync/policy.ts (mirrored — see queueablePolicy below).
 */

const QUEUE_DB = "sunday-funday-sync";
const QUEUE_DB_VERSION = 1;
const QUEUE_STORE = "scoreQueue";
const SYNC_TAG = "sync-scores";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "PUT") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!isScoreWritePath(url.pathname)) return;
  event.respondWith(handleScoreWrite(request));
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueue());
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "sync-now") {
    event.waitUntil(replayQueue());
    return;
  }
  if (data.type === "queue-count") {
    event.waitUntil(
      (async () => {
        const count = await queueCount();
        if (event.source) event.source.postMessage({ type: "queue-count", count });
      })(),
    );
  }
});

async function handleScoreWrite(request) {
  // Clone before consuming, otherwise we can't serialise the body if the
  // network attempt fails halfway.
  const stored = await serialiseRequest(request.clone());
  try {
    const res = await fetch(request);
    if (res.status >= 500) {
      await safeQueue(stored);
      return synthetic202();
    }
    return res;
  } catch {
    await safeQueue(stored);
    return synthetic202();
  }
}

async function safeQueue(item) {
  try {
    await enqueue(item);
    await registerBackgroundSync();
    await notifyClientsQueueChanged();
  } catch (err) {
    // Don't let queue-side failures escape and turn into a "Failed to fetch"
    // for the page — in that case we'd be no better off than not having a
    // SW at all. Console.warn so it shows up while debugging.
    console.warn("[sw] failed to enqueue", err && err.message ? err.message : err);
    // Surface to clients too so the badge / toast can react.
    const all = await self.clients.matchAll({ includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: "queue-error", message: String(err) });
  }
}

function synthetic202() {
  return new Response(JSON.stringify({ ok: true, queued: true }), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
}

async function serialiseRequest(request) {
  const body = await request.text();
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return {
    url: request.url,
    method: request.method,
    headers,
    body,
    queuedAt: Date.now(),
  };
}

async function replayQueue() {
  const items = await readAll();
  let drained = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        // Replay isn't user-driven so we can be more aggressive here.
        keepalive: false,
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // 4xx means the server has a final answer — don't keep retrying.
        await remove(item.id);
        drained++;
      } else {
        // 5xx — leave queued for the next attempt.
        break;
      }
    } catch {
      // Network down again. Stop replaying; wait for next sync.
      break;
    }
  }
  if (drained > 0) await notifyClientsQueueChanged();
}

async function registerBackgroundSync() {
  // BackgroundSync API is missing on iOS Safari — degrade silently. The
  // manual "Sync now" button covers that case (see SyncBadge).
  if (!self.registration || !("sync" in self.registration)) return;
  try {
    await self.registration.sync.register(SYNC_TAG);
  } catch {
    // Registration can fail when the SW is freshly installed and not yet
    // active; the next `online` event from the page will retry via
    // postMessage.
  }
}

async function notifyClientsQueueChanged() {
  const count = await queueCount();
  const all = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of all) {
    client.postMessage({ type: "queue-count", count });
  }
}

// ----- IndexedDB helpers -----

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, QUEUE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  const t = db.transaction(QUEUE_STORE, mode);
  return { tx: t, store: t.objectStore(QUEUE_STORE) };
}

async function enqueue(item) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const { tx: t, store } = tx(db, "readwrite");
    store.add(item);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function readAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const { store } = tx(db, "readonly");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const { tx: t, store } = tx(db, "readwrite");
    store.delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function queueCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const { store } = tx(db, "readonly");
    const req = store.count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

// Local copy of `isScoreWritePath` from src/lib/sync/policy.ts. Service
// workers can't import app code, so the regex is duplicated; the unit test
// next to that module guards the canonical version.
function isScoreWritePath(pathname) {
  return /^\/api\/games\/[^/]+\/scores$/.test(pathname);
}
