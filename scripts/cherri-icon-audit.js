(() => {
  const run = async () => {
    // Let the current UI finish its next two render frames before scanning.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const clean = value => String(value || "").replace(/\\s+/g, " ").trim().slice(0, 220);
    const seen = new Set();
    const allElements = [];
    const roots = [document];
    const frameInfo = [];

    // Scan the main document, accessible shadow roots, and same-origin frames.
    while (roots.length) {
      const root = roots.shift();
      let elements = [];
      try { elements = [...root.querySelectorAll("*")]; } catch {}
      for (const el of elements) {
        if (seen.has(el)) continue;
        seen.add(el);
        allElements.push(el);
        if (el.shadowRoot) roots.push(el.shadowRoot);
        if (el.tagName?.toLowerCase() === "iframe") {
          let sameOrigin = false;
          try {
            const frameDoc = el.contentDocument;
            if (frameDoc) {
              sameOrigin = true;
              roots.push(frameDoc);
            }
          } catch {}
          frameInfo.push({ src: el.src || "", title: el.title || "", sameOrigin });
        }
      }
    }

    const visible = el => {
      try {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" &&
          Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      } catch { return false; }
    };
    const classText = el => clean(typeof el.className === "string" ? el.className : el.className?.baseVal);
    const pseudo = (el, part) => {
      try {
        const s = getComputedStyle(el, part);
        return {
          content: clean(s.content),
          fontFamily: clean(s.fontFamily),
          backgroundImage: s.backgroundImage !== "none" ? clean(s.backgroundImage) : "",
          maskImage: s.maskImage && s.maskImage !== "none" ? clean(s.maskImage) : ""
        };
      } catch { return null; }
    };

    const icons = allElements.filter(el => visible(el) && (
      /icon|glyph|symbol|logo/i.test(classText(el) + " " + el.id + " " + el.getAttribute("data-testid")) ||
      ["svg", "use", "img"].includes(el.tagName.toLowerCase()) ||
      el.hasAttribute("data-icon") || el.hasAttribute("aria-label") ||
      el.getAttribute("role") === "img" ||
      el.matches("button,[role='button'],a")
    )).slice(0, 2000).map(el => {
      const tag = el.tagName.toLowerCase();
      const svg = tag === "svg" ? el : el.querySelector?.("svg");
      const useNodes = [...(svg?.querySelectorAll("use") || [])];
      return {
        tag,
        label: clean(el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("data-icon") || el.getAttribute("alt")),
        text: clean(el.innerText || el.textContent),
        id: clean(el.id),
        classes: classText(el),
        role: el.getAttribute("role") || "",
        testId: el.getAttribute("data-testid") || "",
        svgViewBox: svg?.getAttribute("viewBox") || "",
        symbolRefs: useNodes.map(use => use.getAttribute("href") || use.getAttribute("xlink:href")).filter(Boolean),
        imageSrc: tag === "img" ? el.currentSrc || el.src : "",
        fontFamily: clean(getComputedStyle(el).fontFamily),
        before: pseudo(el, "::before"),
        after: pseudo(el, "::after")
      };
    });

    const symbols = allElements
      .filter(el => ["symbol", "svg"].includes(el.tagName.toLowerCase()) && el.id)
      .map(el => ({ id: el.id, tag: el.tagName.toLowerCase(), viewBox: el.getAttribute("viewBox") || "" }));
    const canvases = allElements
      .filter(el => el.tagName.toLowerCase() === "canvas")
      .map(el => ({ width: el.width, height: el.height, visible: visible(el), classes: classText(el) }));
    const fontFaces = [];
    const scannedSheets = new Set();
    for (const el of allElements) {
      const root = el.getRootNode?.();
      for (const sheet of [...(root?.styleSheets || [])]) {
        if (scannedSheets.has(sheet)) continue;
        scannedSheets.add(sheet);
        try {
          for (const rule of [...sheet.cssRules]) {
            if (rule.type === CSSRule.FONT_FACE_RULE) fontFaces.push(clean(rule.cssText));
          }
        } catch {}
      }
    }

    const report = {
      page: location.href,
      title: document.title,
      collectedAt: new Date().toISOString(),
      note: "Complete UI inventory. One compact JSON payload is copied once, after scanning finishes. Same-origin frames and accessible Shadow DOM are scanned; cross-origin frame contents cannot be read.",
      counts: {
        scannedElements: allElements.length,
        icons: icons.length,
        symbols: symbols.length,
        canvases: canvases.length,
        frames: frameInfo.length,
        fontFaces: fontFaces.length
      },
      icons, symbols, canvases, frames: frameInfo, fontFaces
    };

    // Make the report available globally and visibly, without clipboard permissions.
    window.__CHERRI_INVENTORY__ = report;
    const output = JSON.stringify(report);

    // Remove an earlier output panel if the script is run more than once.
    document.getElementById("__cherri_inventory_panel__")?.remove();

    const panel = document.createElement("div");
    panel.id = "__cherri_inventory_panel__";
    panel.style.cssText = [
      "position:fixed", "inset:16px", "z-index:2147483647",
      "background:#101827", "color:#fff", "border:2px solid #58bfff",
      "border-radius:10px", "padding:12px", "display:flex",
      "flex-direction:column", "gap:8px", "font:13px sans-serif",
      "box-shadow:0 8px 40px #0009"
    ].join(";");

    const heading = document.createElement("div");
    heading.textContent = "Cherri inventory ready — " + output.length + " characters. Click the text, then press Ctrl+A and Ctrl+C.";
    heading.style.cssText = "font-weight:700;flex:none";

    const close = document.createElement("button");
    close.textContent = "Close";
    close.style.cssText = "position:absolute;right:24px;top:22px;padding:6px 12px;cursor:pointer";
    close.addEventListener("click", () => panel.remove());

    const area = document.createElement("textarea");
    area.value = output;
    area.setAttribute("aria-label", "Complete Cherri UI inventory JSON");
    area.style.cssText = "box-sizing:border-box;flex:1;width:100%;min-height:0;resize:none;background:#07111f;color:#d7f3ff;border:1px solid #456;padding:10px;font:12px/1.4 monospace;white-space:pre;";

    panel.append(heading, close, area);
    (document.body || document.documentElement).appendChild(panel);
    area.focus();
    area.select();

    console.log("CHERRI INVENTORY READY — report saved to window.__CHERRI_INVENTORY__ (" + output.length + " characters).");
    return report;
  };

  run().catch(error => console.error("Cherri inventory failed:", error));
})();