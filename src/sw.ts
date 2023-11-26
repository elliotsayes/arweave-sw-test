/// <reference lib="webworker" />

import { inflate } from "pako";
import arweaveGraphql from "arweave-graphql";
import { base64, base64url } from "rfc4648";
const gqlClient = arweaveGraphql("https://arweave.net/graphql", {
  fetch: fetch,
});

const getTx = async (txId: string) => {
  const queryRes = await gqlClient.getTransactions({
    ids: [txId],
  });
  return queryRes.transactions.edges[0].node;
};

const getTxWhere = async (
  variables: Parameters<(typeof gqlClient)["getTransactions"]>[0]
) => {
  const queryRes = await gqlClient.getTransactions(variables);
  return queryRes.transactions.edges[0].node;
};

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

// const arRegex = /^ar:\/\/([a-zA-Z0-9_-]{43})$/;
const arweaveNetGatewayRegex = /^https:\/\/arweave\.net\/([a-zA-Z0-9_-]{43})$/;
const arfsRegex =
  /^https:\/\/arfs\/([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})(?:#([a-zA-Z0-9_-]{43}))?$/;

self.addEventListener("fetch", (e) => {
  const event = e as FetchEvent;
  console.log(`[Service Worker] Fetch ${event.request.url}`);

  event.respondWith(
    (async () => {
      const url = event.request.url;

      // console.log("Base URL detected", url);
      return await fetch(url);
    })()
  );
});
