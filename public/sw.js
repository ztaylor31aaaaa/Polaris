importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("fetch", event => {
  // Only initialize Scramjet's IndexedDB config for requests that Scramjet
  // actually handles. Loading config for every request creates a race:
  // controller.init() fetches its own assets while creating the config store.
  if (!scramjet.route(event)) return;

  event.respondWith((async () => {
    await scramjet.loadConfig();
    return scramjet.fetch(event);
  })());
});
