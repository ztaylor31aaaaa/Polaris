(() => {
  const clean = value => String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const visible = el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  };
  const iconNodes = [...document.querySelectorAll("svg, [class*='icon' i], [class*='logo' i], [aria-label], [data-icon], [role='img']")]
    .filter(visible)
    .slice(0, 500)
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      label: clean(el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("data-icon")),
      classes: clean(typeof el.className === "string" ? el.className : el.className?.baseVal),
      text: clean(el.textContent),
      svgViewBox: el.tagName.toLowerCase() === "svg" ? el.getAttribute("viewBox") : null,
      symbolIds: el.tagName.toLowerCase() === "svg" ? [...el.querySelectorAll("use")].map(use => use.getAttribute("href") || use.getAttribute("xlink:href")).filter(Boolean) : []
    }));
  const symbols = [...document.querySelectorAll("symbol[id], svg[id]")]
    .map(el => ({ id: el.id, viewBox: el.getAttribute("viewBox"), tag: el.tagName.toLowerCase() }));
  const report = {
    page: location.origin + location.pathname,
    title: document.title,
    collectedAt: new Date().toISOString(),
    note: "Inventory of visible icon names, classes and SVG symbol references. This does not copy SVG artwork or proprietary assets.",
    icons: iconNodes,
    symbols
  };
  const output = JSON.stringify(report, null, 2);
  console.log("Cherri icon inventory:", report);
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