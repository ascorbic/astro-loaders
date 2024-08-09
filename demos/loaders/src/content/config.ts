import { defineCollection, z } from "astro:content";
// import { feedLoader } from "@ascorbic/feed-loader";
import { csvLoader } from "@ascorbic/csv-loader";

// const releases = defineCollection({
//   loader: feedLoader({
//     url: "https://github.com/withastro/astro/releases.atom",
//   }),
// });

// const podcasts = defineCollection({
//   loader: feedLoader({
//     url: "https://feeds.99percentinvisible.org/99percentinvisible",
//   }),
// });

/*
  customerID: 49,
  firstName: 'Brian',
  lastName: 'Howard',
  email: 'brian.h@email.com',
  age: 39,
  registrationDate: '2022-02-27',
  purchaseAmount: 205.5,
  isSubscriber: true,
  lastPurchaseDate: '2023-12-07',
  */

const customers = defineCollection({
  loader: csvLoader({
    fileName: "data/customers.csv",
  }),
  schema: z.object({
    customerID: z.coerce.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    age: z.coerce.number(),
    registrationDate: z.coerce.date(),
    purchaseAmount: z.coerce.number(),
    isSubscriber: z.coerce.boolean(),
    lastPurchaseDate: z.coerce.date(),
  }),
});

export const collections = { customers };

// export const collections = { releases, podcasts, customers };
