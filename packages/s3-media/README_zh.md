# Astro S3 媒体加载器

这个包为 Astro 提供 S3 媒体加载器。它允许您从 S3 兼容存储（AWS S3、Cloudflare R2、MinIO、DigitalOcean Spaces 等）加载媒体文件，并在您的 Astro 项目中将其用作内容。

## 安装

```sh
npm install @ascorbic/s3-media-loader
```

## 使用方法

此包需要 Astro 5.0.0 或更高版本。

您可以在内容集合配置中使用 S3 加载器：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { s3Loader } from "@ascorbic/s3-media-loader";

const media = defineCollection({
  loader: s3Loader({
    endpoint: import.meta.env.S3_ENDPOINT,
    bucket: import.meta.env.S3_BUCKET,
    accessKeyId: import.meta.env.S3_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.S3_SECRET_ACCESS_KEY,
    region: "auto",
    publicBaseUrl: import.meta.env.S3_PUBLIC_URL,
    prefix: "music/",
    extensions: [".mp3", ".flac", ".wav"],
  }),
});

export const collections = { media };
```

然后您可以像使用任何其他内容集合一样使用它们：

```astro
---
import { getCollection } from "astro:content";
const media = await getCollection("media");
---

<ul>
  {media.map((item) => (
    <li>
      <audio controls>
        <source src={item.data.url} type={`audio/${item.data.ext.slice(1)}`} />
      </audio>
      <span>{item.data.name}</span>
    </li>
  ))}
</ul>
```

## 配置选项

`s3Loader` 函数接受包含以下选项的对象：

- `endpoint`（必需）：S3 端点 URL（例如：`https://r2.cloudflarestorage.com`）
- `bucket`（必需）：S3 存储桶名称
- `accessKeyId`（必需）：AWS 访问密钥 ID
- `secretAccessKey`（必需）：AWS 秘密访问密钥
- `region`（可选）：AWS 区域（默认："auto"，适用于 Cloudflare R2）
- `prefix`（可选）：用于过滤对象的路径前缀（例如："music/" 或 "images/"）
- `forcePathStyle`（可选）：强制使用路径样式 URL（默认：true）
- `publicBaseUrl`（必需）：媒体文件的公共基础 URL
- `extensions`（可选）：允许的文件扩展名（默认：[".mp3", ".flac", ".wav", ".mp4", ".webm", ".ogg"]）
- `maxKeys`（可选）：要检索的最大键数（默认：1000）

## 数据结构

每个媒体项目包含：

- `id`：完整的 S3 对象键
- `name`：文件名
- `ext`：文件扩展名（包含点）
- `url`：文件的公共 URL
- `size`（可选）：文件大小（字节）
- `lastModified`（可选）：最后修改日期

## 示例：Cloudflare R2

```typescript
const media = defineCollection({
  loader: s3Loader({
    endpoint: `https://${import.meta.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    bucket: import.meta.env.R2_BUCKET_NAME,
    accessKeyId: import.meta.env.R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.R2_SECRET_ACCESS_KEY,
    region: "auto",
    publicBaseUrl: import.meta.env.R2_PUBLIC_URL,
    prefix: "podcasts/",
    extensions: [".mp3", ".m4a"],
  }),
});
```

## 缓存

加载器包含用于生产环境的内置缓存。在生产模式下，媒体项目会被缓存 1 小时，以减少 API 调用并提高性能。缓存文件存储在 `src/content/content-metadata` 目录中。</content>
<parameter name="filePath">packages/astro-loaders/packages/s3-media/README_zh.md