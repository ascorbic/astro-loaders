import { z } from "astro/zod";

// Author schema for feeds and items
export const FeedAuthorSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  url: z.string().nullable(),
});

// Category schema for feeds and items
export const FeedCategorySchema = z.object({
  label: z.string(),
  term: z.string(),
  url: z.string().nullable(),
});

// Legacy category schema for backward compatibility
export const LegacyFeedCategorySchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
});

// Image schema for feeds and items
export const FeedImageSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

// Generator schema for feeds
export const FeedGeneratorSchema = z.object({
  name: z.string().nullable(),
  url: z.string().nullable(),
  version: z.string().nullable(),
});

// Media schema for items
export const FeedItemMediaSchema = z.object({
  url: z.string(),
  image: z.string().nullable(),
  title: z.string().nullable(),
  length: z.number().nullable(),
  type: z.string().nullable(),
  mimeType: z.string().nullable(),
});

// Legacy media schema (enclosures) for backward compatibility
export const LegacyFeedItemMediaSchema = z.object({
  url: z.string(),
  type: z.string().nullable(),
  length: z.number().nullable(),
});

// Meta schema for feed type and version
export const FeedMetaSchema = z.object({
  type: z.enum(["atom", "rss"]),
  version: z.enum(["0.3", "0.9", "1.0", "2.0"]),
});

// Item schema based on @rowanmanning/feed-parser structure
export const ItemSchema = z.object({
  authors: z.array(FeedAuthorSchema),
  categories: z.array(FeedCategorySchema),
  content: z.string().nullable(),
  description: z.string().nullable(),
  id: z.string().nullable(),
  image: FeedImageSchema.nullable(),
  media: z.array(FeedItemMediaSchema),
  published: z.coerce.date().nullable(),
  title: z.string().nullable(),
  updated: z.coerce.date().nullable(),
  url: z.string().nullable(),
});

// Legacy item schema for backward compatibility
export const LegacyItemSchema = z.object({
  authors: z.array(FeedAuthorSchema),
  categories: z.array(LegacyFeedCategorySchema),
  content: z.string().nullable(),
  description: z.string().nullable(),
  id: z.string().nullable(),
  guid: z.string().nullable(), // Legacy alias for id
  image: FeedImageSchema.nullable(),
  enclosures: z.array(LegacyFeedItemMediaSchema), // Legacy name for media
  published: z.coerce.date().nullable(),
  title: z.string().nullable(),
  updated: z.coerce.date().nullable(),
  url: z.string().nullable(),
  link: z.string().nullable(), // Legacy alias for url
});

// Feed schema for the complete feed structure
export const FeedSchema = z.object({
  authors: z.array(FeedAuthorSchema),
  categories: z.array(FeedCategorySchema),
  copyright: z.string().nullable(),
  description: z.string().nullable(),
  generator: FeedGeneratorSchema.nullable(),
  image: FeedImageSchema.nullable(),
  items: z.array(ItemSchema),
  language: z.string().nullable(),
  meta: FeedMetaSchema,
  published: z.coerce.date().nullable(),
  self: z.string().nullable(),
  title: z.string().nullable(),
  updated: z.coerce.date().nullable(),
  url: z.string().nullable(),
});

type Simplify<T> = {
  [P in keyof T]: T[P];
};

export type FeedAuthor = z.infer<typeof FeedAuthorSchema>;
export type FeedCategory = z.infer<typeof FeedCategorySchema>;
export type LegacyFeedCategory = z.infer<typeof LegacyFeedCategorySchema>;
export type FeedImage = z.infer<typeof FeedImageSchema>;
export type FeedGenerator = z.infer<typeof FeedGeneratorSchema>;
export type FeedItemMedia = z.infer<typeof FeedItemMediaSchema>;
export type LegacyFeedItemMedia = z.infer<typeof LegacyFeedItemMediaSchema>;
export type FeedMeta = z.infer<typeof FeedMetaSchema>;
export type Item = Simplify<z.infer<typeof ItemSchema>>;
export type LegacyItem = Simplify<z.infer<typeof LegacyItemSchema>>;
export type Feed = Simplify<z.infer<typeof FeedSchema>>;
