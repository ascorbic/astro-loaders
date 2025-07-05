import { defineLiveCollection } from "astro:content";
import { liveFeedLoader } from "@ascorbic/feed-loader";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";
import { liveYouTubeLoader } from "@ascorbic/youtube-loader";

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

const liveChannelVideos = defineLiveCollection({
  type: "live",
  loader: liveYouTubeLoader({
    type: "channel",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    channelHandle: "astrodotbuild",
    defaultMaxResults: 12,
    defaultOrder: "date",
  }),
});

const livePlaylistVideos = defineLiveCollection({
  type: "live",
  loader: liveYouTubeLoader({
    type: "playlist",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    playlistId: "PL8Qn4kutqAEuEuNnDtbN7sZuGDKFBmxr3",
    defaultMaxResults: 15,
  }),
});

export const collections = {
  news,
  liveBluesky,
  liveChannelVideos,
  livePlaylistVideos,
};
