# Astro 模拟加载器

这个包让您可以将模拟数据加载到您的 Astro 内容集合中。它可以与真实加载器一起使用，以在开发中模拟不可用的数据，或者可以作为独立的数据源使用。它基于 [faker.js](https://github.com/faker-js/faker) 和 [`@anatine/zod-mock`](https://github.com/anatine/zod-plugins/tree/main/packages/zod-mock)。

加载器将生成符合您传递给它的 Zod 模式的数据。这可以是您手动指定的模式，也可以是真实加载器定义的模式。生成的数据将是类型安全的，类型将基于模式自动生成。

加载器将尝试使用字段名称来生成适当的、真实的内容。例如，一个名为 `firstName` 的字段将生成一个随机的名字，一个名为 `country` 的字段将生成一个随机的国家名称。请参阅 [faker.js](https://fakerjs.dev/api/) 了解所有可用数据类型的详细信息。

## 安装

```sh
npm install @ascorbic/mock-loader
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

然后您可以在内容配置中使用模拟加载器。这是一个如何使用它来模拟 `orders` 集合的手动 [Zod](https://zod.dev/) 模式的示例：

```ts
// src/content/config.ts
import { defineCollection, z } from "astro:content";
import { mockLoader } from "@ascorbic/mock-loader";

const orders = defineCollection({
  loader: mockLoader({
    schema: z.object({
      orderID: z.number(),
      customerID: z.number(),
      orderDate: z.date(),
      shipDate: z.date(),
      orderAmount: z.number(),
      isGift: z.boolean(),
    }),
    idField: "orderID",
    entryCount: 100,
  }),
});

export const collections = { orders };
```

您还可以使用模拟加载器来基于真实加载器模式模拟集合。这仅适用于定义自己模式的加载器（因此不适用于内置的 glob 或 file 加载器）。这里是一个如何与 [`@ascorbic/feed-loader`](https://github.com/ascorbic/astro-loaders/tree/main/packages/feed) 一起使用的示例。在生产中使用真实的订阅源加载器，但在开发中使用具有相同模式的模拟加载器：

```ts
// src/content/config.ts
import { defineCollection } from "astro:content";
import { feedLoader } from "@ascorbic/feed-loader";
import { mockLoader } from "@ascorbic/mock-loader";

const blogLoader = feedLoader({
  url: "https://example.com/feed.xml",
});

const blog = defineCollection({
  loader: import.meta.env.DEV
    ? mockLoader({ loader: blogLoader, entryCount: 10 })
    : blogLoader,
});

export const collections = { blog };
```

## 配置选项

`mockLoader` 函数接受包含以下属性的选项对象：

- `schema`：定义模拟数据形状的 [Zod](https://zod.dev/) 模式。如果您不提供 `loader`，或者如果您提供的 `loader` 没有定义自己的模式，则这是必需的。如果您同时提供两者，`schema` 将优先。
- `loader`：定义自己模式的真实加载器。
- `entryCount`：要生成的条目数。默认为 10。
- `idField`：用作条目 ID 的字段名称。默认情况下将使用递增数字。
- `seed`：随机数生成器的种子值。这可以用于每次生成相同的数据。如果您不提供种子，每次更新数据时数据都会不同。
- `mockHTML`：一个布尔值，确定是否为集合生成 HTML 模拟内容。如果为 `true`，您将能够在页面中使用 `render(entry)` 来渲染模拟 HTML 内容。</content>
<parameter name="filePath">packages/astro-loaders/packages/mock/README_zh.md