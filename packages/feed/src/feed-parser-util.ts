import { parseFeed } from "@rowanmanning/feed-parser";
import type { LoaderContext } from "astro/loaders";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
} from "@ascorbic/loader-utils";

export interface FeedParseOptions {
  url: URL | string;
  requestOptions?: RequestInit;
  meta: LoaderContext["meta"];
  logger: LoaderContext["logger"];
}

export interface ParsedFeedResult {
  feed: ReturnType<typeof parseFeed>;
  wasModified: boolean;
}

export async function fetchAndParseFeed({
  url,
  requestOptions = {},
  meta,
  logger,
}: FeedParseOptions): Promise<ParsedFeedResult> {
  const feedUrl = new URL(url);
  
  requestOptions.headers = getConditionalHeaders({
    init: requestOptions.headers,
    meta,
  });

  logger.info(`Fetching feed from ${feedUrl}`);
  const res = await fetch(feedUrl, requestOptions);

  if (res.status === 304) {
    logger.info(`Feed ${feedUrl} not modified, skipping`);
    return { feed: null as any, wasModified: false };
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.statusText}`);
  }

  const feedText = await res.text();
  if (!feedText) {
    throw new Error("Feed response is empty");
  }

  logger.info(`Parsing feed from ${feedUrl}`);
  const feed = parseFeed(feedText);

  storeConditionalHeaders({
    headers: res.headers,
    meta,
  });

  return { feed, wasModified: true };
}