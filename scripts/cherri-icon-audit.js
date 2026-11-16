(() => {
  const clean = value => String(value || "").replace(/\\s+/g, " ").trim().slice(0, 220);
  const seen = new Set();
  const allElements = [];
  const roots = [document];
  while (roots.length) {
    const root = roots.shift();
    let elements = [];
    try { elements = [...root.querySelectorAll("*")]; } catch {}
    for (const el of elements) {
      if (seen.has(el)) continue;
      seen.add(el);
      allElements.push(el);
      if (el.shadowRoot) roots.push(el.shadowRoot);
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
  )).slice(0, 1200).map(el => {
    const tag = el.tagName.toLowerCase();
    const svg = tag === "svg" ? el : el.querySelector?.("svg");
    const useNodes = [...(svg?.querySelectorAll("use") || [])];
    const before = pseudo(el, "::before");
    const after = pseudo(el, "::after");
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
      before,
      after
    };
  });
  const symbols = allElements.filter(el => ["symbol", "svg"].includes(el.tagName.toLowerCase()) && el.id)
    .map(el => ({ id: el.id, tag: el.tagName.toLowerCase(), viewBox: el.getAttribute("viewBox") || "" }));
  const canvases = allElements.filter(el => el.tagName.toLowerCase() === "canvas")
    .map(el => ({ width: el.width, height: el.height, visible: visible(el), classes: classText(el) }));
  const frames = [...document.querySelectorAll("iframe")].map(frame => ({
    src: frame.src, title: frame.title, sameOrigin: (() => { try { return !!frame.contentDocument; } catch { return false; } })()
  }));
  const fontFaces = [];
  for (const sheet of [...document.styleSheets]) {
    try {
      for (const rule of [...sheet.cssRules]) {
        if (rule.type === CSSRule.FONT_FACE_RULE) {
          fontFaces.push(clean(rule.cssText));
        }
      }
    } catch {}
  }
  const report = {
    page: location.href,
    title: document.title,
    collectedAt: new Date().toISOString(),
    note: "Expanded UI inventory: icon-like elements, controls, SVG symbol references, pseudo-element glyphs, icon fonts, canvases and iframe metadata. Shadow DOM is scanned where accessible. Cross-origin frame contents are not inspected.",
    counts: { scannedElements: allElements.length, icons: icons.length, symbols: symbols.length, canvases: canvases.length, frames: frames.length },
    icons, symbols, canvases, frames, fontFaces
  };
  const output = JSON.stringify(report, null, 2);
  console.log("Cherri UI inventory:", report);
  if (typeof copy === "function") {
    copy(output);
    console.log("Inventory copied to clipboard.");
  } else if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(output).then(() => console.log("Inventory copied to clipboard.")).catch(() => console.log(output));
  } else {
    console.log("Clipboard unavailable; copy the JSON above.");
  }
  return report;
})();