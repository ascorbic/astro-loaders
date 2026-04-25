# Astro Bluesky 帖子加载器

这个包为 Astro 提供 Bluesky 帖子加载器。它允许您加载和解析 Bluesky 帖子，并在您的 Astro 网站中使用这些数据。

它提供两种类型的加载器：

- `authorFeedLoader`：构建时加载器，在构建之间缓存帖子
- `liveBlueskyLoader`：实时加载器，在每次请求时获取新鲜数据

## 安装

```sh
npm install @ascorbic/bluesky-loader
```

## 使用方法

### 构建时集合：`authorFeedLoader`

您可以在内容配置中使用构建时加载器，如下所示：

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

然后您可以像使用任何其他内容集合一样在 Astro 中使用它们：

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

### 实时集合：`liveBlueskyLoader`（实验性）

对于在每次请求时更新的实时数据，您可以使用实时加载器。这需要 Astro 5.10.0 或更高版本，并启用实验性实时内容集合：

```javascript
// astro.config.mjs
export default defineConfig({
  experimental: {
    liveContentCollections: true,
  },
});
```

创建实时集合配置：

```typescript
// src/live.config.ts
import { defineLiveCollection } from "astro:content";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";

const livePosts = defineLiveCollection({
  type: "live",
  loader: liveBlueskyLoader({
    identifier: "mk.gg", // 可选：可以在过滤器中设置
    service: "https://public.api.bsky.app", // 可选：默认为公共 API
  }),
});

export const collections = { livePosts };
```

使用实时集合配合 `getLiveCollection()` 和 `getLiveEntry()`：

```astro
---
import { getLiveCollection, getLiveEntry } from "astro:content";

// 使用过滤器获取帖子
const { entries: posts, error } = await getLiveCollection("livePosts", {
  limit: 10,
  type: "posts_no_replies",
  identifier: "different.user", // 覆盖默认标识符
  since: new Date("2024-01-01"),
});

// 获取单个帖子
const { entry: post } = await getLiveEntry("livePosts", {
  id: "at://did:plc:user/app.bsky.feed.post/abc123"
});

export const prerender = false; // 实时内容必需
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

## 配置选项

### authorFeedLoader 选项

`authorFeedLoader` 函数接受具有以下属性的选项对象：

- `identifier`：您要加载其订阅源的作者的标识符。这可以是用户名（如 `mk.gg`）或完整的 `did`
- `limit`：要加载的最大帖子数。默认为加载所有帖子。
- `filter`：过滤帖子类型。选项：`posts_and_author_threads`、`posts_no_replies`、`posts_with_replies`、`posts_and_replies`

### liveBlueskyLoader 选项

`liveBlueskyLoader` 函数接受具有以下属性的选项对象：

- `identifier`（可选）：您要加载其订阅源的作者的默认标识符。可以在集合过滤器中覆盖。
- `service`（可选）：Bluesky 服务 URL。默认为 `"https://public.api.bsky.app"`。

### 集合过滤器选项（liveBlueskyLoader）

调用 `getLiveCollection()` 时，您可以传递过滤器选项：

- `limit`：获取的最大帖子数
- `type`：过滤帖子类型（`posts_and_author_threads`、`posts_no_replies`、`posts_with_replies`、`posts_and_replies`）
- `identifier`：覆盖加载器选项中的默认标识符
- `since`：仅获取此日期之后的帖子
- `until`：仅获取此日期之前的帖子

## 渲染帖子

帖子 `data` 属性是一个 `PostView` 对象，并且是完全类型化的。为了更容易显示帖子，我们为每个条目生成 HTML。`render()` 函数是可选的，但从帖子内容创建一个组件。这处理帖子内容中的链接、提及和标签。您可以在 `data.embed` 对象中访问图像和其他嵌入。如果您想访问渲染的 HTML，可以使用 `rendered.html` 字段。

但是您可能希望使用 [`@atproto/api`](https://www.npmjs.com/package/@atproto/api) 包中的助手来处理数据。例如，这显示了如何使用嵌入 `isView` 类型守卫来检查嵌入的类型：

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

## 错误处理

### 实时集合错误处理

实时集合返回您应该在组件中处理的错误：

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

### BlueskyError 类型

实时加载器返回特定的错误代码：

- `MISSING_IDENTIFIER`：选项或过滤器中未提供标识符
- `INVALID_FILTER`：缺少必需的过滤器参数
- `INVALID_ID_FORMAT`：ID 不是有效的 AT URI 格式
- `ENTRY_NOT_FOUND`：帖子未找到（可能已被删除）
- `COLLECTION_LOAD_ERROR`：加载集合失败（网络/API 错误）
- `ENTRY_LOAD_ERROR`：加载单个条目失败（网络/API 错误）

## 实时 vs 构建时集合

| 功能                | 构建时 (`authorFeedLoader`) | 实时 (`liveBlueskyLoader`)          |
| ------------------ | -------------------------- | ----------------------------------- |
| **性能**            | 快速（预构建）               | 较慢（请求时获取）                   |
| **数据新鲜度**      | 构建时快照                  | 实时数据                             |
| **缓存**            | 内置增量更新                | 无自动缓存                           |
| **过滤**            | 有限选项                     | 丰富的过滤（日期、类型、用户）         |
| **错误处理**        | 构建时错误                   | 运行时错误处理                       |
| **用例**            | 静态站点、存档内容           | 动态站点、实时订阅源                 |

**选择构建时** 当您想要快速加载且不需要实时更新时。
**选择实时** 当您需要新鲜数据且可以处理性能权衡时。</content>
<parameter name="filePath">packages/astro-loaders/packages/bluesky/README_zh.md