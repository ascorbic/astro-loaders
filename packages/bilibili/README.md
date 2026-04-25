# Astro Bilibili 加载器

这个包为 Astro 提供 Bilibili 加载器。它允许您从 Bilibili 加载视频、播放列表（收藏夹）和专栏文章，并在您的 Astro 项目中将其用作内容。

该包支持以下内容类型：

- **`video`**: 单个 Bilibili 视频
- **`videos`**: 多个 Bilibili 视频
- **`playlist`**: Bilibili 收藏夹（播放列表）
- **`article`**: Bilibili 专栏文章

## 安装

```sh
npm install @ascorbic/bilibili-loader
```

## 使用方法

此包需要 Astro 5.0.0 或更高版本。

您可以在内容集合配置中使用 Bilibili 加载器：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { bilibiliLoader } from "@ascorbic/bilibili-loader";

// 加载单个视频
const video = defineCollection({
  loader: bilibiliLoader({
    type: "video",
    bvid: "BV1xx411c7mD",
  }),
});

// 加载多个视频
const videos = defineCollection({
  loader: bilibiliLoader({
    type: "videos",
    bvids: ["BV1xx411c7mD", "BV1yy411d7nE"],
  }),
});

// 加载收藏夹
const playlist = defineCollection({
  loader: bilibiliLoader({
    type: "playlist",
    fid: "123456789", // 收藏夹 ID
  }),
});

// 加载专栏文章
const article = defineCollection({
  loader: bilibiliLoader({
    type: "article",
    cvid: "12345678", // 文章 ID
  }),
});

export const collections = { video, videos, playlist, article };
```

然后您可以像使用任何其他内容集合一样使用它们：

```astro
---
import { getCollection } from "astro:content";
const videos = await getCollection("videos");
---

<h2>Bilibili 视频</h2>
<div class="video-grid">
  {videos.map((video) => (
    <div class="video-card">
      <a href={video.data.url} target="_blank">
        <img src={video.data.thumbnail} alt={video.data.title} />
        <h3>{video.data.title}</h3>
        <p>作者: {video.data.author}</p>
        <p>播放量: {video.data.viewCount}</p>
      </a>
    </div>
  ))}
</div>
```

### 在页面中使用视频播放器

```astro
---
import { getEntry } from "astro:content";
const video = await getEntry("videos", "BV1xx411c7mD");
---

<div class="video-player">
  <h1>{video.data.title}</h1>
  <iframe
    src={video.data.embedUrl}
    allowfullscreen
    width="100%"
    height="400"
  ></iframe>
  <p>作者: {video.data.author}</p>
  <p>发布日期: {video.data.publishedAt.toLocaleDateString()}</p>
  <p>播放量: {video.data.viewCount} | 点赞: {video.data.likeCount}</p>
</div>
```

### 显示收藏夹内容

```astro
---
const playlist = await getEntry("playlists", "123456789");
---

<div class="playlist">
  <h1>{playlist.data.title}</h1>
  <p>创建者: {playlist.data.author}</p>
  <p>视频数量: {playlist.data.itemCount}</p>

  <div class="playlist-items">
    {playlist.data.items.map((item) => (
      <div class="playlist-item">
        <a href={item.url} target="_blank">
          <img src={item.thumbnail} alt={item.title} />
          <div>
            <h4>{item.title}</h4>
            <p>{item.author} · {item.viewCount} 次观看</p>
          </div>
        </a>
      </div>
    ))}
  </div>
</div>
```

### 渲染专栏文章

```astro
---
const article = await getEntry("articles", "12345678");
---

<article>
  <h1>{article.data.title}</h1>
  <p class="summary">{article.data.summary}</p>

  <div class="article-meta">
    <span>作者: {article.data.author}</span>
    <span>发布时间: {article.data.publishedAt.toLocaleDateString()}</span>
    <span>阅读量: {article.data.viewCount}</span>
  </div>

  <div class="article-content" set:html={article.data.content}></div>

  <div class="article-tags">
    {article.data.tags.map((tag) => (
      <span class="tag">{tag}</span>
    ))}
  </div>
</article>
```

## 配置选项

### 视频加载器选项

#### `type: "video"`
- `bvid`（必需）：Bilibili 视频的 BV 号

#### `type: "videos"`
- `bvids`（必需）：Bilibili 视频 BV 号数组

### 播放列表加载器选项

#### `type: "playlist"`
- `fid`（必需）：Bilibili 收藏夹 ID

### 文章加载器选项

#### `type: "article"`
- `cvid`（必需）：Bilibili 专栏文章 ID

### 通用选项

所有加载器类型都支持以下选项：

- `maxResults`（可选）：最大结果数（默认：25）
- `requestOptions`（可选）：自定义请求选项
- `fetchFullDetails`（可选）：是否获取完整详细信息（默认：true）

## 数据结构

### 视频 (Video)

```typescript
{
  id: string;           // BV 号
  bvid: string;         // BV 号
  aid: number;          // AV 号
  title: string;        // 视频标题
  description: string;  // 视频简介
  url: string;          // 视频页面链接
  embedUrl: string;     // 嵌入播放器链接
  thumbnail: string;    // 缩略图链接
  duration: number;     // 时长（秒）
  publishedAt: Date;    // 发布时间
  author: string;       // 作者名
  authorId: number;     // 作者 ID
  viewCount: number;    // 播放量
  likeCount: number;    // 点赞数
  commentCount: number; // 评论数
  tags?: string[];      // 标签
}
```

### 播放列表 (Playlist)

```typescript
{
  id: string;              // 收藏夹 ID
  title: string;           // 收藏夹标题
  description: string;     // 收藏夹描述
  url: string;             // 收藏夹页面链接
  thumbnail: string;       // 封面图链接
  author: string;          // 创建者
  authorId: number;        // 创建者 ID
  itemCount: number;       // 视频数量
  viewCount: number;       // 查看次数
  publishedAt: Date;       // 创建时间
  items: PlaylistItem[];   // 视频列表
}
```

### 专栏文章 (Article)

```typescript
{
  id: string;           // 文章 ID
  title: string;        // 文章标题
  summary: string;      // 文章摘要
  content: string;      // 文章内容（HTML）
  url: string;          // 文章页面链接
  thumbnail?: string;   // 封面图链接
  publishedAt: Date;    // 发布时间
  updatedAt: Date;      // 更新时间
  author: string;       // 作者名
  authorId: number;     // 作者 ID
  viewCount: number;    // 阅读量
  likeCount: number;    // 点赞数
  commentCount: number; // 评论数
  categories: string[]; // 分类
  tags: string[];       // 标签
}
```

## 如何获取 ID

### 获取视频 BV 号
- 在 Bilibili 视频页面 URL 中：`https://www.bilibili.com/video/BV1xx411c7mD`
- BV 号就是 URL 中的 `BV1xx411c7mD` 部分

### 获取收藏夹 ID
1. 打开收藏夹页面
2. URL 中的 `fid=` 参数后面的数字就是收藏夹 ID
3. 示例：`https://space.bilibili.com/123456/favlist?fid=987654321`

### 获取文章 ID
- 在专栏文章页面 URL 中：`https://www.bilibili.com/read/cv12345678`
- cv 后面的数字就是文章 ID

## 注意事项

- Bilibili API 可能有速率限制
- 某些内容可能需要登录才能访问
- 加载器会自动处理缓存以提高性能
- 支持代理配置（通过环境变量）

## 缓存

加载器包含内置缓存功能。在生产环境中，内容会被缓存以减少 API 调用并提高性能。