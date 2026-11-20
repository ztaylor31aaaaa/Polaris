import { runDiagnostics } from "./diagnostics.js";

const styles = `
#polaris-engine-button{border:1px solid var(--line,#333);background:var(--panel,#171a22);color:var(--text,#fff);border-radius:9px;padding:7px 10px;font:inherit;font-size:12px;cursor:pointer}
#polaris-engine-panel{position:fixed;z-index:99999;right:18px;top:88px;width:min(390px,calc(100vw - 36px));max-height:70vh;overflow:auto;background:var(--panel,#171a22);color:var(--text,#fff);border:1px solid var(--line,#333);border-radius:14px;padding:16px;box-shadow:0 18px 60px #0008;font:13px/1.5 system-ui,sans-serif}
#polaris-engine-panel[hidden]{display:none}
#polaris-engine-panel h2{font-size:16px;margin:0 0 4px}
#polaris-engine-panel p{color:var(--muted,#aaa);margin:4px 0 12px}
#polaris-engine-panel .pe-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--line,#333)}
#polaris-engine-panel .pe-pass{color:#39c98a}#polaris-engine-panel .pe-warn{color:#e6b85c}
#polaris-engine-panel button{border:1px solid var(--line,#444);background:transparent;color:inherit;border-radius:8px;padding:7px 10px;cursor:pointer}
`;
function resolveAddress(input, searchUrl = "https://www.google.com/search?q=%s") {
  const value = String(input ?? "").trim();
  if (!value) throw new TypeError("Enter a website address or search term.");
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  const hasWebScheme = /^https?:\/\//i.test(value);
  if (hasScheme && !hasWebScheme) throw new TypeError("Only HTTP and HTTPS addresses are supported.");
  const looksLikeHost = /^(localhost|\[[0-9a-f:]+\]|[^\s/]+\.[a-z]{2,})(:\d+)?([/?#].*)?$/i.test(value);
  const candidate = hasWebScheme ? value : looksLikeHost ? "https://" + value : null;
  if (!candidate) {
    if (!searchUrl.includes("%s")) throw new TypeError("Search URL must contain %s.");
    return new URL(searchUrl.replace("%s", encodeURIComponent(value))).href;
  }
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol)) throw new TypeError("Only HTTP and HTTPS addresses are supported.");
  return url.href;
}
const style = document.createElement("style");
style.textContent = styles;
document.head.append(style);
const button = document.createElement("button");
button.id = "polaris-engine-button";
button.type = "button";
button.textContent = "Engine";
button.title = "Polaris Engine diagnostics";
const actions = document.querySelector(".browser-window-actions");
if (actions) actions.prepend(button);
const panel = document.createElement("section");
panel.id = "polaris-engine-panel";
panel.hidden = true;
panel.innerHTML = '<h2>Polaris Engine <small>0.4.0</small></h2><p>Expanded runtime foundation: per-tab lifecycle, settings, permissions, extensions, commands, telemetry and document adapters. The legacy proxy runtime is disabled in this build. This panel reports browser capabilities and the standalone Polaris Engine APIs.</p><div id="polaris-engine-results">Diagnostics have not been run.</div><p><button id="polaris-engine-run" type="button">Run diagnostics</button> <button id="polaris-engine-close" type="button">Close</button></p>';
document.body.append(panel);
button.addEventListener("click", async () => {
  panel.hidden = !panel.hidden;
  if (!panel.hidden && !panel.dataset.checked) await run();
});
panel.querySelector("#polaris-engine-close").addEventListener("click", () => { panel.hidden = true; });
panel.querySelector("#polaris-engine-run").addEventListener("click", run);
async function run() {
  const target = panel.querySelector("#polaris-engine-results");
  target.textContent = "Checking browser capabilities…";
  try {
    const report = await runDiagnostics();
    target.innerHTML = report.checks.map(item => '<div class="pe-row"><span>' + item.name + '</span><strong class="pe-' + item.status + '">' + item.status.toUpperCase() + '</strong></div>').join("");
    panel.dataset.checked = "true";
  } catch (error) {
    target.textContent = "Diagnostics failed: " + error.message;
  }
}
window.PolarisEngine = Object.freeze({
  name: "Polaris Engine",
  version: "0.4.0",
  resolveAddress,
  runDiagnostics,
  capabilities: Object.freeze(["tab-runtime", "runtime-manager", "disposable-resources", "permission-manager", "origin-policy", "settings-manager", "extension-registry", "command-registry", "performance-monitor", "view-adapter", "platform-detection", "worker-manager", "message-rpc", "cache-store", "dom-observer", "url-tools", "mime-utils", "frame-controller", "plugin-manager", "url-watcher"])
});
