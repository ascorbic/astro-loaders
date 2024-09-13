# Astro feed loader

This package provides a feed loader for Astro. It allows you to load and parse RSS, RDF Atom feeds, and use the data in your Astro site.

## Installation

```sh
npm install @ascorbic/feed-loader
```

## Usage

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
