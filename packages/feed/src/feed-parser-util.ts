import { parseFeed } from "@rowanmanning/feed-parser";
import type { LoaderContext } from "astro/loaders";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
} from "@ascorbic/loader-utils";
import { FeedLoadError, FeedValidationError } from "./feed-errors.js";

export interface FeedParseOptions {
  url: URL | string;
  requestOptions?: RequestInit;
  meta?: LoaderContext["meta"];
  logger?: LoaderContext["logger"];
}

export type ParsedFeed = ReturnType<typeof parseFeed>;
export type ParsedFeedItem = ParsedFeed["items"][number];

export interface ParsedFeedResult {
  feed: ParsedFeed;
  wasModified: boolean;
}

export async function fetchAndParseFeed({
  url,
  requestOptions = {},
  meta,
  logger,
}: FeedParseOptions): Promise<ParsedFeedResult> {
  const feedUrl = new URL(url);

  // Only use caching if meta is provided
  if (meta) {
    requestOptions.headers = getConditionalHeaders({
      init: requestOptions.headers,
      meta,
    });
  }

  logger?.info(`Fetching feed from ${feedUrl}`);
  const res = await fetch(feedUrl, requestOptions);

  if (res.status === 304 && meta) {
    logger?.info(`Feed ${feedUrl} not modified, skipping`);
    return { feed: null as any, wasModified: false };
  }

  if (!res.ok) {
    throw new FeedLoadError(
      "Failed to fetch feed",
      feedUrl.toString(),
      res.status === 404 ? "NOT_FOUND" : "HTTP_ERROR",
      res.status,
    );
  }

  const feedText = await res.text();
  if (!feedText) {
    throw new FeedValidationError("Feed response is empty", feedUrl.toString());
  }

  logger?.info(`Parsing feed from ${feedUrl}`);
  try {
    const feed = parseFeed(feedText);

    // Only store cache headers if meta is provided
    if (meta) {
      storeConditionalHeaders({
        headers: res.headers,
        meta,
      });
    }

    return { feed, wasModified: true };
  } catch (error) {
    throw new FeedValidationError(
      "Failed to parse feed",
      feedUrl.toString(),
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}
