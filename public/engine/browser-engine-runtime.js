/**
 * Polaris browser-engine boundary.
 *
 * The UI talks to this contract instead of depending on a particular engine.
 * Engine adapters may register themselves with register(); this module does
 * not rewrite requests, proxy traffic, or create hidden network connections.
 */
const ENGINE_KEY = Symbol.for("polaris.browserEngine");
const listeners = new Set();
let active = null;

function emit(type, detail = {}) {
  const event = Object.freeze({ type, detail, timestamp: Date.now() });
  for (const listener of listeners) {
    try { listener(event); } catch (error) { console.error("Polaris engine listener failed:", error); }
  }
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new TypeError("Engine adapter must be an object.");
  if (!adapter.id || typeof adapter.id !== "string") throw new TypeError("Engine adapter requires a string id.");
  if (typeof adapter.getStatus !== "function") throw new TypeError("Engine adapter requires getStatus().");
  return adapter;
}

const runtime = Object.freeze({
  version: "1.0.0",
  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Listener must be a function.");
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  register(adapter) {
    const next = validateAdapter(adapter);
    if (active && active.id !== next.id) {
      emit("engine:replaced", { previous: active.id, next: next.id });
    }
    active = next;
    emit("engine:registered", { id: next.id, label: next.label || next.id });
    return () => {
      if (active !== next) return;
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
    if (!active || typeof active.navigate !== "function") {
      throw new Error("No compatible browser engine is registered.");
    }
    if (options.engine && active.id !== options.engine) {
      throw new Error("The requested " + options.engine + " frame adapter is not registered.");
    }
    const parsed = new URL(url, location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only HTTP and HTTPS destinations are supported.");
    }
    emit("navigation:start", { url: parsed.href });
    try {
      const result = await active.navigate(parsed.href, options);
      emit("navigation:complete", { url: parsed.href });
      return result;
    } catch (error) {
      emit("navigation:error", { url: parsed.href, message: error?.message || String(error) });
      throw error;
    }
  }
});

Object.defineProperty(window, "PolarisBrowserEngine", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: runtime
});
emit("runtime:ready", { version: runtime.version });
