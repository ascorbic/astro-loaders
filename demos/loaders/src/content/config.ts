import { defineCollection, z } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";
import { csvLoader } from "@ascorbic/csv-loader";
import { airtableLoader } from "@ascorbic/airtable-loader";
import { mockLoader } from "@ascorbic/mock-loader";

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

const mockBlog = defineCollection({
  loader: mockLoader({
    loader: feedLoader({
      url: "https://example.com",
    }),
    entryCount: 10,
    mockHTML: true,
    seed: 123,
  }),
});

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
    isSubscriber: z.boolean(),
    lastPurchaseDate: z.coerce.date(),
  }),
});

const mockOrders = defineCollection({
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
    seed: 123,
  }),
});

const spacecraft = defineCollection({
  loader: airtableLoader({
    base: import.meta.env.AIRTABLE_BASE,
    table: "Product Launches",
  }),
});

export const collections = {
  releases,
  podcasts,
  customers,
  spacecraft,
  mockBlog,
  mockOrders,
};
