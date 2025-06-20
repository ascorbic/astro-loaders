# Astro Bluesky post loader

This package provides a Bluesky post loader for Astro. It allows you to load and parse Bluesky posts, and use the data in your Astro site.

Currently it provides `authorFeedLoader`, which loads the posts of a single user. By default it will load all posts, but you can limit the number of posts loaded. It caches the posts between builds, so only new posts will be loaded.

## Installation

```sh
npm install @ascorbic/bluesky-loader
```

## Usage

You can use the post loader in your content configuration like this:

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { authorFeedLoader } from "@ascorbic/bluesky-loader";

const posts = defineCollection({
  loader: authorFeedLoader({
    identifier: "mk.gg",
  }),
  // The loader provides its own type schema, so you don't need to provide one
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

## Options

The `authorFeedLoader` function takes an options object with the following properties:

- `identifier`: The identifier of the author whose feed you want to load. This can be the username (such as `mk.gg`) or the full `did`
- `limit`: The maximum number of posts to load. Defaults to loading all posts.

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
