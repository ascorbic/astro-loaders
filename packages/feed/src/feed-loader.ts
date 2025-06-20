import type { Loader } from "astro/loaders";
import { ItemSchema } from "./schema.js";
import { fetchAndParseFeed } from "./feed-utils.js";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
} from "@ascorbic/loader-utils";
import { FeedError } from "./live-feed-errors.js";

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

      const conditionalHeaders = getConditionalHeaders({
        init: requestOptions.headers,
        meta,
      });

      const requestWithHeaders = {
        ...requestOptions,
        headers: conditionalHeaders,
      };

      try {
        const { items, response } = await fetchAndParseFeed(feedUrl, requestWithHeaders);

        if (response.status === 304) {
          logger.info(`Feed ${feedUrl} not modified, skipping`);
          return;
        }

        store.clear();

        for (const item of items) {
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

        storeConditionalHeaders({
          headers: response.headers,
          meta,
        });
      } catch (error) {
        // Re-throw feed-specific errors as-is for better error messages
        if (error instanceof FeedError) {
          throw error;
        }
        throw new Error(`Failed to load feed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    schema: ItemSchema,
  };
}
