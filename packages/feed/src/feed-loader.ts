import type { Loader } from "astro/loaders";
import FeedParser from "feedparser";
import { webToNodeStream } from "./streams.js";
import { ItemSchema, type Item } from "./schema.js";

export interface FeedLoaderOptions {
	/** URL of the feed */
  url: URL | string;
	/** Extra options passed to the fetch request */
  requestOptions?: RequestInit;
}

export function feedLoader({
  url,
  requestOptions = {},
}: FeedLoaderOptions): Loader {
  const feedUrl = new URL(url);
  return {
    name: "feed-loader",
    load: async ({ store, logger, parseData, meta }) => {
      logger.info("Loading posts");
      const parser = new FeedParser({ feedurl: feedUrl.toString() });

      const etag = meta.get("etag");
      const lastModified = meta.get("last-modified");
      if (store.keys().length > 0 && (etag || lastModified)) {
        const headers = new Headers(requestOptions.headers);
        if (etag) {
          headers.set("If-None-Match", etag);
        } else {
          headers.set("If-Modified-Since", lastModified!);
        }
        requestOptions.headers = headers;
      }
      const res = await fetch(feedUrl, requestOptions);

      if (res.status === 304) {
        logger.info("Feed not modified, skipping");
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch feed: ${res.statusText}`);
      }
      if (!res.body) {
        throw new Error("Response body is empty");
      }
      const incomingEtag = res.headers.get("etag");
      const incomingLastModified = res.headers.get("last-modified");

      store.clear();

      parser.on("readable", async () => {
        let item: Item | null;
        while ((item = parser.read() as Item) !== null) {
          const id = item.guid;
          if (!id) {
            logger.warn("Item does not have a guid, skipping");
            continue;
          }
          const data = (await parseData({
            id,
            data: item as Item & Record<string, unknown>,
          })) as unknown as Item;

          store.set({
            id,
            data,
            rendered: {
              html: data.description ?? "",
            },
          });
        }
      });

      const stream = webToNodeStream(res.body);
      stream.pipe(parser);

      return new Promise((resolve, reject) => {
        parser.on("end", () => {
          meta.delete("etag");
          meta.delete("last-modified");
          if (incomingEtag) {
            meta.set("etag", incomingEtag);
          } else if (incomingLastModified) {
            meta.set("last-modified", incomingLastModified);
          }
          resolve();
        });
        parser.on("error", (err: Error) => {
          reject(err);
        });
      });
    },
    schema: ItemSchema,
  };
}
