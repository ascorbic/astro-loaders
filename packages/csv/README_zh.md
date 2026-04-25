# Astro CSV 加载器

这个包为 Astro 提供 CSV 加载器。它允许您加载和解析 CSV 文件，并在您的 Astro 网站中使用这些数据，包括使用它来生成页面。

## 安装

```sh
npm install @ascorbic/csv-loader
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

然后您可以在内容配置中使用订阅源加载器：

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { csvLoader } from "@ascorbic/csv-loader";

const customers = defineCollection({
  loader: csvLoader({
    fileName: "data/customers.csv",
  }),
  schema: z.object({
    customerID: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    age: z.number(),
    registrationDate: z.coerce.date(),
    purchaseAmount: z.number(),
  }),
});

export const collections = { customers };
```

然后您可以像使用任何其他内容集合一样在 Astro 中使用它们：

```astro
---
import type { GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import Layout from "../../layouts/Layout.astro";

export const getStaticPaths: GetStaticPaths = async () => {
  const customers = await getCollection("customers");
  return customers.map((customer) => ({
    params: {
      id: customer.id,
    },
    props: { customer },
  }));
};

type Props = { customer: CollectionEntry<"customers"> };

const { customer } = Astro.props;
const { data } = customer;
---

<Layout title={data.firstName}>
  <h1>{data.firstName} {data.lastName}</h1>
  <p>{data.email}</p>
  <p>{data.registrationDate.toISOString()}</p>
</Layout>
```

## 配置选项

`csvLoader` 函数接受包含以下属性的选项对象：

- `fileName`：要加载的 CSV 文件的路径。这应该是绝对路径，或相对于项目根目录。
- `transformHeader`：一个将标题值转换为字段名的函数。默认情况下，值会被转换为驼峰命名。传递 `false` 以保持值不变。
- `idField`：用作 ID 的字段。此列中的值必须是唯一的。如果标题被转换，它是转换 _之后_ 的值。默认是第一列。
- `parserOptions`：传递给 CSV 解析器的附加选项。此对象直接传递给 PapaParse CSV 库。请参阅 [PapaParse 文档](https://www.papaparse.com/docs#config) 了解更多信息。</content>
<parameter name="filePath">packages/astro-loaders/packages/csv/README_zh.md