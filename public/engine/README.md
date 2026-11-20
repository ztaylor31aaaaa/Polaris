# Polaris Engine browser integration

Polaris loads the standalone Engine 0.4 modules from `/engine/modules/` and exposes them through `window.PolarisEngine`.

Examples:

```js
// Browser capability report
const report = window.PolarisEngine.detectPlatform();

// Create tab state
const tabs = new window.PolarisEngine.TabManager();
const tab = tabs.create({ title: "Start" });

// Create a scoped permission manager
const permissions = new window.PolarisEngine.PermissionManager();
permissions.grant(tab.id, "fullscreen");

// Observe URL changes
const watcher = new window.PolarisEngine.UrlWatcher(window);
watcher.subscribe(change => console.log(change.url));
watcher.start();

// Track performance
const metrics = new window.PolarisEngine.PerformanceMonitor();
metrics.record("startup", performance.now());
console.log(metrics.summary("startup"));
```

The browser bridge exposes the module exports directly and also as `window.PolarisEngine.api`.

The legacy Scramjet proxy runtime is not loaded by the Polaris page. The service-worker shell is intentionally inert and does not intercept or rewrite requests. The Engine APIs are independent browser utilities and do not start proxy transports.
