# Astro Airtable loader

This package provides a Airtable loader for Astro. It allows you to load records from an Airtable base and use them as content in your Astro project.

## Installation

```sh
npm install @ascorbic/airtable-loader
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

You will need to create an Airtable personal access token. You can create one [here](https://airtable.com/create/tokens).

You should ensure that this token has access to the base that you want to use, and has the following scopes:

- `data.records:read`
- `schema.bases:read`

You can then use the feed loader in your content collection configuration:

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { airtableLoader } from "@ascorbic/airtable-loader";

const launches = defineCollection({
  loader: airtableLoader({
    base: import.meta.env.AIRTABLE_BASE,
    table: "Product Launches",
  }),
});

export const collections = { launches };
```

You can then use these like any other content collection in Astro. The data is type-safe, and the types are automatically generated based on the schema of the Airtable table.

```astro
---
import type { GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import Layout from "../../layouts/Layout.astro";

export const getStaticPaths: GetStaticPaths = async () => {
  const launches = await getCollection("launches");
  return launches.map((launch) => ({
    params: {
      id: launch.id,
    },
    props: { launch },
  }));
};

type Props = { launch: CollectionEntry<"launches"> };

const { launch } = Astro.props;
const { data } = launch;
---

<Layout title={data.firstName}>
  <h1>{data["Launch Name"]}</h1>
  <p>{data["Launch date"]?.toDateString()}</p>
  <p>{data.Description}</p>
</Layout>

```

## Options

The `airtableLoader` function takes an object with the following options:

- `base`: The ID of the Airtable base you want to load records from.
- `table`: The name or ID of the table in the base you want to load records from.
- `token`: Your Airtable personal access token. If not provided, it will be read from the `AIRTABLE_TOKEN` environment variable.
- `queryParams`: An optional object with options to pass to the Airtable API. This can be used to filter or limit the records returned. See the [Airtable query documentation](https://airtable.com/developers/web/api/list-records#query) for more information.
