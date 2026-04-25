# Astro GitHub 提交加载器

这个包为 Astro 提供 GitHub 提交加载器。它允许您从任何 GitHub 仓库加载提交，并在您的 Astro 项目中将其用作内容。

## 安装

```sh
npm install @ascorbic/github-commits-loader
```

## 使用方法

此包需要 Astro 5.0.0 或更高版本。

您可以在内容集合配置中使用 GitHub 加载器：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { githubLoader } from "@ascorbic/github-commits-loader";

const commits = defineCollection({
  loader: githubLoader({
    repo: "owner/repo",
    token: import.meta.env.GITHUB_TOKEN,
    perPage: 15,
    fetchFilesFor: 5,
  }),
});

export const collections = { commits };
```

然后您可以像使用任何其他内容集合一样使用它们：

```astro
---
import { getCollection } from "astro:content";
const commits = await getCollection("commits");
---

<ul>
  {commits.map((commit) => (
    <li>
      <strong>{commit.data.shortSha}</strong> - {commit.data.message}
      <br />
      <small>由 {commit.data.author} 于 {commit.data.date.toDateString()} 提交</small>
    </li>
  ))}
</ul>
```

## 配置选项

`githubLoader` 函数接受包含以下选项的对象：

- `repo`（必需）：GitHub 仓库，格式为 "owner/repo"
- `token`（可选）：GitHub 个人访问令牌，用于更高的 API 速率限制
- `perPage`（可选）：每页获取的提交数量（默认：15）
- `timeoutMs`（可选）：请求超时时间（毫秒，默认：8000）
- `fetchFilesFor`（可选）：为最近的多少个提交获取文件变更信息（默认：0）

## 数据结构

每个提交项目包含：

- `sha`：完整的提交 SHA
- `shortSha`：缩短的 7 字符 SHA
- `message`：提交消息（第一行）
- `author`：作者姓名
- `date`：提交日期
- `files`：变更的文件数组（如果 fetchFilesFor > 0）

每个文件包含：

- `filename`：文件路径
- `status`：文件状态（added、modified、deleted）
- `changes`：总变更数
- `additions`：添加行数
- `deletions`：删除行数

## 缓存

加载器包含内置缓存功能。在生产环境中，提交数据会被缓存 1 小时，以减少 API 调用并提高性能。缓存文件存储在 `src/content/content-metadata` 目录中，支持在 API 错误时回退到缓存数据。</content>
<parameter name="filePath">packages/astro-loaders/packages/github-commits/README_zh.md