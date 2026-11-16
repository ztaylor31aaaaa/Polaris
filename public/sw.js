importScripts("/scram/scramjet.all.js");

const SCRAMJET_STORES = [
  "config",
  "cookies",
  "redirectTrackers",
  "referrerPolicies",
  "publicSuffixList"
];

function openScramjetDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("$scramjet", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of SCRAMJET_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const missingStores = SCRAMJET_STORES.filter(
        store => !db.objectStoreNames.contains(store)
      );

      if (missingStores.length === 0) {
        db.close();
        resolve();
        return;
      }

      // Scramjet 1.1.0 can leave an empty v1 database behind if the
      // service worker opens it before the controller. Recreate only
      // that empty database; never discard a database containing data.
      if (db.objectStoreNames.length !== 0) {
        db.close();
        reject(new Error(
          "The Scramjet database has an incomplete schema. Missing: " +
          missingStores.join(", ") +
          ". Close other Polaris tabs and reset the Scramjet database."
        ));
        return;
      }

      db.close();
      const deletion = indexedDB.deleteDatabase("$scramjet");
      deletion.onblocked = () => reject(new Error(
        "The Scramjet database is still open in another Polaris tab. Close other Polaris tabs and reload."
      ));
      deletion.onerror = () => reject(deletion.error || new Error(
        "Could not repair the Scramjet database."
      ));
      deletion.onsuccess = () => {
        const recreate = indexedDB.open("$scramjet", 1);
        recreate.onupgradeneeded = () => {
          const freshDb = recreate.result;
          for (const store of SCRAMJET_STORES) {
            if (!freshDb.objectStoreNames.contains(store)) {
              freshDb.createObjectStore(store);
            }
          }
        };
        recreate.onsuccess = () => {
          recreate.result.close();
          resolve();
        };
        recreate.onerror = () => reject(recreate.error || new Error(
          "Could not recreate the Scramjet database."
        ));
      };
    };

    request.onerror = () => reject(request.error || new Error(
      "Could not open the Scramjet database."
    ));
    request.onblocked = () => reject(new Error(
      "The Scramjet database upgrade is blocked by another Polaris tab. Close other Polaris tabs and reload."
    ));
  });
}

const scramjetReady = openScramjetDatabase().then(() => {
  const { ScramjetServiceWorker } = $scramjetLoadWorker();
  return new ScramjetServiceWorker();
});

async function handleRequest(event) {
  const scramjet = await scramjetReady;
  await scramjet.loadConfig();

  if (scramjet.route(event)) {
    return scramjet.fetch(event);
  }

  return fetch(event.request);
}

self.addEventListener("install", event => {
  event.waitUntil(
    scramjetReady.then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(handleRequest(event));
});
