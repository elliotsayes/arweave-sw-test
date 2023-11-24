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
const ardriveRegex =
  /^https:\/\/ardrive\/([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

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
            const resp = await fetch(arioUrl, {
              redirect: "follow",
            });
            const body = await resp.arrayBuffer();
            const inflated = inflate(body);
            return responseWith(
              resp,
              {
                "Redirect-URL": arioUrl,
              },
              inflated
            );
          } else {
            throw new Error(
              `Unsupported Content-Encoding: ${contentEncodingTagValue}`
            );
          }
        }

        const resp = await fetch(arioUrl, {
          redirect: "follow",
        });
        return responseWith(resp, {
          "Redirect-URL": arioUrl,
        });
      } else if ((m = ardriveRegex.exec(url)) !== null) {
        const ardriveUuid = m[1];
        console.log("Ardrive URL detected", ardriveUuid);

        const tx = await getTxWhere({
          tags: [
            {
              name: "File-Id",
              values: [ardriveUuid],
            },
          ],
        });
        console.log("Ardrive Transaction", tx);

        type ArdriveFileEntity = {
          dataTxId: string;
        };
        const fileEntityData = (await (
          await fetch(`https://arweave.net/${tx.id}`)
        ).json()) as ArdriveFileEntity;
        console.log("Ardrive File Entity", fileEntityData);

        return await fetch(`https://arweave.net/${fileEntityData.dataTxId}`);
      } else {
        // console.log("Base URL detected", url);
        return await fetch(event.request.url);
      }
    })()
  );
});
