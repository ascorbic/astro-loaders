import type { Loader } from "astro/loaders";
import { ItemSchema, type Item } from "./schema.js";
import { fetchAndParseFeed } from "./feed-parser-util.js";

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
  return {
    name: "feed-loader",
    load: async ({ store, logger, parseData, meta }) => {
      logger.info("Loading feed");
      
      const { feed, wasModified } = await fetchAndParseFeed({
        url,
        requestOptions,
        meta,
        logger,
      });

      if (!wasModified) {
        return;
      }

      store.clear();

      let processedCount = 0;
      for (const item of feed.items) {
        const id = item.id || item.url;
        if (!id) {
          logger.warn("Item does not have an id or url, skipping");
          continue;
        }

        const data = await parseData({
          id,
          data: item as unknown as Record<string, unknown>,
        });

        store.set({
          id,
          data,
          rendered: {
            html: (data.content as string) || (data.description as string) || "",
          },
        });

        processedCount++;
      }

      logger.info(`Loaded ${processedCount} items from feed`);
    },
    schema: ItemSchema,
  };
}
