import { z } from "astro/zod";

const EmbedExternalSchema = z.object({
  $type: z.literal("app.bsky.embed.external"),
  external: z.object({
    uri: z.string().url(),
    title: z.string().optional(),
    description: z.string().optional(),
    thumb: z
      .object({
        $type: z.literal("blob"),
        ref: z.object({ $link: z.string() }),
        mimeType: z.string(),
        size: z.number(),
      })
      .optional(),
  }),
});

const EmbedExternalViewSchema = z.object({
  $type: z.literal("app.bsky.embed.external#view"),
  external: z.object({
    uri: z.string().url(),
    title: z.string().optional(),
    description: z.string().optional(),
    thumb: z.string().url().optional(), // Direct URL for view
  }),
});

// Record Embed
const EmbedRecordSchema = z.object({
  $type: z.literal("app.bsky.embed.record"),
  record: z.object({
    uri: z.string(),
    cid: z.string(),
  }),
});

const EmbedImagesSchema = z.object({
  $type: z.literal("app.bsky.embed.images"),
  images: z.array(
    z.object({
      image: z.object({
        $type: z.literal("blob"),
        ref: z.object({ $link: z.string() }),
        mimeType: z.string(),
        size: z.number(),
      }),
      alt: z.string(),
    }),
  ),
});

// Images Embed View
const EmbedImagesViewSchema = z.object({
  $type: z.literal("app.bsky.embed.images#view"),
  images: z.array(
    z.object({
      thumb: z.string().url(),
      fullsize: z.string().url(),
      alt: z.string().optional(),
    }),
  ),
});

// List Embed
const EmbedListSchema = z.object({
  $type: z.literal("app.bsky.embed.list"),
  list: z.object({
    title: z.string(),
    items: z.array(
      z.object({
        uri: z.string(),
        label: z.string(),
      }),
    ),
  }),
});

// List Embed View
const EmbedListViewSchema = z.object({
  $type: z.literal("app.bsky.embed.list#view"),
  list: z.object({
    title: z.string(),
    items: z.array(
      z.object({
        uri: z.string(),
        label: z.string(),
      }),
    ),
  }),
});

// Starter Pack Embed
const EmbedStarterPackSchema = z.object({
  $type: z.literal("app.bsky.embed.starterPack"),
  starterPack: z.object({
    title: z.string(),
    description: z.string().optional(),
    members: z.array(
      z.object({
        did: z.string(),
        handle: z.string(),
        displayName: z.string().optional(),
        avatar: z.string().url().optional(),
      }),
    ),
  }),
});

// Record Embed View
const EmbedRecordViewSchema = z.object({
  $type: z.literal("app.bsky.embed.record#view"),
  record: z.object({
    uri: z.string(),
    cid: z.string(),
    author: z.object({
      did: z.string(),
      handle: z.string(),
      displayName: z.string(),
      avatar: z.string().url().optional(),
    }),
    value: z.object({
      $type: z.string(),
      createdAt: z.string().datetime(),
      text: z.string().optional(),
    }),
  }),
});

const EmbedRecordWithMediaSchema = z.object({
  $type: z.literal("app.bsky.embed.recordWithMedia"),
  record: z.object({
    uri: z.string(),
    cid: z.string(),
    author: z.object({
      did: z.string(),
      handle: z.string(),
      displayName: z.string(),
      avatar: z.string().url().optional(),
    }),
    value: z.object({
      $type: z.string(),
      createdAt: z.string().datetime(),
      text: z.string().optional(),
    }),
  }),
  media: z.union([
    EmbedExternalSchema, // External embed type
    EmbedImagesSchema, // Image embed type
  ]),
});

const EmbedRecordWithMediaViewSchema = z.object({
  $type: z.literal("app.bsky.embed.recordWithMedia#view"),
  record: z.object({
    uri: z.string(),
    cid: z.string(),
    author: z.object({
      did: z.string(),
      handle: z.string(),
      displayName: z.string(),
      avatar: z.string().url().optional(),
    }),
    value: z.object({
      $type: z.string(),
      createdAt: z.string().datetime(),
      text: z.string().optional(),
    }),
  }),
  media: z.union([
    EmbedExternalViewSchema, // External embed view type
    EmbedImagesViewSchema, // Image embed view type
  ]),
});

// Starter Pack Embed View
const EmbedStarterPackViewSchema = z.object({
  $type: z.literal("app.bsky.embed.starterPack#view"),
  starterPack: z.object({
    title: z.string(),
    description: z.string().optional(),
    members: z.array(
      z.object({
        did: z.string(),
        handle: z.string(),
        displayName: z.string().optional(),
        avatar: z.string().url().optional(),
      }),
    ),
  }),
});

const UnknownEmbedSchema = z
  .object({
    $type: z.string(),
  })
  .passthrough();

const EmbedSchema = z.union([
  EmbedExternalSchema,
  EmbedRecordSchema,
  EmbedRecordWithMediaSchema,
  EmbedImagesSchema,
  EmbedListSchema,
  EmbedStarterPackSchema,
  EmbedExternalViewSchema,
  EmbedRecordViewSchema,
  EmbedRecordWithMediaViewSchema,
  EmbedImagesViewSchema,
  EmbedListViewSchema,
  EmbedStarterPackViewSchema,
  UnknownEmbedSchema, // Catch-all for unknown embed types
]);
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
  record: z
    .object({
      $type: z.literal("app.bsky.feed.post"),
      createdAt: z.string().datetime(),
      langs: z.array(z.string()).optional(),
      text: z.string().optional(),
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
      embed: EmbedSchema.optional(),
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
                z.object({}).passthrough(), // Fallback for unknown facet types
              ]),
            ),
          }),
        )
        .optional(),
    })
    .passthrough(), // Allow unknown properties
  embed: EmbedSchema.optional(),
  replyCount: z.number().nonnegative(),
  repostCount: z.number().nonnegative(),
  likeCount: z.number().nonnegative(),
  quoteCount: z.number().nonnegative(),
  indexedAt: z.string().datetime(),
  labels: z.array(z.any()).optional(),
});

export type Post = z.infer<typeof PostSchema>;
