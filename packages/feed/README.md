# Astro feed loader

This package provides feed loaders for Astro. It allows you to load and parse RSS, RDF, and Atom feeds, and use the data in your Astro site. It includes both build-time and live content collection loaders.

## Installation

```sh
npm install @ascorbic/feed-loader
```

## Usage

### Build-time Loader

You can use the build-time feed loader in your content configuration like this:

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";

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

export const collections = { releases, podcasts };
```

You can then use these like any other collection in Astro:

```astro
---
import { getCollection } from "astro:content";
import Layout from "../layouts/Layout.astro";

const episodes = await getCollection("podcasts");
---

<Layout title="Episodes">
  <h2>Episodes</h2>
  <ul>
    {
      episodes.map((episode) => (
        <li>
          <a href={`/episodes/${episode.id.replace(/\W/g, "-")}`}>
            {episode.data.title}
          </a>
        </li>
      ))
    }
  </ul>
</Layout>
```

### Live Loader

The live loader fetches feed data at request time, making it ideal for frequently updated feeds where you want real-time content without rebuilding your site.

**Important:** Live content collections require Astro 5.10.0 or later and are an experimental feature. You must enable them in your `astro.config.mjs`:

```javascript
export default defineConfig({
  // ...
  experimental: {
    liveContentCollections: true,
  },
});
```

Then create a `src/live.config.ts` file to define your live collections:

```typescript
// src/live.config.ts
import { defineLiveCollection } from 'astro:content';
import { liveFeedLoader } from '@ascorbic/feed-loader';

const liveNews = defineLiveCollection({
  type: 'live',
  loader: liveFeedLoader({
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    defaultFilters: {
      limit: 20,
    },
  }),
});

export const collections = { liveNews };
```

You can then use live collections in your pages:

```astro
---
import { getLiveCollection, getLiveEntry } from 'astro:content';

// Get all posts with optional filtering
const { entries: posts, error } = await getLiveCollection('liveNews', {
  limit: 10,
  dateRange: { from: new Date('2024-01-01') }
});

// Get a single post by ID
const { entry: post, error: postError } = await getLiveEntry('liveNews', 'some-post-id');
---

{posts && posts.map(post => (
  <article>
    <h2>{post.data.title}</h2>
    <p>{post.data.summary}</p>
  </article>
))}
```

#### Live Loader Options

The `liveFeedLoader` function accepts the same options as `feedLoader`, plus:

- `defaultFilters`: Default filters to apply to all queries
  - `limit`: Maximum number of entries to return
  - `dateRange`: Filter by date range (`{ from?: Date, to?: Date }`)
  - `author`: Filter by author name
  - `categories`: Filter by category names
  - `search`: Text search in title/description

#### Error Handling

Live loaders can fail due to network issues, parsing errors, or validation problems. The live feed loader provides specific error types for better error handling:

```astro
---
import { getLiveCollection, FeedLoadError, FeedValidationError } from '@ascorbic/feed-loader';

const { entries: posts, error } = await getLiveCollection('liveNews');

if (error) {
  if (error instanceof FeedLoadError) {
    console.error(`Network error loading feed from ${error.url}:`, error.message);
    // Handle network issues - maybe show cached content or retry
  } else if (error instanceof FeedValidationError) {
    console.error(`Feed format error from ${error.url}:`, error.message);
    // Handle malformed feed data
  } else {
    console.error('Unexpected error:', error.message);
  }
}
---

{error && (
  <div class="error">
    <strong>Error loading posts:</strong> 
    {error instanceof FeedLoadError && error.code === 'NETWORK_ERROR' ? 
      'Network connection failed. Please try again.' : 
      error.message
    }
  </div>
)}
```

**Error Types:**
- `FeedLoadError`: Network failures, fetch errors, or unexpected issues
  - Properties: `url`, `code`, `statusCode` (optional)
  - Common codes: `NETWORK_ERROR`, `FETCH_ERROR`, `UNKNOWN_ERROR`
- `FeedValidationError`: Feed parsing or validation failures
  - Properties: `url`, `details` (optional)

## Rendering Content

You can render the feed item description using the `render()` function:

```astro
---
import { render, getEntry } from "astro:content";

const episode = getEntry("podcasts", Astro.params.id);

const { Content } = await render(episode);
---
<h1>{episode.data.title}</h1>

<Content />

<p>
	{
		episode.data.enclosures.map((enclosure) => (
			<audio controls>
				<source src={enclosure.url} type={enclosure.type} />
			</audio>
		))
	}
</p>

```
