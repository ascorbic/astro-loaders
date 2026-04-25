# Astro YouTube 加载器

这个包为 Astro 提供 YouTube 加载器。它允许您使用 YouTube Data API v3 加载 YouTube 视频，并在您的 Astro 网站中使用这些数据。您可以按 ID 加载视频、从频道加载、通过搜索查询加载，或从播放列表加载。

该包包含两个加载器：

- **`youTubeLoader`**：构建时 YouTube 视频加载，用于构建时内容集合
- **`liveYouTubeLoader`**：实验性的运行时 YouTube 视频加载，用于实时内容集合

## 安装

```sh
npm install @ascorbic/youtube-loader
```

## 先决条件

要使用 YouTube 加载器，您需要 YouTube Data API v3 密钥。请按照以下步骤从 Google Cloud Console 获取一个：

1. **创建或选择 Google Cloud 项目**：如果您还没有项目，请创建一个新项目。否则，选择现有项目。
2. **启用 YouTube Data API v3**：在 Google Cloud Console 中，导航到 "APIs & Services" > "Library"。搜索 "YouTube Data API v3" 并为您的项目启用它。
3. **创建 API 凭据**：转到 "APIs & Services" > "Credentials"。点击 "Create Credentials" 并选择 "API Key"。
4. **限制 API 密钥（推荐）**：为了安全起见，强烈推荐限制您的 API 密钥。点击新创建的 API 密钥，然后在 "API restrictions" 下，选择 "Restrict key" 并从下拉菜单中选择 "YouTube Data API v3"。这确保密钥只能用于 YouTube API。

获得 API 密钥后，将其添加到您的 `.env` 文件中：

```bash
YOUTUBE_API_KEY="your_youtube_api_key_here"
```

## 使用方法

### 构建时 YouTube 加载（静态集合）

您可以在内容配置中使用 YouTube 加载器，如下所示：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { youTubeLoader } from "@ascorbic/youtube-loader";

// 按 ID 加载特定视频
const videos = defineCollection({
  loader: youTubeLoader({
    type: "videos",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0"],
  }),
});

// 从频道加载视频
const channelVideos = defineCollection({
  loader: youTubeLoader({
    type: "channel",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    maxResults: 50,
    order: "date",
  }),
});

// 搜索视频
const searchResults = defineCollection({
  loader: youTubeLoader({
    type: "search",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    query: "astro framework",
    maxResults: 25,
    publishedAfter: new Date("2023-01-01"),
  }),
});

// 从播放列表加载视频
const playlistVideos = defineCollection({
  loader: youTubeLoader({
    type: "playlist",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    playlistId: "PLqGQbXn_GDmnHxd6p_tTlN3d5pMhTjy8g",
    maxResults: 50,
  }),
});

export const collections = { videos, channelVideos, searchResults, playlistVideos };
```

您可以像使用任何其他集合一样使用它们：

```astro
---
import { getCollection } from "astro:content";
import Layout from "../layouts/Layout.astro";

const videos = await getCollection("videos");
---

<Layout title="Videos">
  <h2>YouTube 视频</h2>
  <div class="video-grid">
    {
      videos.map((video) => (
        <div class="video-card">
          <a href={video.data.url} target="_blank">
            <img src={video.data.thumbnails.medium?.url} alt={video.data.title} />
            <h3>{video.data.title}</h3>
            <p>{video.data.channelTitle}</p>
            <p>{video.data.viewCount} views</p>
          </a>
        </div>
      ))
    }
  </div>
</Layout>
```

### 从播放列表加载

当使用 `type: "playlist"` 时，您可以从特定 YouTube 播放列表加载所有视频。这对于策划的内容集合很有用：

```typescript
const tutorialSeries = defineCollection({
  loader: youTubeLoader({
    type: "playlist",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    playlistId: "PLqGQbXn_GDmnHxd6p_tTlN3d5pMhTjy8g",
    maxResults: 100, // 从播放列表加载最多 100 个视频
  }),
});
```

播放列表中的视频保持播放列表顺序，并包含与单个视频相同的所有元数据。

您可以使用 `render()` 函数渲染视频描述：

```astro
---
import { render, getEntry } from "astro:content";

const video = await getEntry("videos", Astro.params.id);
const { Content } = await render(video);
---
<h1>{video.data.title}</h1>
<p>By: {video.data.channelTitle}</p>
<p>Published: {video.data.publishedAt.toLocaleDateString()}</p>
<p>Duration: {video.data.duration}</p>
<p>Views: {video.data.viewCount}</p>

<div class="video-embed">
  <iframe
    src={`https://www.youtube.com/embed/${video.data.id}`}
    title={video.data.title}
    frameborder="0"
    allowfullscreen
  ></iframe>
</div>

<Content />
```

## API 参考

### `youTubeLoader(options)`

构建时内容集合加载器，用于构建时 YouTube 视频处理。

#### 配置选项

- `type`（必需）：`'videos' | 'channel' | 'search' | 'playlist'`
- `apiKey`（必需）：您的 YouTube Data API v3 密钥
- `videoIds`：视频 ID 数组（当 `type` 为 `'videos'` 时必需）
- `channelId`：YouTube 频道 ID（当 `type` 为 `'channel'` 时必需，或可以使用 `channelHandle`）
- `channelHandle`：YouTube 频道句柄（`channelId` 的替代方案，用于 `'channel'` 类型）
- `query`：搜索查询（当 `type` 为 `'search'` 时必需）
- `playlistId`：YouTube 播放列表 ID（当 `type` 为 `'playlist'` 时必需）
- `maxResults`：最大结果数（默认：25）。注意：YouTube API 将此限制为大多数端点的 50。
- `order`：排序顺序（`'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount'`）。适用于 `'channel'` 和 `'search'` 类型。
- `publishedAfter`：筛选在此日期后发布的视频。适用于 `'channel'` 和 `'search'` 类型。
- `publishedBefore`：筛选在此日期前发布的视频。适用于 `'channel'` 和 `'search'` 类型。
- `regionCode`：本地化结果的区域代码。适用于 `'search'` 类型。
- `categoryId`：YouTube 类别 ID。适用于 `'channel'` 和 `'search'` 类型。
- `duration`：按视频时长筛选（`'short' | 'medium' | 'long'`）。适用于 `'channel'` 和 `'search'` 类型。
- `parts`：要包含的其他 YouTube API 部分（例如，`["snippet", "contentDetails"]`）
- `requestOptions`：自定义获取选项
- `fetchFullDetails`：`boolean`（默认：`false`）。如果为 `true`，加载器将对视频进行额外 API 调用以获取 `duration`、`viewCount`、`likeCount` 和 `commentCount`。如果为 `false`，这些属性对于那些类型可能为 `undefined`，但会减少 API 配额使用。

### 视频数据结构

每个视频条目符合 `Video` 类型。当 `fetchFullDetails` 为 `false`（默认值）时，像 `duration`、`viewCount`、`likeCount` 和 `commentCount` 这样的属性对于从频道、搜索或播放列表类型获取的视频可能为 `undefined`。

如果 `fetchFullDetails` 设置为 `true`，返回的条目将符合 `VideoWithFullDetails` 类型，其中这些属性保证存在。

```typescript
// 基础 Video 类型（当 fetchFullDetails 为 false 时）
{
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  duration?: string; // ISO 8601 格式（例如，"PT4M13S"）
  channelId: string;
  channelTitle: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  tags?: string[];
  categoryId?: string;
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
  liveBroadcastContent?: string;
  defaultLanguage?: string;
}

// VideoWithFullDetails 类型（当 fetchFullDetails 为 true 时）
// 上述所有可选属性都保证存在。
```

#### 处理 `fetchFullDetails` 在代码中

当使用 `fetchFullDetails: false` 时，您应该处理 `undefined` 属性的可能性。TypeScript 的类型缩小可以提供帮助：

```typescript
import { getCollection } from "astro:content";
import type { Video, VideoWithFullDetails } from "@ascorbic/youtube-loader";

// 示例：fetchFullDetails: false（默认）
const videos = await getCollection("videos-without-full-details");

videos.map(videoEntry => {
  const video = videoEntry.data; // 类型：Video
  if (video.duration) {
    // TypeScript 在这里知道 video.duration 是 string
    console.log(`视频时长：${video.duration}`);
  } else {
    console.log("视频时长不可用。");
  }
});

// 示例：fetchFullDetails: true
const videosWithFullDetails = await getCollection("videos-with-full-details");

videosWithFullDetails.map(videoEntry => {
  const video = videoEntry.data; // 类型：VideoWithFullDetails
  // TypeScript 在这里知道 video.duration 是 string，无需检查
  console.log(`视频时长：${video.duration}`);
});
```

## 环境变量

在您的 `.env` 文件中设置您的 YouTube API 密钥：

```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## 速率限制

YouTube Data API v3 有配额限制：

- 默认配额：每天 10,000 个单位
- 不同操作消耗不同单位
- 加载器自动处理缓存以最小化 API 调用
- 选择实时与静态加载时考虑配额影响</content>
<parameter name="filePath">packages/astro-loaders/packages/youtube/README_zh.md