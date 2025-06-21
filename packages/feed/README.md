# Astro feed loader

This package provides feed loaders for Astro. It allows you to load and parse RSS, RDF, and Atom feeds, and use the data in your Astro site.

The package includes two loaders:
- **`feedLoader`**: Build-time feed loading for static content collections  
- **`liveFeedLoader`**: Runtime feed loading for live content collections ⚠️ **Experimental**

## Installation

```sh
npm install @ascorbic/feed-loader
```

## Usage

### Build-time Feed Loading (Static Collections)

This package requires Astro 4.14.0 or later. You must enable the experimental content layer in Astro unless you are using version 5.0.0-beta or later. You can do this by adding the following to your `astro.config.mjs`:

```javascript
export default defineConfig({
  // ...
  experimental: {
    contentLayer: true,
  },
});
```

You can then use the feed loader in your content configuration:

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

You can render the episode description using the `render()` function:

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

### Live Feed Loading (Runtime Collections) ⚠️ **Experimental**

> **⚠️ Experimental Feature**: Live content collections require **Astro 5.10.0 or later** and are currently experimental. The API may change in future versions.

Live feed loading allows you to fetch RSS/Atom feeds at request time rather than build time. This is useful for frequently updated content that you want to display fresh data without rebuilding your site.

#### Setup

1. **Enable live content collections** in your `astro.config.mjs`:

```javascript
export default defineConfig({
  // ...
  experimental: {
    liveContentCollections: true,
  },
});
```

2. **Create a live configuration file** at `src/live.config.ts`:

```typescript
// src/live.config.ts
import { defineLiveCollection } from 'astro:content';
import { liveFeedLoader } from '@ascorbic/feed-loader';

const news = defineLiveCollection({
  type: 'live',
  loader: liveFeedLoader({
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  }),
});

export const collections = { news };
```

3. **Use live collections in your pages**:

```astro
---
// src/pages/news/index.astro
import { getLiveCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';

const { entries: articles, error } = await getLiveCollection('news', { limit: 10 });

if (error) {
  console.error('Failed to load news:', error.message);
}
---

<Layout title="Latest News">
  {error ? (
    <p>Error loading news: {error.message}</p>
  ) : (
    <ul>
      {articles?.map((article) => (
        <li>
          <a href={`/news/${encodeURIComponent(article.id)}`}>
            {article.data.title}
          </a>
          <p>{article.data.description}</p>
        </li>
      ))}
    </ul>
  )}
</Layout>
```

4. **Create individual article pages** with server-side rendering:

```astro
---
// src/pages/news/[id].astro
import { getLiveEntry } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export const prerender = false; // Required for dynamic routes with live content

const { id } = Astro.params;
const { entry: article, error } = await getLiveEntry('news', decodeURIComponent(id!));

if (error || !article) {
  return Astro.redirect('/news');
}
---

<Layout title={article.data.title}>
  <h1>{article.data.title}</h1>
  <div set:html={article.data.description} />
  <a href={article.data.url} target="_blank">Read full article →</a>
</Layout>
```

#### Live Loader Options

The `liveFeedLoader` supports the same options as `feedLoader`:

```typescript
liveFeedLoader({
  url: "https://example.com/feed.xml",
  requestOptions: {
    headers: {
      "User-Agent": "My Astro Site",
    },
  },
});
```

#### Filtering Live Collections

You can filter live collections when fetching them:

```typescript
// Get latest 5 articles
const { entries } = await getLiveCollection('news', { limit: 5 });

// Filter by category
const { entries } = await getLiveCollection('news', { category: 'science' });

// Filter by author  
const { entries } = await getLiveCollection('news', { author: 'john' });

// Filter by date range
const { entries } = await getLiveCollection('news', { 
  since: new Date('2024-01-01'),
  until: new Date('2024-12-31') 
});
```

#### Error Handling

Live feed loaders return structured errors that you can handle appropriately:

```typescript
import { FeedLoadError, FeedValidationError } from '@ascorbic/feed-loader';

const { entries, error } = await getLiveCollection('news');

if (error) {
  if (error instanceof FeedLoadError) {
    console.error(`Feed loading failed: ${error.message} (${error.code})`);
  } else if (error instanceof FeedValidationError) {
    console.error(`Feed validation failed: ${error.message}`);
  }
}
```

#### When to Use Live vs Static Loading

**Use live loading when:**
- Content updates frequently (multiple times per day)
- You need real-time data 
- You want to avoid rebuilds for content changes
- You're building preview functionality

**Use static loading when:**
- Content is relatively static
- Performance is critical (pre-rendered)
- You want build-time optimization
- You need to process MDX or images

## API Reference

### `feedLoader(options)`

Static content collections loader for build-time feed processing.

### `liveFeedLoader(options)` ⚠️ **Experimental**

Live content collections loader for runtime feed processing.

#### Options

- `url` (required): Feed URL to fetch from
- `requestOptions`: Custom fetch options (headers, etc.)

### Error Types

- `FeedError`: Base error class
- `FeedLoadError`: Network/HTTP errors
- `FeedValidationError`: Feed parsing/validation errors
