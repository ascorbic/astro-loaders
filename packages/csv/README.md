# Astro CSV loader

This package provides a CSV loader for Astro. It allows you to load and parse CSV files, and use the data in your Astro site, including using it to generate pages.

## Installation

```sh
npm install @ascorbic/csv-loader
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
import { csvLoader } from "@ascorbic/csv-loader";

const customers = defineCollection({
  loader: csvLoader({
    fileName: "data/customers.csv",
  }),
  schema: z.object({
    customerID: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    age: z.number(),
    registrationDate: z.coerce.date(),
    purchaseAmount: z.number(),
  }),
});

export const collections = { customers };
```

You can then use these like any other content collection in Astro:

```astro
---
import type { GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import Layout from "../../layouts/Layout.astro";

export const getStaticPaths: GetStaticPaths = async () => {
  const customers = await getCollection("customers");
  return customers.map((customer) => ({
    params: {
      id: customer.id,
    },
    props: { customer },
  }));
};

type Props = { customer: CollectionEntry<"customers"> };

const { customer } = Astro.props;
const { data } = customer;
---

<Layout title={data.firstName}>
  <h1>{data.firstName} {data.lastName}</h1>
  <p>{data.email}</p>
  <p>{data.registrationDate.toISOString()}</p>
</Layout>


```

## Options

The `csvLoader` function takes an options object with the following properties:

- `fileName`: The path to the CSV file to load. This should be absolute, or relative to the project root.
- `transformHeader`: A function that transforms the header values into field names. By default, the values are camelized. Pass `false` to leave the values unchanged.
- `idField`: The field to use as an ID. Values in this column must be unique. If the header is transformed, it is the value _after_ transformation. The default is the first column.
- `parserOptions`: Additional ptions passed to the CSV parser. This object is passed directly to the PapaParse CSV library. See the [PapaParse documentation](https://www.papaparse.com/docs#config) for more information.
