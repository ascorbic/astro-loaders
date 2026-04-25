# Astro 订阅源加载器

这个包为 Astro 提供订阅源加载器。它允许您加载和解析 RSS、RDF 和 Atom 订阅源，并在您的 Astro 网站中使用这些数据。

该包包含两个加载器：

- **`feedLoader`**：构建时订阅源加载，用于构建时内容集合
- **`liveFeedLoader`**：实验性的运行时订阅源加载，用于实时内容集合

## 安装

```sh
npm install @ascorbic/feed-loader
```

## 使用方法

### 构建时订阅源加载（静态集合）

您可以在内容配置中使用订阅源加载器，如下所示：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";

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

export const collections = { releases, podcasts };
```

然后您可以像使用任何其他集合一样使用它们：

```astro
---
import { getCollection } from "astro:content";
import Layout from "../layouts/Layout.astro";

const episodes = await getCollection("podcasts");
---

<Layout title="Episodes">
  <h2>节目集</h2>
  <ul>
    {
      episodes.map((episode) => (
        <li>
          <a href={`/episodes/${episode.id.replace(/\W/g, "-")}`}>
            {episode.data.title}
          </a>
        </li>
      ))
    }
  </ul>
</Layout>
```

您可以使用 `render()` 函数渲染节目描述：

```astro
---
import { render, getEntry } from "astro:content";

const episode = getEntry("podcasts", Astro.params.id);

const { Content } = await render(episode);
---
<h1>{episode.data.title}</h1>

<Content />

<p>
  {
    episode.data.media.map((media) => (
      <audio controls>
        <source src={media.url} type={media.mimeType} />
      </audio>
    ))
  }
</p>
```

## API 参考

### `feedLoader(options)`

构建时内容集合加载器，用于构建时订阅源处理。

### `liveFeedLoader(options)` ⚠️ **实验性功能**

实时内容集合加载器，用于运行时订阅源处理。

#### 配置选项

- `url`（必需）：要从中获取的订阅源 URL
- `requestOptions`：自定义获取选项（headers 等）

### 错误类型

- `FeedError`：基础错误类
- `FeedLoadError`：网络/HTTP 错误
- `FeedValidationError`：订阅源解析/验证错误

## 数据结构

每个订阅源条目包含：

- `id`：条目唯一标识符
- `title`：条目标题
- `description`：条目描述
- `url`：条目原始 URL
- `published`：发布日期
- `updated`：更新日期
- `author`：作者信息
- `categories`：类别标签
- `media`：媒体附件数组
- `content`：完整内容（如果可用）</content>
<parameter name="filePath">packages/astro-loaders/packages/feed/README_zh.md