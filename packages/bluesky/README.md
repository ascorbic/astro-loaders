# Astro Bluesky post loader

This package provides Bluesky post loaders for Astro. It allows you to load and parse Bluesky posts, and use the data in your Astro site.

It provides two types of loaders:

- `authorFeedLoader`: Build-time loader that caches posts between builds
- `liveBlueskyLoader`: Live loader that fetches fresh data on each request

## Installation

```sh
npm install @ascorbic/bluesky-loader
```

## Usage

### Build-time Collections: `authorFeedLoader`

You can then use the build-time loader in your content configuration like this:

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { authorFeedLoader } from "@ascorbic/bluesky-loader";

const posts = defineCollection({
  loader: authorFeedLoader({
    identifier: "mk.gg",
  }),
});

export const collections = { posts };
```

You can then use these like any other content collection in Astro:

```astro
---
import { getCollection, type CollectionEntry, render } from "astro:content";
import Layout from "../../layouts/Layout.astro";
const posts = await getCollection("posts");

---

<Layout>
  {
    posts.map(async (post) => {
      const { Content } = await render(post);
      return (
        <section>
          <Content />
          <p>{post.data.likeCount} likes</p>
        </section>
      );
    })
  }
</Layout>

```

### Live Collections: `liveBlueskyLoader` (Experimental)

For real-time data that updates on each request, you can use the live loader. This requires Astro 5.10.0 or later with experimental live content collections enabled:

```javascript
// astro.config.mjs
export default defineConfig({
  experimental: {
    liveContentCollections: true,
  },
});
```

Create a live collection configuration:

```typescript
// src/live.config.ts
import { defineLiveCollection } from "astro:content";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";

const livePosts = defineLiveCollection({
  type: "live",
  loader: liveBlueskyLoader({
    identifier: "mk.gg", // Optional: can be set in filter instead
    service: "https://public.api.bsky.app", // Optional: defaults to public API
  }),
});

export const collections = { livePosts };
```

Use live collections with `getLiveCollection()` and `getLiveEntry()`:

```astro
---
import { getLiveCollection, getLiveEntry } from "astro:content";

// Get posts with filters
const { entries: posts, error } = await getLiveCollection("livePosts", {
  limit: 10,
  type: "posts_no_replies",
  identifier: "different.user", // Override default identifier
  since: new Date("2024-01-01"),
});

// Get individual post
const { entry: post } = await getLiveEntry("livePosts", {
  id: "at://did:plc:user/app.bsky.feed.post/abc123"
});

export const prerender = false; // Required for live content
---

{error ? (
  <p>Error: {error.message}</p>
) : (
  <div>
    {posts?.map(post => (
      <article>
        <h3>{post.data.author.displayName}</h3>
        <div set:html={post.rendered?.html} />
        <p>{post.data.likeCount} likes</p>
      </article>
    ))}
  </div>
)}
```

## Options

### authorFeedLoader Options

The `authorFeedLoader` function takes an options object with the following properties:

- `identifier`: The identifier of the author whose feed you want to load. This can be the username (such as `mk.gg`) or the full `did`
- `limit`: The maximum number of posts to load. Defaults to loading all posts.
- `filter`: Filter the type of posts. Options: `posts_and_author_threads`, `posts_no_replies`, `posts_with_replies`, `posts_and_replies`

### liveBlueskyLoader Options

The `liveBlueskyLoader` function takes an options object with the following properties:

- `identifier` (optional): The default identifier of the author whose feed you want to load. Can be overridden in collection filters.
- `service` (optional): The Bluesky service URL. Defaults to `"https://public.api.bsky.app"`.

### Collection Filter Options (liveBlueskyLoader)

When calling `getLiveCollection()`, you can pass filter options:

- `limit`: Maximum number of posts to fetch
- `type`: Filter the type of posts (`posts_and_author_threads`, `posts_no_replies`, `posts_with_replies`, `posts_and_replies`)
- `identifier`: Override the default identifier from loader options
- `since`: Only fetch posts after this date
- `until`: Only fetch posts before this date

### Entry Filter Options (liveBlueskyLoader)

When calling `getLiveEntry()`, you can pass filter options:

- `id`: The AT URI of the post (e.g., `"at://did:plc:user/app.bsky.feed.post/abc123"`)
- `uri`: Alternative to `id` - the AT URI of the post

## Rendering posts

The post `data` property is a `PostView` object, and is fully typed. To make it easier to display posts, we generate HTML for each entry. The `render()` function is optional, but creates a component from the post content. This handles links, mentions and tags in the post content. You can access images and other embeds in the `data.embed` object. If you want access to the rendered HTML, you can use `rendered.html` field.

However you might want to use the helpers in the [`@atproto/api`](https://www.npmjs.com/package/@atproto/api) package to work with the data. For example, this shows how you can use the embed `isView` type guards to check the type of an embed:

```astro
---
import { AppBskyEmbedImages, AppBskyEmbedRecordWithMedia } from "@atproto/api";
import { getCollection } from "astro:content";
import Layout from "../../layouts/Layout.astro";
const posts = await getCollection("posts");
---
<Layout>
  {
    posts.map(async (post) => {
      const { embed } = post.data;
      return (
        <div>
          {AppBskyEmbedImages.isView(embed)
            ? embed.images.map(
                (image) => image && <img src={image.thumb} alt={image.alt} />
              )
            : undefined}
          {AppBskyEmbedRecordWithMedia.isView(embed) ? (
            <img
              src={embed.media.external.uri}
              alt={embed.media.external.description}
            />
          ) : undefined}
        </div>
      );
    })
  }
</Layout>

```

## Error Handling

### Live Collections Error Handling

Live collections return errors that you should handle in your components:

```astro
---
import { getLiveCollection, LiveEntryNotFoundError } from "astro:content";

const { entries: posts, error } = await getLiveCollection("livePosts");

if (error) {
  if (LiveEntryNotFoundError.is(error)) {
    console.error(`Posts not found: ${error.message}`);
  } else {
    console.error(`Error loading posts: ${error.message}`);
  }
}
---
```

### BlueskyError Types

The live loader returns specific error codes:

- `MISSING_IDENTIFIER`: No identifier provided in options or filter
- `INVALID_FILTER`: Missing required filter parameters
- `INVALID_ID_FORMAT`: ID is not a valid AT URI format
- `ENTRY_NOT_FOUND`: Post not found (may have been deleted)
- `COLLECTION_LOAD_ERROR`: Failed to load collection (network/API error)
- `ENTRY_LOAD_ERROR`: Failed to load individual entry (network/API error)

## Live vs Build-time Collections

| Feature            | Build-time (`authorFeedLoader`) | Live (`liveBlueskyLoader`)        |
| ------------------ | ------------------------------- | --------------------------------- |
| **Performance**    | Fast (pre-built)                | Slower (fetches on request)       |
| **Data freshness** | Build-time snapshot             | Real-time data                    |
| **Caching**        | Built-in incremental updates    | No automatic caching              |
| **Filtering**      | Limited options                 | Rich filtering (date, type, user) |
| **Error handling** | Build-time errors               | Runtime error handling            |
| **Use case**       | Static sites, archived content  | Dynamic sites, live feeds         |

**Choose build-time** when you want fast loading and don't need real-time updates.
**Choose live** when you need fresh data and can handle the performance trade-off.
