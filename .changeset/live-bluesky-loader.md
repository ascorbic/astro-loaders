---
"@ascorbic/bluesky-loader": minor
---

# Add live Bluesky loader

Adds `liveBlueskyLoader` for Astro's experimental Live Content Collections feature. This loader fetches Bluesky posts in real-time, complementing the existing build-time `authorFeedLoader`.

The key difference is that while `authorFeedLoader` fetches data at build time for static generation, `liveBlueskyLoader` retrieves fresh content on-demand during server-side rendering or client-side navigation.

## Getting Started

### Prerequisites

- Astro 5.10.0+ with experimental Live Content Collections enabled
- `@ascorbic/bluesky-loader` package installed

### Basic Usage

Create a live collection in your `live.config.ts`:

```typescript
import { defineLiveCollection } from "astro:content";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";

const liveBluesky = defineLiveCollection({
  type: "live",
  loader: liveBlueskyLoader({
    identifier: "your-handle.bsky.social", // Optional: can also be set in filters
    service: "https://public.api.bsky.app", // Optional: defaults to public API
  }),
});

export const collections = { liveBluesky };
```

### Using in Pages

Fetch posts in your Astro pages:

```astro
---
import { getLiveCollection, getLiveEntry } from 'astro:content';

// Get filtered posts
const posts = await getLiveCollection('liveBluesky', (post) =>
  post.data.record.text.includes('astro')
);

// Get a specific post by AT URI
const post = await getLiveEntry('liveBluesky', 'at://did:plc:user/app.bsky.feed.post/id');
---
```

## Features

- Real-time data fetching using AT Protocol's `getPosts` method
- Flexible configuration - set identifier globally or per-request
- Filtering options: limit, date ranges, post types, and more
- Error handling with specific error codes and helpful messages
- Full TypeScript support with exported interfaces
- Configurable service URLs for custom Bluesky instances
