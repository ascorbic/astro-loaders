# @ascorbic/feed-loader

## 2.0.0

### Major Changes

- [#85](https://github.com/ascorbic/astro-loaders/pull/85) [`8c0c2a0`](https://github.com/ascorbic/astro-loaders/commit/8c0c2a04b9bc3747c431bcb1b0d27f881c5f152b) Thanks [@ascorbic](https://github.com/ascorbic)! - **BREAKING CHANGE**: Updated underlying feed parser library

  This release updates the underlying feed parsing library from the previous parser to `@rowanmanning/feed-parser`, which provides more robust and standardized feed parsing. There is a legacy mode for the previous data shape. This change includes several breaking changes to the data structure:

  ## Schema Changes

  ### Category Structure

  - **BREAKING**: Category objects now use `label`, `term`, and `url` fields instead of `name` and `domain`
    - Old: `{ name: string, domain: string | null }`
    - New: `{ label: string, term: string, url: string | null }`

  ### Media/Enclosure Structure

  - **BREAKING**: Media objects now include additional fields and renamed properties
    - Old: `{ url: string, type: string | null, length: number | null }`
    - New: `{ url: string, image: string | null, title: string | null, length: number | null, type: string | null, mimeType: string | null }`

  ### Field Name Changes

  - **BREAKING**: `link` field renamed to `url`
  - **BREAKING**: `guid` field renamed to `id`
  - **BREAKING**: Atom `summary` field now maps to `description` (consistent with RSS)
  - **BREAKING**: RSS/Atom `enclosure`/`link[@rel=enclosure]` elements now map to `media` array

  ## Error Message Changes

  - Updated error messages to match new parser behavior:
    - "Item does not have a guid, skipping" → "Item does not have an id or url, skipping"
    - "Response body is empty" → "Feed response is empty"

  ## Benefits

  - More robust XML/Atom/RSS parsing
  - Better handling of malformed feeds
  - Standardized data structure across feed types
  - Improved character encoding support
  - More comprehensive category and media handling

  ## Legacy Mode Support

  To ease migration, this release includes a **temporary legacy mode** that maintains backward compatibility:

  ```js
  // Enable legacy mode for backward compatibility
  const loader = feedLoader({
    url: "https://example.com/feed.xml",
    legacy: true, // Will show deprecation warning
  });
  ```

  ⚠️ **Legacy mode is deprecated** and will be removed in a future major version. Use it only as a temporary migration aid.

  ## Migration Guide

  ### Option 1: Use Legacy Mode (Temporary)

  Enable legacy mode to maintain the old data structure while you plan your migration:

  ```js
  const loader = feedLoader({
    url: "https://example.com/feed.xml",
    legacy: true,
  });
  // Data will be in the old format with categories[].name, enclosures, link, guid
  ```

  ### Option 2: Update to New Format (Recommended)

  Update your code to handle the new structured data format:

  #### Field Name Changes

  ```js
  // Item fields
  item.link → item.url
  item.guid → item.id
  item.pubdate/item.date → item.published
  item.summary → item.description (Atom feeds)
  item.enclosures → item.media
  ```

  #### Author Structure Change

  ```js
  // Old: Single string format
  item.author = "email (name)";

  // New: Array of objects
  item.authors = [{ email: "email", name: "name" }];
  // Access: item.authors[0]?.name, item.authors[0]?.email
  ```

  #### Category Structure Change

  ```js
  // Old: Array of strings
  item.categories = ["category1", "category2"];

  // New: Array of objects
  item.categories = [{ label: "category1", term: "category1", url: null }];
  // Access: item.categories[0].label
  ```

  #### Media/Enclosure Structure Change

  ```js
  // Old: Basic enclosure format
  item.enclosures = [
    {
      url: "http://example.com/file.mp3",
      type: "audio/mpeg",
      length: "1234",
    },
  ];

  // New: Enhanced media format
  item.media = [
    {
      url: "http://example.com/file.mp3",
      mimeType: "audio/mpeg",
      length: 1234,
      image: null,
      title: null,
    },
  ];
  ```

  #### Image Structure Change

  ```js
  // Old: Simple object with undefined for missing values
  item.image = { url: "http://example.com/image.jpg", title: undefined };

  // New: Full object structure
  item.image = {
    url: "http://example.com/image.jpg",
    title: "Image Title",
    description: "Image description",
  };
  ```

  #### Meta Structure Changes

  ```js
  // Feed generator changed from string to object
  meta.generator = "WordPress" → feed.generator = { name: "WordPress" }

  // Authors follow same pattern as items
  meta.author = "email (name)" → feed.authors = [{ email: "email", name: "name" }]
  ```

  Most users who only access `title`, `description`, `url`, and basic fields will not need changes.

### Minor Changes

- [#88](https://github.com/ascorbic/astro-loaders/pull/88) [`1049d3e`](https://github.com/ascorbic/astro-loaders/commit/1049d3e865299267833012be3baf1bf4bd0cfea5) Thanks [@ascorbic](https://github.com/ascorbic)! - Adds experimental live feed loader

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

## 1.0.4

### Patch Changes

- [#51](https://github.com/ascorbic/astro-loaders/pull/51) [`abd94a3`](https://github.com/ascorbic/astro-loaders/commit/abd94a3d6425f460d06f4a8bbd2fcf72a5ab0f19) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Ensures loader visibility in the [Astro integrations library](https://astro.build/integrations/?search=&categories%5B%5D=loaders).

## 1.0.3

### Patch Changes

- [#44](https://github.com/ascorbic/astro-loaders/pull/44) [`104af64`](https://github.com/ascorbic/astro-loaders/commit/104af64b75645cdf5d03ea46a516076db718029f) Thanks [@ascorbic](https://github.com/ascorbic)! - Correctly handles Atom feeds with null enclosure length

## 1.0.2

### Patch Changes

- [#36](https://github.com/ascorbic/astro-loaders/pull/36) [`b04b44f`](https://github.com/ascorbic/astro-loaders/commit/b04b44f1a8a1fa84c1f14e7f6b2e1d535b55a4ab) Thanks [@ascorbic](https://github.com/ascorbic)! - Fix peer dependencies for Astro 5 beta

- Updated dependencies [[`b04b44f`](https://github.com/ascorbic/astro-loaders/commit/b04b44f1a8a1fa84c1f14e7f6b2e1d535b55a4ab)]:
  - @ascorbic/loader-utils@1.0.2

## 1.0.1

### Patch Changes

- [#26](https://github.com/ascorbic/astro-loaders/pull/26) [`671d125`](https://github.com/ascorbic/astro-loaders/commit/671d1255c7075cfd4aff3dae2caf7b274591d2b8) Thanks [@ascorbic](https://github.com/ascorbic)! - Upgrades to support Astro 5

- Updated dependencies [[`671d125`](https://github.com/ascorbic/astro-loaders/commit/671d1255c7075cfd4aff3dae2caf7b274591d2b8)]:
  - @ascorbic/loader-utils@1.0.1

## 1.0.0

### Major Changes

- [#15](https://github.com/ascorbic/astro-loaders/pull/15) [`38cf5e5`](https://github.com/ascorbic/astro-loaders/commit/38cf5e5e16b0c71af89f6ed6a3d15da1373a5c00) Thanks [@ascorbic](https://github.com/ascorbic)! - Stable release

### Patch Changes

- Updated dependencies [[`38cf5e5`](https://github.com/ascorbic/astro-loaders/commit/38cf5e5e16b0c71af89f6ed6a3d15da1373a5c00)]:
  - @ascorbic/loader-utils@1.0.0

## 0.0.2

### Patch Changes

- [`ba691b8`](https://github.com/ascorbic/astro-loaders/commit/ba691b8b73aa584b6f27bffe1b7aa6bf9a821d4c) Thanks [@ascorbic](https://github.com/ascorbic)! - Updates to package.json and docs

- Updated dependencies [[`ba691b8`](https://github.com/ascorbic/astro-loaders/commit/ba691b8b73aa584b6f27bffe1b7aa6bf9a821d4c)]:
  - @ascorbic/loader-utils@0.0.2

## 0.0.1

### Patch Changes

- [#3](https://github.com/ascorbic/astro-loaders/pull/3) [`4b5d69a`](https://github.com/ascorbic/astro-loaders/commit/4b5d69ad5f08d11e564933bfdc2439ac6badccc7) Thanks [@ascorbic](https://github.com/ascorbic)! - Extracts loader helpers into utils package

- [#4](https://github.com/ascorbic/astro-loaders/pull/4) [`75b5735`](https://github.com/ascorbic/astro-loaders/commit/75b57350bfa6c21a15e47e990757ad95266b3546) Thanks [@ascorbic](https://github.com/ascorbic)! - Updates for content layer release

- Updated dependencies [[`4b5d69a`](https://github.com/ascorbic/astro-loaders/commit/4b5d69ad5f08d11e564933bfdc2439ac6badccc7)]:
  - @ascorbic/loader-utils@0.0.1
