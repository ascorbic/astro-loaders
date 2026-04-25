# Astro 加载器工具

帮助构建 Astro 加载器的工具

## 安装

```sh
npm install @ascorbic/loader-utils
```

## API

### 条件请求

某些 API 允许您通过提供 `If-None-Match` 或 `If-Modified-Since` 头来发出条件请求。这可以用于避免多次下载相同的数据。这些助手允许您存储来自响应的 etag 或 last-modified 值，然后在稍后更新时使用它来发出条件请求。

- `getConditionalHeaders`

获取发出条件请求所需的头。使用来自元存储的 etag 和 last-modified 值，并设置 `If-None-Match` 或 `If-Modified-Since` 头。

- `storeConditionalHeaders`

将来自响应的 `ETag` 或 `Last-Modified` 头存储在元存储中。</content>
<parameter name="filePath">packages/astro-loaders/packages/utils/README_zh.md