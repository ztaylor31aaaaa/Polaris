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
    let historyEntries = [];
    let historyIndex = -1;

    function load(next, record) {
      if (destroyed) return Promise.reject(new Error("This browser frame has been closed."));
      currentUrl = next;
      if (record) {
        historyEntries = historyEntries.slice(0, historyIndex + 1);
        historyEntries.push(next);
        if (historyEntries.length > 100) historyEntries.shift();
        historyIndex = historyEntries.length - 1;
      }
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
    }

    return {
      frame: iframe,
      get url() { return currentUrl; },
      go(value) {
        let next;
        try { next = validateUrl(value); }
        catch (error) { return Promise.reject(error); }
        return load(next, true);
      },
      back() {
        if (destroyed || historyIndex <= 0) return Promise.resolve(false);
        historyIndex--;
        return load(historyEntries[historyIndex], false);
      },
      forward() {
        if (destroyed || historyIndex >= historyEntries.length - 1) return Promise.resolve(false);
        historyIndex++;
        return load(historyEntries[historyIndex], false);
      },
      reload() {
        if (!destroyed && currentUrl) return load(currentUrl, false);
        return Promise.resolve(false);
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
