import { string, z } from "astro/zod";

export const NSSchema = z.record(z.string());

export const ImageSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
});

export const MetaSchema = z.object({
  "#ns": z.array(NSSchema),
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
  image: ImageSchema.nullable(),
  favicon: z.string().nullable(),
  copyright: z.string().nullable(),
  generator: z.string().nullable(),
  categories: z.array(z.string()),
});

// Enclosure schema
export const EnclosureSchema = z.object({
  length: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  url: z.string(),
});

// Item schema
export const ItemSchema = z.object({
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
  image: ImageSchema,
  categories: z.array(z.string()),
  enclosures: z.array(EnclosureSchema),
  meta: MetaSchema,
});

type Simplify<T> = {
  [P in keyof T]: T[P];
};

export type NS = z.infer<typeof NSSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Enclosure = z.infer<typeof EnclosureSchema>;
export type Item = Simplify<
  z.infer<typeof ItemSchema> & {
    [key: string]: unknown;
  }
>;
