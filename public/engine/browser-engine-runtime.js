/**
 * Polaris browser-engine boundary.
 *
 * Provides adapter registration, per-tab frame lifecycle and safe navigation
 * coordination. Network transports are deliberately supplied by the host;
 * this runtime does not create or configure proxy connections.
 */
const listeners = new Set();
const sessions = new Map();
let active = null;

function emit(type, detail = {}) {
  const event = Object.freeze({ type, detail, timestamp: Date.now() });
  for (const listener of listeners) {
    try { listener(event); } catch (error) { console.error("Polaris engine listener failed:", error); }
  }
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new TypeError("Engine adapter must be an object.");
  if (typeof adapter.id !== "string" || !adapter.id.trim()) throw new TypeError("Engine adapter requires a string id.");
  if (typeof adapter.getStatus !== "function") throw new TypeError("Engine adapter requires getStatus().");
  if (typeof adapter.navigate !== "function") throw new TypeError("Engine adapter requires navigate().");
  return adapter;
}

function destroySession(tabId) {
  const session = sessions.get(tabId);
  if (!session) return;
  session.controller?.abort("Tab closed or navigation replaced.");
  try { session.handle?.destroy?.(); } catch (error) { console.warn("Frame cleanup failed:", error); }
  sessions.delete(tabId);
  emit("frame:disposed", { tabId });
}

const runtime = Object.freeze({
  version: "1.2.0",
  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Listener must be a function.");
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  register(adapter) {
    const next = validateAdapter(adapter);
    if (active && active !== next) emit("engine:replaced", { previous: active.id, next: next.id });
    active = next;
    emit("engine:registered", { id: next.id, label: next.label || next.id });
    return () => {
      if (active !== next) return;
      for (const tabId of [...sessions.keys()]) destroySession(tabId);
      active = null;
      emit("engine:unregistered", { id: next.id });
    };
  },
  getAdapter() { return active; },
  async getStatus() {
    if (!active) return Object.freeze({ state: "unavailable", engine: null, message: "No browser engine adapter is registered." });
    try {
      const status = await active.getStatus();
      return Object.freeze({ state: "available", engine: active.id, ...status });
    } catch (error) {
      return Object.freeze({ state: "error", engine: active.id, message: error?.message || String(error) });
    }
  },
  async navigate(url, options = {}) {
    const adapter = active;
    if (!adapter) throw new Error("No browser engine adapter is registered.");
    if (options.engine && adapter.id !== options.engine) {
      throw new Error("The requested " + options.engine + " frame adapter is not registered.");
    }
    const parsed = new URL(url, location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP and HTTPS destinations are supported.");

    const tabId = String(options.tabId || "default");
    destroySession(tabId);
    const controller = new AbortController();
    const session = { adapter, controller, handle: null, url: parsed.href };
    sessions.set(tabId, session);
    emit("navigation:start", { url: parsed.href, tabId, engine: adapter.id });

    try {
      const result = await adapter.navigate(parsed.href, {
        ...options,
        signal: controller.signal,
        tabId
      });
      if (controller.signal.aborted || sessions.get(tabId) !== session) {
        try { result?.destroy?.(); } catch {}
        return null;
      }
      session.handle = result && typeof result === "object" ? result : null;
      emit("navigation:complete", { url: parsed.href, tabId, engine: adapter.id });
      return session.handle;
    } catch (error) {
      if (sessions.get(tabId) === session) sessions.delete(tabId);
      emit("navigation:error", { url: parsed.href, tabId, engine: adapter.id, message: error?.message || String(error) });
      throw error;
    }
  },
  disposeTab(tabId) { destroySession(String(tabId || "default")); },
  disposeAll() { for (const tabId of [...sessions.keys()]) destroySession(tabId); },
  getSession(tabId) {
    const session = sessions.get(String(tabId || "default"));
    return session ? Object.freeze({ engine: session.adapter.id, url: session.url }) : null;
  }
});

Object.defineProperty(window, "PolarisBrowserEngine", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: runtime
});
emit("runtime:ready", { version: runtime.version });
