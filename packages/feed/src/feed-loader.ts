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
function transformToLegacyFormat(item: Item, feedData: any): LegacyItem {
  return {
    title: item.title,
    description: item.description,
    summary: item.description, // Map description to summary as well
    date: item.published,
    pubdate: item.published,
    link: item.url,
    origlink: null,
    author: item.authors.length > 0 ? 
      `${item.authors[0].email} (${item.authors[0].name})` : null,
    guid: item.id || item.url || "",
    comments: null,
    image: item.image ? {
      url: item.image.url,
      title: item.image.title
    } : { url: undefined, title: undefined },
    categories: item.categories.map(cat => cat.label),
    enclosures: item.media.map(media => ({
      url: media.url,
      type: media.mimeType,
      length: media.length ? String(media.length) : null,
    })),
    meta: {
      "#ns": [{}], // Simplified namespace
      "#type": feedData.meta.type as "atom" | "rss" | "rdf",
      "#version": feedData.meta.version,
      title: feedData.title,
      description: feedData.description,
      date: feedData.updated,
      pubdate: feedData.updated,
      link: feedData.url,
      xmlurl: null,
      author: feedData.authors.length > 0 ? 
        `${feedData.authors[0].email} (${feedData.authors[0].name})` : null,
      language: feedData.language,
      image: feedData.image ? {
        url: feedData.image.url,
        title: feedData.image.title
      } : null,
      favicon: null,
      copyright: feedData.copyright,
      generator: feedData.generator?.name || null,
      categories: feedData.categories.map((cat: any) => cat.label),
    }
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
        const processedItem = legacy ? transformToLegacyFormat(item, feed) : item;

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
