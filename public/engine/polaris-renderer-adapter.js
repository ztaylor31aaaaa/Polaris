/**
 * Safe, native-policy browser renderer adapter for Polaris.
 *
 * Uses the browser's ordinary fetch implementation and therefore obeys
 * same-origin/CORS rules. It does not rewrite requests, register proxy
 * workers, or provide an alternate network route.
 */
import { PolarisRenderer } from "./modules/renderer/renderer.js";

function makeAbortError() {
  return new DOMException("Navigation was cancelled.", "AbortError");
}

const adapter = {
  id: "polaris-renderer",
  label: "Polaris native-policy renderer",
  getStatus() {
    return {
      ready: true,
      transport: "native-fetch",
      networkPolicy: "browser-enforced CORS",
      scripts: "disabled",
      note: "Pages load only when their resources permit ordinary browser requests."
    };
  },
  async navigate(url, options = {}) {
    const container = options.container;
    if (!(container instanceof HTMLElement)) {
      throw new TypeError("A browser frame container is required.");
    }
    if (options.signal?.aborted) throw makeAbortError();

    const canvas = document.createElement("canvas");
    canvas.className = "polaris-renderer-canvas";
    canvas.setAttribute("role", "document");
    canvas.setAttribute("aria-label", "Rendered website");
    canvas.style.cssText = "display:block;width:100%;height:100%;min-height:320px;";

    const errorTarget = options.onError;
    const renderer = new PolarisRenderer({
      canvas,
      width: Math.max(320, container.clientWidth || 1024),
      height: Math.max(320, container.clientHeight || 720),
      onError: error => {
        console.warn("Polaris renderer:", error);
        if (typeof errorTarget === "function") errorTarget(error?.message || String(error));
      }
    });

    let disposed = false;
    let navigationController = null;
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(entries => {
          const box = entries[0]?.contentRect;
          if (!disposed && box?.width > 0 && box?.height > 0) {
            renderer.resize(box.width, box.height);
          }
        })
      : null;

    container.replaceChildren(canvas);
    resizeObserver?.observe(container);

    const navigate = async nextUrl => {
      if (disposed) throw new Error("This browser view has been closed.");
      navigationController?.abort();
      navigationController = new AbortController();
      const signal = navigationController.signal;
      if (options.signal?.aborted) throw makeAbortError();
      const abortFromParent = () => navigationController?.abort();
      options.signal?.addEventListener("abort", abortFromParent, { once: true });
      try {
        return await renderer.loadURL(nextUrl, { signal, executeScripts: false });
      } finally {
        options.signal?.removeEventListener("abort", abortFromParent);
      }
    };

    const handle = {
      canvas,
      renderer,
      url,
      async navigate(nextUrl) {
        const result = await navigate(nextUrl);
        handle.url = new URL(nextUrl, location.href).href;
        return result;
      },
      reload: () => navigate(handle.url),
      destroy() {
        if (disposed) return;
        disposed = true;
        navigationController?.abort();
        resizeObserver?.disconnect();
        renderer.destroy();
        canvas.remove();
      }
    };

    try {
      await navigate(url);
      if (disposed || options.signal?.aborted) {
        handle.destroy();
        throw makeAbortError();
      }
      options.onReady?.();
      return handle;
    } catch (error) {
      handle.destroy();
      throw error;
    }
  }
};

if (window.PolarisBrowserEngine) {
  window.PolarisRendererAdapterCleanup?.();
  window.PolarisRendererAdapterCleanup = window.PolarisBrowserEngine.register(adapter);
}
