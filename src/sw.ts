/// <reference lib="webworker" />

import { HttpClient } from "@effect/platform";
import { Effect, Stream } from "effect";

const responseWith = (
  response: Response,
  headers?: Record<string, string>,
  body?: BodyInit
) => {
  return new Response(body ?? response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      ...headers,
    },
  });
};

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

        const program = Effect.promise(async () => {
          const req = HttpClient.request.get(url, {
            acceptJson: true,
          });
          const data = req.pipe(
            HttpClient.client.fetch(),
            Effect.map((x) => x.stream),
            Stream.flatten(),
            Stream.tap((x) =>
              Effect.succeed(console.log("Byte Chunk Length: ", x.length))
            ),
            Stream.map((x) => new TextDecoder().decode(x)),
            Stream.map((x) => x.toUpperCase()),
            Stream.map((x) => new TextEncoder().encode(x)),
            Stream.tap((x) =>
              Effect.succeed(console.log("Text Chunk Length: ", x.length))
            ),
            Stream.toReadableStream
          );
          return new Response(data, {
            status: 200,
            statusText: "OK",
            headers: {
              "content-type": "text/plain",
            },
          });
        });

        const transformed = await Effect.runPromise(program);
        return transformed;
      }

      return fetch(event.request);
    })()
  );
});
