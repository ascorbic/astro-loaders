# @ascorbic/bluesky-loader

## 0.1.0

### Minor Changes

- [#91](https://github.com/ascorbic/astro-loaders/pull/91) [`feb8d4b`](https://github.com/ascorbic/astro-loaders/commit/feb8d4ba7e9dc738d1627701e60b86c131f1f5e2) Thanks [@ascorbic](https://github.com/ascorbic)! - # Add live Bluesky loader

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

## 0.0.3

### Patch Changes

- [#67](https://github.com/ascorbic/astro-loaders/pull/67) [`348dd1d`](https://github.com/ascorbic/astro-loaders/commit/348dd1d1ef6376c5ff9661bbae136ff5bcdd211f) Thanks [@ascorbic](https://github.com/ascorbic)! - Correctly handle all post types

## 0.0.2

### Patch Changes

- [#60](https://github.com/ascorbic/astro-loaders/pull/60) [`e3ca661`](https://github.com/ascorbic/astro-loaders/commit/e3ca661237b8316266ad8f14be4507a7f00b5cac) Thanks [@ajitzero](https://github.com/ajitzero)! - docs: fix typo in code example

- [#63](https://github.com/ascorbic/astro-loaders/pull/63) [`f550447`](https://github.com/ascorbic/astro-loaders/commit/f550447b5f5cdd013e7d08a4d7a6b2c4c06a997d) Thanks [@ascorbic](https://github.com/ascorbic)! - Fixes hashtag links

## 0.0.1

### Patch Changes

- [#58](https://github.com/ascorbic/astro-loaders/pull/58) [`c551d66`](https://github.com/ascorbic/astro-loaders/commit/c551d66c835271e33e00c4ba17038eab4cf30e28) Thanks [@ascorbic](https://github.com/ascorbic)! - Adds Bluesky loader
