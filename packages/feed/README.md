# Astro feed loader
This package provides a feed loader for Astro. It allows you to load and parse RSS, RDF Atom feeds, and use the data in your Astro components. It uses the new Astro content layer, so won't work with normal Astro sites yet.

## Installation
```sh
npm install @ascorbic/astro-feed astro@experimental--contentlayer
```

## Usage
```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";

const releases = defineCollection({
  type: "experimental_data",
  loader: feedLoader({
    url: "https://github.com/withastro/astro/releases.atom",
  }),
});

const podcasts = defineCollection({
  type: "experimental_data",
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
