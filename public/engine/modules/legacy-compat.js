// Polaris legacy-browser compatibility boundary.
// Uses a normal cross-origin iframe; it does not rewrite requests or proxy traffic.
(() => {
  "use strict";
  const allowedProtocols = new Set(["http:", "https:"]);
  const sandbox = [
    "allow-forms",
    "allow-scripts",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-downloads",
    "allow-modals",
    "allow-pointer-lock"
  ].join(" ");

  function validateUrl(value) {
    const url = new URL(String(value), window.location.href);
    if (!allowedProtocols.has(url.protocol)) {
      throw new TypeError("Only HTTP and HTTPS website addresses are supported.");
    }
    return url.href;
  }

  function createFrame() {
    const iframe = document.createElement("iframe");
    iframe.className = "web-scramjet-frame";
    iframe.title = "Polaris website";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.loading = "eager";
    iframe.setAttribute("sandbox", sandbox);
    iframe.setAttribute("allow", "fullscreen; autoplay; clipboard-read; clipboard-write");
    iframe.setAttribute("allowfullscreen", "");
    let destroyed = false;
    let currentUrl = "";

    return {
      frame: iframe,
      get url() { return currentUrl; },
      go(value) {
        if (destroyed) return Promise.reject(new Error("This browser frame has been closed."));
        let next;
        try { next = validateUrl(value); }
        catch (error) { return Promise.reject(error); }
        currentUrl = next;
        return new Promise((resolve, reject) => {
          let timer = setTimeout(() => {
            cleanup();
            reject(new Error("The website did not finish loading in time. It may be offline or may block embedded browsing."));
          }, 25000);
          const onLoad = () => { cleanup(); resolve({ url: next, mode: "native-iframe" }); };
          const onError = () => { cleanup(); reject(new Error("The browser could not load this website.")); };
          const cleanup = () => {
            clearTimeout(timer);
            iframe.removeEventListener("load", onLoad);
            iframe.removeEventListener("error", onError);
          };
          iframe.addEventListener("load", onLoad, { once: true });
          iframe.addEventListener("error", onError, { once: true });
          iframe.src = next;
        });
      },
      reload() {
        if (!destroyed && currentUrl) iframe.src = currentUrl;
      },
      destroy() {
        destroyed = true;
        iframe.remove();
      }
    };
  }

  function createController() {
    return Object.freeze({
      mode: "native-iframe",
      async init() { return true; },
      createFrame,
      destroy() {}
    });
  }

  window.PolarisLegacyCompat = Object.freeze({
    name: "Polaris Legacy Browser Compatibility",
    version: "1.0.0",
    mode: "native-iframe",
    createController
  });
})();
