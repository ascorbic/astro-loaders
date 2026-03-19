# Astro S3 Media Loader

This package provides an S3 media loader for Astro. It allows you to load media files from S3-compatible storage (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, etc.) and use them as content in your Astro project.

## Installation

```sh
npm install @ascorbic/s3-media-loader
```

## Usage

This package requires Astro 5.0.0 or later.

You can use the S3 loader in your content collection configuration:

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

You can then use these like any other content collection in Astro:

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

## Options

The `s3Loader` function takes an object with the following options:

- `endpoint` (required): S3 endpoint URL (e.g., `https://r2.cloudflarestorage.com`)
- `bucket` (required): S3 bucket name
- `accessKeyId` (required): AWS access key ID
- `secretAccessKey` (required): AWS secret access key
- `region` (optional): AWS region (default: "auto" for Cloudflare R2)
- `prefix` (optional): Prefix to filter objects (e.g., "music/" or "images/")
- `forcePathStyle` (optional): Force path-style URLs (default: true)
- `publicBaseUrl` (required): Public base URL for media files
- `extensions` (optional): Allowed file extensions (default: [".mp3", ".flac", ".wav", ".mp4", ".webm", ".ogg"])
- `maxKeys` (optional): Maximum number of keys to retrieve (default: 1000)

## Data Structure

Each media item contains:

- `id`: Full S3 object key
- `name`: File name
- `ext`: File extension (including dot)
- `url`: Public URL of the file
- `size` (optional): File size in bytes
- `lastModified` (optional): Last modified date

## Example: Cloudflare R2

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

## Caching

The loader includes built-in caching for production environments. In production mode, media items are cached for 5 minutes to reduce API calls and improve performance.
