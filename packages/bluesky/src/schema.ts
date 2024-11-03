import { z } from "astro/zod";

// Internal Embed Types (non-#view)
const EmbedExternalSchema = z.object({
  $type: z.literal("app.bsky.embed.external"),
  external: z.object({
    description: z.string().optional(),
    thumb: z
      .object({
        $type: z.literal("blob"),
        ref: z.object({ $link: z.string() }),
        mimeType: z.string(),
        size: z.number(),
      })
      .optional(),
    title: z.string().optional(),
    uri: z.string().url(),
  }),
});

const EmbedRecordSchema = z.object({
  $type: z.literal("app.bsky.embed.record"),
  record: z.object({
    uri: z.string(),
    cid: z.string(),
  }),
});

const EmbedRecordWithMediaSchema = z.object({
  $type: z.literal("app.bsky.embed.recordWithMedia"),
  media: EmbedExternalSchema,
  record: EmbedRecordSchema,
});

const EmbedImagesSchema = z.object({
  $type: z.literal("app.bsky.embed.images"),
  images: z.array(
    z.object({
      alt: z.string(),
      aspectRatio: z.object({
        height: z.number(),
        width: z.number(),
      }),
      image: z.object({
        $type: z.literal("blob"),
        ref: z.object({ $link: z.string() }),
        mimeType: z.string(),
        size: z.number(),
      }),
    }),
  ),
});

// #view Embed Types
const EmbedExternalViewSchema = z.object({
  $type: z.literal("app.bsky.embed.external#view"),
  external: z.object({
    uri: z.string().url(),
    title: z.string().optional(),
    description: z.string().optional(),
    thumb: z.string().url().optional(), // Direct URL for view
  }),
});

const EmbedRecordWithMediaViewSchema = z.object({
  $type: z.literal("app.bsky.embed.recordWithMedia#view"),
  media: EmbedExternalViewSchema,
  record: z.object({
    record: z.object({
      $type: z.literal("app.bsky.embed.record#viewRecord"),
      uri: z.string(),
      cid: z.string(),
      author: z.object({
        did: z.string(),
        handle: z.string(),
        displayName: z.string(),
        avatar: z.string().url().optional(),
      }),
      value: z.object({
        $type: z.literal("app.bsky.feed.post"),
        createdAt: z.string().datetime(),
      }),
    }),
  }),
});

const EmbedImagesViewSchema = z.object({
  $type: z.literal("app.bsky.embed.images#view"),
  images: z.array(
    z.object({
      thumb: z.string().url(),
      fullsize: z.string().url(),
      alt: z.string().optional(),
      aspectRatio: z
        .object({
          height: z.number(),
          width: z.number(),
        })
        .optional(),
    }),
  ),
});

// Main Post Schema
export const PostSchema = z.object({
  uri: z.string(),
  cid: z.string(),
  author: z.object({
    did: z.string(),
    handle: z.string(),
    displayName: z.string(),
    avatar: z.string().url().optional(),
    associated: z
      .object({
        chat: z
          .object({
            allowIncoming: z.enum(["following", "all", "none"]).optional(),
          })
          .optional(),
      })
      .optional(),
    labels: z.array(z.any()).optional(),
    createdAt: z.string().datetime(),
  }),
  record: z.object({
    $type: z.literal("app.bsky.feed.post"),
    createdAt: z.string().datetime(),
    langs: z.array(z.string()),
    text: z.string().max(3000),
    reply: z
      .object({
        parent: z.object({
          cid: z.string(),
          uri: z.string(),
        }),
        root: z.object({
          cid: z.string(),
          uri: z.string(),
        }),
      })
      .optional(),
    embed: z
      .union([
        EmbedExternalSchema,
        EmbedRecordSchema,
        EmbedRecordWithMediaSchema,
        EmbedImagesSchema,
      ])
      .optional(),
    facets: z
      .array(
        z.object({
          index: z.object({
            byteStart: z.number().nonnegative(),
            byteEnd: z.number().nonnegative(),
          }),
          features: z.array(
            z.union([
              z.object({
                $type: z.literal("app.bsky.richtext.facet#mention"),
                did: z.string(),
              }),
              z.object({
                $type: z.literal("app.bsky.richtext.facet#link"),
                uri: z.string().url(),
              }),
              z.object({
                $type: z.literal("app.bsky.richtext.facet#tag"),
                tag: z.string(),
              }),
              z.object({
                // Unknown facet type
                $type: z.string(),
                tag: z.string(),
              }),
            ]),
          ),
        }),
      )
      .optional(),
  }),
  embed: z
    .union([
      EmbedExternalViewSchema,
      EmbedRecordWithMediaViewSchema,
      EmbedImagesViewSchema,
    ])
    .optional(), // Embed at top level as a single object
  replyCount: z.number().nonnegative(),
  repostCount: z.number().nonnegative(),
  likeCount: z.number().nonnegative(),
  quoteCount: z.number().nonnegative(),
  indexedAt: z.string().datetime(),
  labels: z.array(z.any()).optional(),
});

export type Post = z.infer<typeof PostSchema>;
