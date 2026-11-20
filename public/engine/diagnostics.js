export async function runDiagnostics() {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, status: ok ? "pass" : "warn", detail });
  add("JavaScript modules", true, "ES modules are available.");
  add("Fetch API", typeof fetch === "function", "Fetch API availability.");
  add("URL API", typeof URL === "function", "URL parsing availability.");
  let storage = false;
  try { storage = typeof localStorage !== "undefined"; } catch {}
  add("Local storage", storage, "Storage may be restricted by browser privacy settings.");
  add("Service workers", "serviceWorker" in navigator, "Availability only; no worker is registered.");
  add("WebSocket API", typeof WebSocket === "function", "API availability only; no external connection is attempted.");
  return { checkedAt: new Date().toISOString(), checks, healthy: checks.every(item => item.status === "pass") };
}
