---
'@ascorbic/feed-loader': minor
---

Add live feed loader for real-time content collections

This release adds a new `liveFeedLoader` function that enables real-time feed loading using Astro's experimental live content collections feature. The live loader fetches feed data at request time, making it ideal for frequently updated feeds where you want real-time content without rebuilding your site.

**New Features:**
- `liveFeedLoader()` function for live content collections
- Real-time filtering with date ranges, author, categories, and text search
- Default filters for consistent behavior across queries
- Proper error handling for network and API failures
- Shared utilities for feed parsing to avoid code duplication

**Breaking Changes:**
- None (fully backwards compatible)

**Requirements:**
- Requires Astro 5.10.0 or later for live content collections support
- Requires Astro's experimental `liveContentCollections` feature to be enabled
- Create `src/live.config.ts` for live collection configuration

See the updated README for complete setup and usage instructions.
