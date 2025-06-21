import type { Loader } from "astro/loaders";
import { ItemSchema, LegacyItemSchema, type Item, type LegacyItem } from "./schema.js";
import { fetchAndParseFeed } from "./feed-parser-util.js";

export interface FeedLoaderOptions {
  /** URL of the feed */
  url: URL | string;
  /** Extra options passed to the fetch request */
  requestOptions?: RequestInit;
  /** 
   * Enable legacy mode for backward compatibility.
   * @deprecated This mode will be removed in a future version. Please migrate to the new format.
   * @default false
   */
  legacy?: boolean;
}

/**
 * Transform modern feed item format to legacy format for backward compatibility
 */
function transformToLegacyFormat(item: Item): LegacyItem {
  return {
    // Copy base fields
    authors: item.authors,
    content: item.content,
    description: item.description,
    id: item.id,
    image: item.image,
    published: item.published,
    title: item.title,
    updated: item.updated,
    url: item.url,
    // Add legacy aliases
    guid: item.id,
    link: item.url,
    // Transform categories from new format to legacy format
    categories: item.categories.map(cat => ({
      name: cat.label,
      domain: cat.url,
    })),
    // Transform media to enclosures with legacy format
    enclosures: item.media.map(media => ({
      url: media.url,
      type: media.mimeType,
      length: media.length,
    })),
  };
}

export function feedLoader({
  url,
  requestOptions = {},
  legacy = false,
}: FeedLoaderOptions): Loader {
  return {
    name: "feed-loader",
    load: async ({ store, logger, parseData, meta }) => {
      if (legacy) {
        logger.warn("Using legacy mode. This is deprecated and will be removed in a future version. Please migrate to the new format.");
      }
      
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

        // Transform to legacy format if needed
        const processedItem = legacy ? transformToLegacyFormat(item) : item;

        const data = await parseData({
          id,
          data: processedItem as unknown as Record<string, unknown>,
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
    schema: legacy ? LegacyItemSchema : ItemSchema,
  };
}
