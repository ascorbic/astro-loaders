# Astro mock loader

This package lets you load mock data into your Astro content collections. It can be used alongside a real loader to mock out data that is not available in development, or it can be used as a standalone source of data. It is based on [faker.js](https://github.com/faker-js/faker) and [`@anatine/zod-mock`](https://github.com/anatine/zod-plugins/tree/main/packages/zod-mock).

The loader will generate data that conforms to a Zod schema that you pass to it. This can either be a schema that you manually specify, or it can be a schema that is defined by a real loader. The generated data will be type-safe, and the types will be automatically generated based on the schema.

The loader will try to use the field names to generate appropriate, realistic content. For example a field called `firstName` will generate a random first name, and a field called `country` will generate a random country name. See [faker.js](https://fakerjs.dev/api/) for details of all of the available data types.

## Installation

```sh
npm install @ascorbic/mock-loader
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

You can then use the mock loader in your content configuration. This is an example of how you might use it to mock out an `orders` collection with a manual [Zod](https://zod.dev/) schema:

```ts
// src/content/config.ts
import { defineCollection, z } from "astro:content";
import { mockLoader } from "@ascorbic/mock-loader";

const orders = defineCollection({
  loader: mockLoader({
    schema: z.object({
      orderID: z.number(),
      customerID: z.number(),
      orderDate: z.date(),
      shipDate: z.date(),
      orderAmount: z.number(),
      isGift: z.boolean(),
    }),
    idField: "orderID",
    entryCount: 100,
  }),
});

export const collections = { orders };
```

You can also use the mock loader to mock out a collection based on a real loader schema. This only works if it is a loader that defines its own schema (so it won't work with the built-in glob or file loaders). Here is an example of how you might use it with [`@ascorbic/feed-loader`](https://github.com/ascorbic/astro-loaders/tree/main/packages/feed). In production is uses the real feed loader, but in development it uses the mock loader with the same schema:

```ts
// src/content/config.ts
import { defineCollection } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";
import { mockLoader } from "@ascorbic/mock-loader";

const blogLoader = feedLoader({
  url: "https://example.com/feed.xml",
});

const blog = defineCollection({
  loader: import.meta.env.DEV
    ? mockLoader({ loader: blogLoader, entryCount: 10 })
    : blogLoader,
});

export const collections = { blog };
```

## Options

The `mockLoader` function takes an options object with the following properties:

- `schema`: A [Zod](https://zod.dev/) schema that defines the shape of the mock data. This is required if you don't provide a `loader`, or if you provide a `loader` that doesn't define its own schema. If you provide both, the `schema` will take precedence.
- `loader`: A real loader that defines its own schema.
- `entryCount`: The number of entries to generate. Defaults to 10.
- `idField`: The name of the field to use as the entry ID. By default will use an incrementing number.
- `seed`: A seed value for the random number generator. This can be used to generate the same data each time. If you don't provide a seed, the data will be different each time you update the data.
- `mockHTML`: A boolean that determines whether to generate HTML mock content for the collection. If `true`, you will be able to use `render(entry)` to render mock HTML content in a page.
