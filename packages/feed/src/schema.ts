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

// Legacy schemas from original implementation for exact backward compatibility
export const LegacyNSSchema = z.record(z.string());

export const LegacyImageSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
});

export const LegacyEnclosureSchema = z.object({
  length: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  url: z.string(),
});

export const LegacyMetaSchema = z.object({
  "#ns": z.array(LegacyNSSchema),
  "#type": z.enum(["atom", "rss", "rdf"]),
  "#version": z.string(),
  title: z.string(),
  description: z.string().nullable(),
  date: z.coerce.date().nullable(),
  pubdate: z.coerce.date().nullable(),
  link: z.string().nullable(),
  xmlurl: z.string().nullable(),
  author: z.string().nullable(),
  language: z.string().nullable(),
  image: LegacyImageSchema.nullable(),
  favicon: z.string().nullable(),
  copyright: z.string().nullable(),
  generator: z.string().nullable(),
  categories: z.array(z.string()),
});

// Image schema for feeds and items
export const FeedImageSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
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

export const LegacyItemSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    summary: z.string().nullable(),
    date: z.coerce.date().nullable(),
    pubdate: z.coerce.date().nullable(),
    link: z.string().nullable(),
    origlink: z.string().nullable(),
    author: z.string().nullable(),
    guid: z.string(),
    comments: z.string().nullable(),
    image: LegacyImageSchema,
    categories: z.array(z.string()),
    enclosures: z.array(LegacyEnclosureSchema),
    meta: LegacyMetaSchema,
  })
  .and(z.record(z.unknown())); // Allow additional fields

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

export type FeedAuthor = z.infer<typeof FeedAuthorSchema>;
export type FeedCategory = z.infer<typeof FeedCategorySchema>;
export type FeedImage = z.infer<typeof FeedImageSchema>;
export type FeedGenerator = z.infer<typeof FeedGeneratorSchema>;
export type FeedItemMedia = z.infer<typeof FeedItemMediaSchema>;
export type FeedMeta = z.infer<typeof FeedMetaSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Feed = z.infer<typeof FeedSchema>;

// Legacy types matching original implementation
export type LegacyNS = z.infer<typeof LegacyNSSchema>;
export type LegacyImage = z.infer<typeof LegacyImageSchema>;
export type LegacyEnclosure = z.infer<typeof LegacyEnclosureSchema>;
export type LegacyMeta = z.infer<typeof LegacyMetaSchema>;
export type LegacyItem = z.infer<typeof LegacyItemSchema>;
