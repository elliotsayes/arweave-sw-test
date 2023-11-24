/// <reference lib="webworker" />

self.addEventListener(
  "message",
  ({ data }) => {
    console.log("[Service Worker] Message", data);
    self.postMessage("pong");
  },
  false
);

self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install", e);
});

self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activate", e);
});

self.addEventListener("fetch", (e) => {
  const event = e as FetchEvent;
  console.log(`[Service Worker] Fetch ${event.request.url}`);
  event.respondWith(
    (async () => {
      const url = event.request.url;
      const arRegex = /^ar:\/\/([a-zA-Z0-9_-]{43})$/;
      let m: RegExpExecArray | null;
      if ((m = arRegex.exec(url)) !== null) {
        console.log("ar:// URL detected", url);
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          console.log(`Found match, group ${groupIndex}: ${match}`);
        });
      } else {
        console.log("Base URL detected", url);
      }
      return await fetch(event.request.url);
    })()
  );
});
