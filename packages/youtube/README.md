# Astro YouTube Loader

This package provides YouTube loaders for Astro. It allows you to load YouTube videos using the YouTube Data API v3, and use the data in your Astro site. You can load videos by ID, from channels, through search queries, or from playlists.

The package includes two loaders:

- **`youTubeLoader`**: Build-time YouTube video loading for build-time content collections
- **`liveYouTubeLoader`**: Experimental runtime YouTube video loading for live content collections

## Installation

```sh
npm install @ascorbic/youtube-loader
```

## Prerequisites

To use the YouTube loader, you'll need a YouTube Data API v3 key. Follow these steps to obtain one from the [Google Cloud Console](https://console.cloud.google.com/):

1.  **Create or Select a Google Cloud Project**: If you don't have one, create a new project. Otherwise, select an existing project.
2.  **Enable the YouTube Data API v3**: In the Google Cloud Console, navigate to "APIs & Services" > "Library". Search for "YouTube Data API v3" and enable it for your project.
3.  **Create API Credentials**: Go to "APIs & Services" > "Credentials". Click "Create Credentials" and choose "API Key".
4.  **Restrict the API Key (Recommended)**: For security, it's highly recommended to restrict your API key. Click on the newly created API key, then under "API restrictions", select "Restrict key" and choose "YouTube Data API v3" from the dropdown. This ensures the key can only be used for the YouTube API.

Once you have your API key, add it to your `.env` file in your Astro project:

```bash
YOUTUBE_API_KEY="your_youtube_api_key_here"
```

## Usage

### Build-time YouTube Loading (Static Collections)

You can use the YouTube loader in your content configuration like this:

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { youTubeLoader } from "@ascorbic/youtube-loader";

// Load specific videos by ID
const videos = defineCollection({
  loader: youTubeLoader({
    type: "videos",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0"],
  }),
});

// Load videos from a channel
const channelVideos = defineCollection({
  loader: youTubeLoader({
    type: "channel",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    maxResults: 50,
    order: "date",
  }),
});

// Search for videos
const searchResults = defineCollection({
  loader: youTubeLoader({
    type: "search",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    query: "astro framework",
    maxResults: 25,
    publishedAfter: new Date("2023-01-01"),
  }),
});

// Load videos from a playlist
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

You can then use these like any other collection in Astro:

```astro
---
import { getCollection } from "astro:content";
import Layout from "../layouts/Layout.astro";

const videos = await getCollection("videos");
---

<Layout title="Videos">
  <h2>YouTube Videos</h2>
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

### Loading from Playlists

When using `type: "playlist"`, you can load all videos from a specific YouTube playlist. This is useful for curated content collections:

```typescript
const tutorialSeries = defineCollection({
  loader: youTubeLoader({
    type: "playlist",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    playlistId: "PLqGQbXn_GDmnHxd6p_tTlN3d5pMhTjy8g",
    maxResults: 100, // Load up to 100 videos from the playlist
  }),
});
```

Videos from playlists maintain their playlist order and include all the same metadata as individual videos.

You can render the video description using the `render()` function:

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

### Live YouTube Loader (Experimental)

> **⚠️ Experimental Feature**: Live content collections require **Astro 5.10.0 or later** and are currently experimental. The API may change in future versions.

Live YouTube loading allows you to fetch YouTube videos at request time rather than build time. This is useful for displaying fresh data without rebuilding your site.

#### Setup

1. **Enable live content collections** in your `astro.config.mjs`:

```javascript
export default defineConfig({
  // ...
  experimental: {
    liveContentCollections: true,
  },
});
```

2. **Create a live configuration file** at `src/live.config.ts`:

```typescript
// src/live.config.ts
import { defineLiveCollection } from "astro:content";
import { liveYouTubeLoader } from "@ascorbic/youtube-loader";

const latestVideos = defineLiveCollection({
  type: "live",
  loader: liveYouTubeLoader({
    type: "channel",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    defaultMaxResults: 10,
  }),
});

const searchVideos = defineLiveCollection({
  type: "live",
  loader: liveYouTubeLoader({
    type: "search",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    query: "web development",
    defaultMaxResults: 25,
  }),
});

const playlistVideos = defineLiveCollection({
  type: "live",
  loader: liveYouTubeLoader({
    type: "playlist",
    apiKey: import.meta.env.YOUTUBE_API_KEY,
    playlistId: "PLqGQbXn_GDmnHxd6p_tTlN3d5pMhTjy8g",
    defaultMaxResults: 50,
  }),
});

export const collections = { latestVideos, searchVideos, playlistVideos };
```

3. **Use live collections in your pages**:

```astro
---
// src/pages/videos/index.astro
import { getLiveCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';

export const prerender = false; // Required for live content

const { entries: videos, error } = await getLiveCollection('latestVideos', {
  limit: 10,
  order: 'date'
});

if (error) {
  console.error('Failed to load videos:', error.message);
}
---

<Layout title="Latest Videos">
  {error ? (
    <p>Error loading videos: {error.message}</p>
  ) : (
    <div class="video-grid">
      {videos?.map((video) => (
        <div class="video-card">
          <a href={`/videos/${video.id}`}>
            <img src={video.data.thumbnails.medium?.url} alt={video.data.title} />
            <h3>{video.data.title}</h3>
            <p>{video.data.channelTitle}</p>
            <p>{new Date(video.data.publishedAt).toLocaleDateString()}</p>
          </a>
        </div>
      ))}
    </div>
  )}
</Layout>
```

4. **Create individual video pages** with server-side rendering:

```astro
---
// src/pages/videos/[id].astro
import { getLiveEntry } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export const prerender = false; // Required for live content

const { id } = Astro.params;
const { entry: video, error } = await getLiveEntry('latestVideos', id!);

if (error || !video) {
  return Astro.redirect('/videos');
}
---

<Layout title={video.data.title}>
  <h1>{video.data.title}</h1>
  <p>By: {video.data.channelTitle}</p>
  <p>Published: {new Date(video.data.publishedAt).toLocaleDateString()}</p>

  <div class="video-embed">
    <iframe
      src={`https://www.youtube.com/embed/${video.data.id}`}
      title={video.data.title}
      frameborder="0"
      allowfullscreen
    ></iframe>
  </div>

  <div class="description">
    <p>{video.data.description}</p>
  </div>

  <a href={video.data.url} target="_blank">Watch on YouTube →</a>
</Layout>
```

#### Live Loader Options

The `liveYouTubeLoader` supports various filtering options:

```typescript
liveYouTubeLoader({
  type: "search",
  apiKey: process.env.YOUTUBE_API_KEY,
  query: "javascript tutorials",
  defaultMaxResults: 20,
  defaultOrder: "relevance",
  requestOptions: {
    headers: {
      "User-Agent": "My Astro Site",
    },
  },
});
```

#### Filtering Live Collections

You can filter live collections when fetching them:

```typescript
// Get latest 5 videos
const { entries } = await getLiveCollection("latestVideos", { limit: 5 });

// Filter by date range
const { entries } = await getLiveCollection("searchVideos", {
  publishedAfter: new Date("2024-01-01"),
  publishedBefore: new Date("2024-12-31"),
});

// Filter by duration
const { entries } = await getLiveCollection("searchVideos", {
  duration: "medium", // short, medium, or long
  limit: 10,
});

// Custom search query (for search-type loaders)
const { entries } = await getLiveCollection("searchVideos", {
  query: "react hooks tutorial",
  order: "date",
});
```

#### Error Handling

Live YouTube loaders return structured errors that you can handle appropriately:

```typescript
import {
  YouTubeAPIError,
  YouTubeValidationError,
  YouTubeConfigurationError,
} from "@ascorbic/youtube-loader";

const { entries, error } = await getLiveCollection("latestVideos");

if (error) {
  if (error instanceof YouTubeAPIError) {
    if (error.isQuotaExceeded) {
      console.error("YouTube API quota exceeded");
    } else if (error.isInvalidAPIKey) {
      console.error("Invalid YouTube API key");
    } else {
      console.error(`YouTube API error: ${error.message}`);
    }
  } else if (error instanceof YouTubeValidationError) {
    console.error(`Validation error: ${error.message}`);
  } else if (error instanceof YouTubeConfigurationError) {
    console.error(`Configuration error: ${error.message}`);
  }
}
```

#### When to Use Live vs Static Loading

**Use live loading when:**

- You want real-time YouTube data
- Content updates frequently
- You need dynamic search functionality
- You want to avoid rebuilds for new videos
- Building a video discovery interface

**Use static loading when:**

- You have a fixed set of videos
- Performance is critical (pre-rendered)
- You want build-time optimization
- You need to process video data extensively

## API Reference

### `youTubeLoader(options)`

Static content collections loader for build-time YouTube video processing.

#### Options

- `type` (required): `'videos' | 'channel' | 'search' | 'playlist'`
- `apiKey` (required): Your YouTube Data API v3 key
- `videoIds`: Array of video IDs (required when `type` is `'videos'`)
- `channelId`: YouTube channel ID (required when `type` is `'channel'`, or `channelHandle` can be used)
- `channelHandle`: YouTube channel handle (alternative to `channelId` for `'channel'` type)
- `query`: Search query (required when `type` is `'search'`)
- `playlistId`: YouTube playlist ID (required when `type` is `'playlist'`)
- `maxResults`: Maximum number of results (default: 25). Note: YouTube API limits this to 50 for most endpoints.
- `order`: Sort order (`'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount'`). Applicable for `'channel'` and `'search'` types.
- `publishedAfter`: Filter videos published after this date. Applicable for `'channel'` and `'search'` types.
- `publishedBefore`: Filter videos published before this date. Applicable for `'channel'` and `'search'` types.
- `regionCode`: Region code for localized results. Applicable for `'search'` type.
- `categoryId`: YouTube category ID. Applicable for `'channel'` and `'search'` types.
- `duration`: Filter by video duration (`'short' | 'medium' | 'long'`). Applicable for `'channel'` and `'search'` types.
- `parts`: Additional YouTube API parts to include (e.g., `["snippet", "contentDetails"]`)
- `requestOptions`: Custom fetch options
- `fetchFullDetails`: `boolean` (default: `false`). If `true`, the loader will make additional API calls to fetch `duration`, `viewCount`, `likeCount`, and `commentCount` for videos from `channel`, `search`, and `playlist` types. If `false`, these properties may be `undefined` for those types, but it will reduce API quota usage.

### `liveYouTubeLoader(options)` ⚠️ **Experimental**

Live content collections loader for runtime YouTube video processing.

#### Options

Same as `youTubeLoader`, plus:

- `defaultMaxResults`: Default maximum results for live queries
- `defaultOrder`: Default sort order for live queries
- `defaultRegionCode`: Default region code for live queries
- `fetchFullDetails`: `boolean` (default: `false`). If `true`, the loader will make additional API calls to fetch `duration`, `viewCount`, `likeCount`, and `commentCount` for videos from `channel`, `search`, and `playlist` types. If `false`, these properties may be `undefined` for those types, but it will reduce API quota usage.

#### Filter Options (for `getLiveCollection`)

These options can be passed to `getLiveCollection` to filter the results. Filters are applied at the API level where supported, otherwise they are ignored.

##### `videos` type filters

- `limit`: Maximum number of results to return.

##### `channel` type filters

- `limit`: Maximum number of results to return.
- `channelId`: Override the channel ID specified in the loader options.
- `order`: Sort order (`'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount'`).
- `publishedAfter`: Filter videos published after this date.
- `publishedBefore`: Filter videos published before this date.
- `categoryId`: Filter by YouTube video category ID.
- `duration`: Filter by video duration (`'short' | 'medium' | 'long'`).

##### `search` type filters

- `limit`: Maximum number of results to return.
- `query`: Override the search query specified in the loader options.
- `channelId`: Limit search results to a specific channel ID.
- `order`: Sort order (`'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount'`).
- `publishedAfter`: Filter videos published after this date.
- `publishedBefore`: Filter videos published before this date.
- `regionCode`: Region code for localized results.
- `categoryId`: Filter by YouTube video category ID.
- `duration`: Filter by video duration (`'short' | 'medium' | 'long'`).

##### `playlist` type filters

- `limit`: Maximum number of results to return.


### Video Data Schema

Each video entry returned by the loader conforms to the `Video` type. When `fetchFullDetails` is `false` (the default), properties like `duration`, `viewCount`, `likeCount`, and `commentCount` may be `undefined` for videos fetched from channel, search, or playlist types.

If `fetchFullDetails` is set to `true`, the returned entries will conform to the `VideoWithFullDetails` type, where these properties are guaranteed to be present.

```typescript
// Base Video type (when fetchFullDetails is false)
{
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  duration?: string; // ISO 8601 format (e.g., "PT4M13S")
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

// VideoWithFullDetails type (when fetchFullDetails is true)
// All optional fields above (duration, viewCount, etc.) are guaranteed to be present.
```

#### Handling `fetchFullDetails` in your code

When using `fetchFullDetails: false`, you should handle the possibility of `undefined` properties. TypeScript's type narrowing can help:

```typescript
import { getCollection } from "astro:content";
import type { Video, VideoWithFullDetails } from "@ascorbic/youtube-loader";

// Example with fetchFullDetails: false (default)
const videos = await getCollection("videos-without-full-details");

videos.map(videoEntry => {
  const video = videoEntry.data; // Type: Video
  if (video.duration) {
    // TypeScript knows video.duration is string here
    console.log(`Video duration: ${video.duration}`);
  } else {
    console.log("Video duration not available.");
  }
});

// Example with fetchFullDetails: true
const videosWithFullDetails = await getCollection("videos-with-full-details");

videosWithFullDetails.map(videoEntry => {
  const video = videoEntry.data; // Type: VideoWithFullDetails
  // TypeScript knows video.duration is string here, no need for check
  console.log(`Video duration: ${video.duration}`);
});
```

### Error Types

- `YouTubeError`: Base error class
- `YouTubeAPIError`: YouTube API errors (network, quota, authentication)
- `YouTubeValidationError`: Data parsing/validation errors
- `YouTubeConfigurationError`: Configuration/setup errors

### Utility Functions

- `fetchYouTubeVideos()`: Fetch videos by ID
- `searchYouTubeVideos()`: Search for videos
- `fetchChannelVideos()`: Fetch videos from a channel
- `transformYouTubeVideoToVideo()`: Transform YouTube API response to internal format

## Environment Variables

Set your YouTube API key in your `.env` file:

```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## Rate Limits

The YouTube Data API v3 has quota limits:

- Default quota: 10,000 units per day
- Different operations consume different units
- The loader automatically handles caching to minimize API calls
- Consider the quota impact when choosing between live and static loading

## Examples

Check out the [demo site](../../demos/loaders/) for complete examples of using the YouTube loader in an Astro project.
