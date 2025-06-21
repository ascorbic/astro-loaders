---
"@ascorbic/feed-loader": minor
---

Adds experimental live feed loader

Adds a new `liveFeedLoader` for Astro's experimental live content collections feature. This allows RSS/Atom feeds to be fetched at request time rather than build time, enabling real-time content updates without rebuilds.

**Features:**

- Runtime feed loading with `liveFeedLoader()`
- Support for RSS, Atom, and RDF feeds
- Collection filtering (limit, category, author, date ranges)
- Individual entry loading by ID or URL
- Structured error handling with `FeedLoadError` and `FeedValidationError`
- TypeScript support with proper generics

**Requirements:**

- Astro 5.10.0 or later
- Experimental live content collections enabled in `astro.config.mjs`

**Usage:**

```typescript
// src/live.config.ts
import { defineLiveCollection } from "astro:content";
import { liveFeedLoader } from "@ascorbic/feed-loader";

const news = defineLiveCollection({
  type: "live",
  loader: liveFeedLoader({
    url: "https://feeds.example.com/news.xml",
  }),
});
```

The existing `feedLoader` remains unchanged and fully compatible.
