import { defineLiveCollection } from "astro:content";
import { liveFeedLoader } from "@ascorbic/feed-loader";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";

const news = defineLiveCollection({
  type: "live",
  loader: liveFeedLoader({
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  }),
});

const liveBluesky = defineLiveCollection({
  type: "live",
  loader: liveBlueskyLoader({
    identifier: "mk.gg",
    service: "https://public.api.bsky.app",
  }),
});

export const collections = { news, liveBluesky };
