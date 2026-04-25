# Astro Airtable 加载器

这个包为 Astro 提供 Airtable 加载器。它允许您从 Airtable 基地加载记录，并在您的 Astro 项目中将其用作内容。

## 安装

```sh
npm install @ascorbic/airtable-loader
```

## 使用方法

此包需要 Astro 4.14.0 或更高版本。您必须在 Astro 中启用实验性内容层，除非您使用的是 5.0.0-beta 或更高版本。您可以通过将以下内容添加到您的 `astro.config.mjs` 来实现：

```javascript
export default defineConfig({
  // ...
  experimental: {
    contentLayer: true,
  },
});
```

您需要创建一个 Airtable 个人访问令牌。您可以在[这里](https://airtable.com/create/tokens)创建一个。

您应该确保此令牌有权访问您要使用的基地，并具有以下范围：

- `data.records:read`
- `schema.bases:read`

然后您可以在内容集合配置中使用订阅源加载器：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { airtableLoader } from "@ascorbic/airtable-loader";

const launches = defineCollection({
  loader: airtableLoader({
    base: import.meta.env.AIRTABLE_BASE,
    table: "Product Launches",
  }),
});

export const collections = { launches };
```

然后您可以像使用任何其他内容集合一样在 Astro 中使用它们。数据是类型安全的，类型是基于 Airtable 表的模式自动生成的。

```astro
---
import type { GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import Layout from "../../layouts/Layout.astro";

export const getStaticPaths: GetStaticPaths = async () => {
  const launches = await getCollection("launches");
  return launches.map((launch) => ({
    params: {
      id: launch.id,
    },
    props: { launch },
  }));
};

type Props = { launch: CollectionEntry<"launches"> };

const { launch } = Astro.props;
const { data } = launch;
---

<Layout title={data.firstName}>
  <h1>{data["Launch Name"]}</h1>
  <p>{data["Launch date"]?.toDateString()}</p>
  <p>{data.Description}</p>
</Layout>
```

## 配置选项

`airtableLoader` 函数接受包含以下选项的对象：

- `base`：您要从中加载记录的 Airtable 基地的 ID。
- `table`：基地中您要从中加载记录的表的名称或 ID。
- `token`：您的 Airtable 个人访问令牌。如果未提供，将从 `AIRTABLE_TOKEN` 环境变量中读取。
- `queryParams`：可选对象，包含要传递给 Airtable API 的选项。这可以用于过滤或限制返回的记录。请参阅 [Airtable 查询文档](https://airtable.com/developers/web/api/list-records#query) 了解更多信息。</content>
<parameter name="filePath">packages/astro-loaders/packages/airtable/README_zh.md