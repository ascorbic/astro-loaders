import { defineCollection, z } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";
import { csvLoader } from "@ascorbic/csv-loader";
import { airtableLoader } from "@ascorbic/airtable-loader";
import { mockLoader } from "@ascorbic/mock-loader";
import { authorFeedLoader } from "@ascorbic/bluesky-loader";
import { youTubeLoader } from "@ascorbic/youtube-loader";
const releases = defineCollection({
  loader: feedLoader({
    url: "https://github.com/withastro/astro/releases.atom",
  }),
});

const podcasts = defineCollection({
  loader: feedLoader({
    url: "https://feeds.99percentinvisible.org/99percentinvisible",
  }),
});

const mockBlog = defineCollection({
  loader: mockLoader({
    loader: feedLoader({
      url: "https://example.com",
    }),
    entryCount: 10,
    mockHTML: true,
    seed: 123,
  }),
});

const customers = defineCollection({
  loader: csvLoader({
    fileName: "data/customers.csv",
  }),
  schema: z.object({
    customerID: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    age: z.number(),
    registrationDate: z.coerce.date(),
    purchaseAmount: z.number(),
    isSubscriber: z.boolean(),
    lastPurchaseDate: z.coerce.date(),
  }),
});

const mockOrders = defineCollection({
  loader: mockLoader({
    schema: z.object({
      orderID: z.number(),
      customerID: z.number(),
      orderDate: z.date(),
      shipDate: z.date(),
      orderAmount: z.number(),
      isGift: z.boolean(),
    }),
    idField: "orderID",
    entryCount: 100,
    seed: 123,
  }),
});

const spacecraft = defineCollection({
  loader: airtableLoader({
    base: import.meta.env.AIRTABLE_BASE,
    table: "Product Launches",
  }),
});

const bluesky = defineCollection({
  loader: authorFeedLoader({
    identifier: "mk.gg",
    limit: 100,
  }),
});

// YouTube Collections - Demonstrating different loader types
const youtubeVideos = defineCollection({
  loader: youTubeLoader({
    type: "videos",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    videoIds: [
      "dQw4w9WgXcQ", // Rick Roll - classic
      "9bZkp7q19f0", // Gangnam Style
      "L_jWHffIx5E", // Smells Like Teen Spirit
      "fJ9rUzIMcZQ", // Bohemian Rhapsody
      "hTWKbfoikeg", // Never Gonna Give You Up (different version)
    ],
  }),
});

const channelVideos = defineCollection({
  loader: youTubeLoader({
    type: "channel",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    channelId: "UCrUL8K81R4VBzm-KOYwrcxQ", // FreeCodeCamp channel
    maxResults: 10,
    order: "date",
  }),
});

// Search for videos about Astro
const astroSearchVideos = defineCollection({
  loader: youTubeLoader({
    type: "search",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    query: "Astro web framework",
    maxResults: 15,
    order: "relevance",
  }),
});

// Channel videos ordered by view count (most popular)
const popularChannelVideos = defineCollection({
  loader: youTubeLoader({
    type: "channel",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    channelId: "UCrUL8K81R4VBzm-KOYwrcxQ", // FreeCodeCamp channel
    maxResults: 8,
    order: "viewCount",
  }),
});

// Search with date filter - recent videos about JavaScript
const recentJavaScriptVideos = defineCollection({
  loader: youTubeLoader({
    type: "search",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    query: "JavaScript tutorial",
    maxResults: 12,
    order: "date",
    publishedAfter: new Date("2024-01-01"),
  }),
});

// Playlist example - Web Development Playlist
const webDevPlaylist = defineCollection({
  loader: youTubeLoader({
    type: "playlist",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    playlistId: "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8", // Traversy Media Web Dev playlist
    maxResults: 20,
  }),
});

export const collections = {
  releases,
  podcasts,
  customers,
  spacecraft,
  mockBlog,
  mockOrders,
  bluesky,
  youtubeVideos,
  channelVideos,
  astroSearchVideos,
  popularChannelVideos,
  recentJavaScriptVideos,
  webDevPlaylist,
};
