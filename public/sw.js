// Polaris Engine safe service-worker shell.
// Deliberately contains no proxy, request-rewriting, or remote transport code.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});
