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
      } else if ((m = arfsRegex.exec(url)) !== null) {
        const arfs = m[1];
        console.log("Arfs URL detected", arfs);

        const arfsFileTx = await getTxWhere({
          tags: [
            {
              name: "File-Id",
              values: [arfs],
            },
          ],
        });
        console.log("Arfs File Transaction", arfsFileTx);

        type ArfsFileEntity = {
          dataTxId: string;
          dataContentType: string;
        };

        const arfsFileKeyBase64UrlUnpadded = m[2];
        if (arfsFileKeyBase64UrlUnpadded) {
          console.log("Arfs File Key", arfsFileKeyBase64UrlUnpadded);

          // base
          const arfsFileKey = base64url.parse(arfsFileKeyBase64UrlUnpadded, {
            loose: true,
          });

          const key = await crypto.subtle.importKey(
            "raw",
            arfsFileKey,
            "AES-GCM",
            false,
            ["decrypt"]
          );
          const decryptParams = {
            name: arfsFileTx.tags
              .find((t) => t.name.toLowerCase() === "cipher")!
              .value.replace("256", ""),
            iv: base64.parse(
              arfsFileTx.tags.find((t) => t.name.toLowerCase() === "cipher-iv")!
                .value
            ),
          };

          const fileEntityDataEncrypted = await (
            await fetch(`https://arweave.net/${arfsFileTx.id}`)
          ).arrayBuffer();

          const fileEntityData = await crypto.subtle.decrypt(
            decryptParams,
            key,
            fileEntityDataEncrypted
          );
          const fileEntity = JSON.parse(
            new TextDecoder().decode(fileEntityData)
          ) as ArfsFileEntity;
          console.log("Arfs File Entity (decrypted)", fileEntity);

          const fileDataTx = await getTx(fileEntity.dataTxId);
          console.log("Arfs File Data Transaction", fileDataTx);

          const fileDataResponse = await fetch(
            `https://arweave.net/${fileEntity.dataTxId}`
          );
          const fileDataEncrypted = await fileDataResponse.arrayBuffer();

          try {
            const fileData = await crypto.subtle.decrypt(
              {
                ...decryptParams,
                iv: base64.parse(
                  fileDataTx.tags.find(
                    (t) => t.name.toLowerCase() === "cipher-iv"
                  )!.value
                ),
              },
              key,
              fileDataEncrypted
            );
            return responseWith(
              fileDataResponse,
              {
                "Content-Type": fileEntity.dataContentType,
              },
              fileData
            );
          } catch (e) {
            console.error(e);
            return new Response("Could not decrypt file data", {
              status: 500,
              statusText: "Internal Server Error",
            });
          }
        }

        const fileEntity = (await (
          await fetch(`https://arweave.net/${arfsFileTx.id}`)
        ).json()) as ArfsFileEntity;
        console.log("Arfs File Entity", fileEntity);

        return await fetch(`https://arweave.net/${fileEntity.dataTxId}`);
      } else {
        // console.log("Base URL detected", url);
        return await fetch(event.request.url);
      }
    })()
  );
});
