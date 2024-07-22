import type { Loader } from "astro/loaders";
import FeedParser from "feedparser";
import { ItemSchema, type Item } from "./schema.js";
import { webToNodeStream } from "./streams.js";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
} from "@ascorbic/loader-utils";

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

      requestOptions.headers = getConditionalHeaders({
        init: requestOptions.headers,
        meta,
      });

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

      store.clear();

      parser.on("readable", async () => {
        let item: Item | null;
        while ((item = parser.read() as Item) !== null) {
          const id = item.guid;
          if (!id) {
            logger.warn("Item does not have a guid, skipping");
            continue;
          }
          const data = await parseData({
            id,
            data: item,
          });

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
          storeConditionalHeaders({
            headers: res.headers,
            meta,
          });
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
