import FeedParser from "feedparser";
import { type Item } from "./schema.js";
import { webToNodeStream } from "./streams.js";
import { FeedValidationError, FeedLoadError } from "./live-feed-errors.js";

export interface FeedCollectionFilter {
  /** Filter by date range */
  dateRange?: { from?: Date; to?: Date };
  /** Filter by author/creator */
  author?: string;
  /** Filter by category/tags */
  categories?: string[];
  /** Limit number of entries */
  limit?: number;
  /** Text search in title/description */
  search?: string;
}

export interface FeedEntryFilter {
  /** Entry ID (guid) */
  id?: string;
  /** Entry link/permalink */
  link?: string;
  /** Entry title for matching */
  title?: string;
}

/**
 * Fetch and parse a feed from a URL
 */
export async function fetchAndParseFeed(
  url: URL | string,
  requestOptions: RequestInit = {}
): Promise<{ items: Item[]; response: Response }> {
  const feedUrl = new URL(url);
  
  let res: Response;
  try {
    res = await fetch(feedUrl, requestOptions);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new FeedLoadError(
        'Network error while fetching feed',
        feedUrl.toString(),
        'NETWORK_ERROR',
        undefined,
        { cause: error }
      );
    }
    throw new FeedLoadError(
      'Failed to fetch feed',
      feedUrl.toString(),
      'FETCH_ERROR',
      undefined,
      { cause: error }
    );
  }

  if (res.status === 304) {
    return { items: [], response: res };
  }

  if (!res.ok) {
    throw new FeedLoadError(
      `HTTP ${res.status}: ${res.statusText}`,
      feedUrl.toString(),
      'FETCH_ERROR',
      res.status
    );
  }
  if (!res.body) {
    throw new FeedValidationError('Response body is empty', feedUrl.toString());
  }

  const parser = new FeedParser({ feedurl: feedUrl.toString() });

  const items: Item[] = [];

  return new Promise((resolve, reject) => {
    parser.on("readable", () => {
      let item: Item | null;
      while ((item = parser.read() as Item) !== null) {
        if (item.guid) {
          items.push(item);
        }
      }
    });

    parser.on("end", () => {
      resolve({ items, response: res });
    });

    parser.on("error", (err: Error) => {
      reject(new FeedValidationError(
        'Failed to parse feed',
        feedUrl.toString(),
        undefined,
        { cause: err }
      ));
    });

    const stream = webToNodeStream(res.body!);
    stream.pipe(parser);
  });
}

/**
 * Filter feed items based on provided filters
 */
export function filterFeedItems(
  items: Item[],
  filter?: FeedCollectionFilter
): Item[] {
  if (!filter) return items;

  let filtered = items;

  // Date range filter
  if (filter.dateRange) {
    filtered = filtered.filter((item) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      if (filter.dateRange!.from && itemDate < filter.dateRange!.from) return false;
      if (filter.dateRange!.to && itemDate > filter.dateRange!.to) return false;
      return true;
    });
  }

  // Author filter
  if (filter.author) {
    filtered = filtered.filter((item) => {
      return item.author?.toLowerCase().includes(filter.author!.toLowerCase());
    });
  }

  // Categories filter
  if (filter.categories && filter.categories.length > 0) {
    filtered = filtered.filter((item) => {
      if (!item.categories || item.categories.length === 0) return false;
      return filter.categories!.some((filterCat) =>
        item.categories.some((itemCat) =>
          itemCat.toLowerCase().includes(filterCat.toLowerCase())
        )
      );
    });
  }

  // Text search filter
  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    filtered = filtered.filter((item) => {
      return (
        item.title?.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm)
      );
    });
  }

  // Limit filter
  if (filter.limit && filter.limit > 0) {
    filtered = filtered.slice(0, filter.limit);
  }

  return filtered;
}

/**
 * Find a single feed item based on filter criteria
 */
export function findFeedItem(
  items: Item[],
  filter: FeedEntryFilter
): Item | undefined {
  return items.find((item) => {
    if (filter.id && item.guid === filter.id) return true;
    if (filter.link && item.link === filter.link) return true;
    if (filter.title && item.title?.toLowerCase().includes(filter.title.toLowerCase())) return true;
    return false;
  });
}