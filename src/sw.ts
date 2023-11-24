/// <reference lib="webworker" />

import { inflate } from "pako";
import arweaveGraphql from "arweave-graphql";
const gqlClient = arweaveGraphql("https://arweave.net/graphql", {
  fetch: fetch,
});

const getTx = async (txId: string) => {
  const queryRes = await gqlClient.getTransactions({
    ids: [txId],
  });
  return queryRes.transactions.edges[0].node;
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

// const arRegex = /^ar:\/\/([a-zA-Z0-9_-]{43})$/;
const arweaveNetGatewayRegex = /^https:\/\/arweave\.net\/([a-zA-Z0-9_-]{43})$/;

self.addEventListener("fetch", (e) => {
  const event = e as FetchEvent;
  console.log(`[Service Worker] Fetch ${event.request.url}`);

  event.respondWith(
    (async () => {
      const url = event.request.url;
      let m: RegExpExecArray | null;
      if ((m = arweaveNetGatewayRegex.exec(url)) !== null) {
        const arweaveTxId = m[1];
        const arioUrl = `https://ar-io.dev/${arweaveTxId}`;
        console.log("arweave.net URL detected, redirecting to", arioUrl);

        const tx = await getTx(arweaveTxId);
        console.log("Transaction", tx);

        const contentEncodingTagValue = tx.tags.find(
          (t) => t.name.toLowerCase() === "content-encoding"
        )?.value;

        if (contentEncodingTagValue) {
          console.log("Content-Encoding", contentEncodingTagValue);

          if (contentEncodingTagValue.toLowerCase() === "gzip") {
            const resp = await fetch(arioUrl);
            const body = await resp.arrayBuffer();
            const inflated = inflate(body);
            return new Response(inflated, {
              status: resp.status,
              statusText: resp.statusText,
              headers: {
                ...Object.fromEntries(resp.headers),
                "Redirect-URL": arioUrl,
              },
            });
          } else {
            throw new Error(
              `Unsupported Content-Encoding: ${contentEncodingTagValue}`
            );
          }
        }

        const resp = await fetch(arioUrl);
        return new Response(resp.body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: {
            ...Object.fromEntries(resp.headers),
            "Redirect-URL": arioUrl,
          },
        });
      } else {
        // console.log("Base URL detected", url);
        return await fetch(event.request.url);
      }
    })()
  );
});
