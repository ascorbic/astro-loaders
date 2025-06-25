import type { LiveLoader } from "astro/loaders";
import { fetchAndParseFeed, type ParsedFeedItem } from "./feed-parser-util.js";
import {
  FeedError,
  FeedLoadError,
  type FeedErrorTypes,
} from "./feed-errors.js";

export interface LiveFeedLoaderOptions {
  url: URL | string;
  requestOptions?: RequestInit;
}

export interface CollectionFilter {
  limit?: number;
  category?: string;
  author?: string;
  since?: Date;
  until?: Date;
}

export interface EntryFilter {
  id?: string;
  url?: string;
}

export function liveFeedLoader(
  options: LiveFeedLoaderOptions,
): LiveLoader<ParsedFeedItem, EntryFilter, CollectionFilter, FeedErrorTypes> {
  const { url, requestOptions = {} } = options;

  return {
    name: "live-feed-loader",

    loadCollection: async ({ filter }) => {
      try {
        const result = await fetchAndParseFeed({ url, requestOptions });
        let items = result.feed.items || [];

        if (filter) {
          if (filter.limit) {
            items = items.slice(0, filter.limit);
          }

          if (filter.category) {
            items = items.filter((item) =>
              item.categories?.some(
                (cat) =>
                  cat.label
                    ?.toLowerCase()
                    .includes(filter.category!.toLowerCase()) ||
                  cat.term
                    ?.toLowerCase()
                    .includes(filter.category!.toLowerCase()),
              ),
            );
          }

          if (filter.author) {
            items = items.filter((item) =>
              item.authors?.some(
                (author) =>
                  author.name
                    ?.toLowerCase()
                    .includes(filter.author!.toLowerCase()) ||
                  author.email
                    ?.toLowerCase()
                    .includes(filter.author!.toLowerCase()),
              ),
            );
          }

          if (filter.since) {
            items = items.filter(
              (item) => item.published && item.published >= filter.since!,
            );
          }

          if (filter.until) {
            items = items.filter(
              (item) => item.published && item.published <= filter.until!,
            );
          }
        }

        return {
          entries: items
            .filter((item) => item.id || item.url) // Only include items with valid IDs
            .map((item) => ({
              id: item.id || item.url!,
              data: item,
              rendered: {
                html: item.content || item.description || "",
              },
              cacheHint: {
                lastModified: item.updated || item.published || undefined,
              },
            })),
          cacheHint: {
            lastModified:
              result.feed.updated || result.feed.published || undefined,
          },
        };
      } catch (error) {
        if (error instanceof FeedError) {
          return { error };
        }
        return {
          error: new FeedLoadError(
            "Failed to load feed collection",
            typeof url === "string" ? url : url.toString(),
            "UNKNOWN_ERROR",
            undefined,
            { cause: error },
          ),
        };
      }
    },

    loadEntry: async ({ filter }) => {
      try {
        const result = await fetchAndParseFeed({ url, requestOptions });
        const items = result.feed.items || [];

        let item: ParsedFeedItem | undefined;

        // Find item by ID or URL
        if (filter.id) {
          item = items.find((i) => i.id === filter.id || i.url === filter.id);
        } else if (filter.url) {
          item = items.find((i) => i.url === filter.url);
        }

        const id = item?.id || item?.url;

        if (!item || !id) {
          return undefined;
        }

        return {
          id,
          data: item,
          rendered: {
            html: item.content || item.description || "",
          },
        };
      } catch (error) {
        if (error instanceof FeedError) {
          return { error };
        }
        return {
          error: new FeedLoadError(
            "Failed to load feed entry",
            typeof url === "string" ? url : url.toString(),
            "UNKNOWN_ERROR",
            undefined,
            { cause: error },
          ),
        };
      }
    },
  };
}
