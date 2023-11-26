/// <reference lib="webworker" />

import { HttpClient } from "@effect/platform";
import { Effect, Stream } from "effect";
import { toReadableStream } from "effect/Stream";

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

      if (
        url ===
        "https://pc5fv7xck26hqhfkbviykp6iwfwl45iy77ugyukqurrfok2p2y3q.arweave.net/eLpa_uJWvHgcqg1RhT_IsWy-dRj_6GxRUKRiVytP1jc"
      ) {
        console.log("arweave.net Request: ", url);

        const program = Effect.gen(function* (_) {
          const res = yield* _(
            HttpClient.request.get(url),
            HttpClient.client.fetch()
          );

          const data = res.stream.pipe(
            Stream.tap((x) =>
              Effect.sync(() => console.log("Byte Chunk Length: ", x.length))
            ),
            Stream.map((x) => new TextDecoder().decode(x)),
            Stream.tap((x) =>
              Effect.sync(() => console.log("Text Chunk Length: ", x.length))
            ),
            Stream.map((x) => x.toUpperCase()),
            Stream.map((x) => new TextEncoder().encode(x)),
            toReadableStream
          );

          return new Response(data, {
            status: res.status,
            headers: res.headers,
          });
        });

        const transformed = await Effect.runPromise(program);
        return transformed;
      }

      return fetch(event.request);
    })()
  );
});
