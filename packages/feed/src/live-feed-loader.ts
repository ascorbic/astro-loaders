import type { LiveLoader } from "astro/loaders";
import { type Item } from "./schema.js";
import {
  fetchAndParseFeed,
  filterFeedItems,
  findFeedItem,
  type FeedCollectionFilter,
  type FeedEntryFilter,
} from "./feed-utils.js";
import { FeedError, FeedLoadError, FeedValidationError, type FeedErrorTypes } from "./live-feed-errors.js";

export interface LiveFeedLoaderOptions {
  /** URL of the feed */
  url: URL | string;
  /** Extra options passed to the fetch request */
  requestOptions?: RequestInit;
  /** Default filters to apply to all queries */
  defaultFilters?: FeedCollectionFilter;
}

/**
 * Creates a live feed loader that fetches RSS, Atom, or RDF feeds at request time
 * 
 * @param options - Configuration options for the feed loader
 * @returns A live loader that can be used with Astro's live content collections
 * 
 * @example
 * ```ts
 * import { liveFeedLoader } from '@ascorbic/feed-loader';
 * 
 * const newsLoader = liveFeedLoader({
 *   url: 'https://feeds.bbci.co.uk/news/rss.xml',
 *   defaultFilters: { limit: 20 }
 * });
 * ```
 */
export function liveFeedLoader({
  url,
  requestOptions = {},
  defaultFilters,
}: LiveFeedLoaderOptions): LiveLoader<Item, FeedEntryFilter, FeedCollectionFilter, FeedErrorTypes> {
  return {
    name: "live-feed-loader",
    loadCollection: async ({ filter }) => {
      const feedUrl = new URL(url).toString();
      
      try {
        const { items } = await fetchAndParseFeed(url, requestOptions);

        // Validate that we got feed items
        if (!Array.isArray(items)) {
          return {
            error: new FeedValidationError(
              'Feed did not return valid items array',
              feedUrl,
              'Expected array of feed items'
            ),
          };
        }
        
        // Merge default filters with request filters  
        const combinedFilter = {
          ...defaultFilters,
          ...filter,
        };

        const filteredItems = filterFeedItems(items, combinedFilter);

        // Validate filtered items have required fields
        const validItems = filteredItems.filter(item => {
          if (!item.guid) {
            console.warn(`Feed item missing guid, skipping: ${item.title || 'untitled'}`);
            return false;
          }
          return true;
        });

        return {
          entries: validItems.map((item) => ({
            id: item.guid!,
            data: item,
            rendered: {
              html: item.description ?? "",
            },
          })),
        };
      } catch (error) {
        // Handle feed-specific errors
        if (error instanceof FeedError) {
          return { error };
        }

        // Fallback for unknown errors
        return {
          error: new FeedLoadError(
            'Unexpected error loading feed',
            feedUrl,
            'UNKNOWN_ERROR',
            undefined,
            { cause: error }
          ),
        };
      }
    },
    loadEntry: async ({ filter }) => {
      const feedUrl = new URL(url).toString();
      
      try {
        const { items } = await fetchAndParseFeed(url, requestOptions);

        // Validate that we got feed items
        if (!Array.isArray(items)) {
          return {
            error: new FeedValidationError(
              'Feed did not return valid items array',
              feedUrl,
              'Expected array of feed items'
            ),
          };
        }

        const item = findFeedItem(items, filter);

        // Return undefined for not found (Astro converts this to LiveEntryNotFoundError)
        if (!item) {
          return undefined;
        }

        // Validate the item has required fields
        if (!item.guid) {
          return {
            error: new FeedValidationError(
              'Feed entry missing required guid field',
              feedUrl,
              `Entry with filter ${JSON.stringify(filter)} has no guid`
            ),
          };
        }

        return {
          id: item.guid,
          data: item,
          rendered: {
            html: item.description ?? "",
          },
        };
      } catch (error) {
        // Handle feed-specific errors
        if (error instanceof FeedError) {
          return { error };
        }

        // Fallback for unknown errors
        return {
          error: new FeedLoadError(
            'Unexpected error loading feed entry',
            feedUrl,
            'UNKNOWN_ERROR',
            undefined,
            { cause: error }
          ),
        };
      }
    },
  };
}