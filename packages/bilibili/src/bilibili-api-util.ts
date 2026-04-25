// packages/bilibili/src/bilibili-api-util.ts
import { z } from "astro/zod";
import type { LoaderContext } from "astro/loaders";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
  getLoaderProxyAgent,
} from "@ascorbic/loader-utils";
import {
  BilibiliVideoSchema,
  BilibiliPlaylistSchema,
  BilibiliArticleSchema,
  VideoSchema,
  PlaylistSchema,
  ArticleSchema,
  type BilibiliVideo,
  type BilibiliPlaylist,
  type BilibiliArticle,
  type Video,
  type Playlist,
  type Article,
} from "./schema.js";

export interface BilibiliAPIOptions {
  requestOptions?: RequestInit;
  meta?: LoaderContext["meta"];
  logger?: LoaderContext["logger"];
  fetchFullDetails?: boolean;
}

export interface BilibiliVideoFetchOptions extends BilibiliAPIOptions {
  bvid?: string;
  aid?: string;
}

export interface BilibiliPlaylistFetchOptions extends BilibiliAPIOptions {
  fid: string; // 收藏夹 ID
}

export interface BilibiliArticleFetchOptions extends BilibiliAPIOptions {
  cvid: string; // 文章 ID
}

export interface BilibiliAPIResult<T> {
  data: T;
  wasModified: boolean;
}

// Base API response wrapper
const BilibiliResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  ttl: z.number(),
  data: z.unknown(),
});

async function makeBilibiliAPIRequest<T>(
  endpoint: string,
  responseSchema: z.ZodSchema<T>,
  options: BilibiliAPIOptions = {}
): Promise<BilibiliAPIResult<T>> {
  const url = `https://api.bilibili.com${endpoint}`;

  // Copy request options to avoid mutating the original
  const requestOptions = { ...options.requestOptions };

  // Add proxy agent if available
  const proxyAgent = getLoaderProxyAgent();
  if (proxyAgent) {
    (requestOptions as any).agent = proxyAgent;
  }

  // Add headers
  const headers = new Headers(requestOptions.headers);
  headers.set("User-Agent", "Mozilla/5.0 (compatible; BilibiliLoader/1.0)");
  headers.set("Referer", "https://www.bilibili.com");

  // Only use caching if meta is provided
  if (options.meta) {
    const conditionalHeaders = getConditionalHeaders({
      init: headers,
      meta: options.meta,
    });
    requestOptions.headers = conditionalHeaders;
  } else {
    requestOptions.headers = headers;
  }

  const res = await fetch(url, requestOptions);

  if (res.status === 304 && options.meta) {
    options.logger?.info(`Bilibili data not modified, skipping`);
    return { data: null as any, wasModified: false };
  }

  if (!res.ok) {
    throw new Error(`Bilibili API error: ${res.status} ${await res.text().catch(() => "")}`);
  }

  // Store conditional headers
  if (options.meta) {
    storeConditionalHeaders({
      headers: res.headers,
      meta: options.meta,
    });
  }

  const json = await res.json();
  const response = BilibiliResponseSchema.parse(json);

  if (response.code !== 0) {
    throw new Error(`Bilibili API error: ${response.message}`);
  }

  const data = responseSchema.parse(response.data);
  return { data, wasModified: true };
}

// Fetch video information
export async function fetchBilibiliVideo({
  bvid,
  aid,
  ...options
}: BilibiliVideoFetchOptions): Promise<BilibiliAPIResult<BilibiliVideo>> {
  const params = new URLSearchParams();
  if (bvid) params.set("bvid", bvid);
  if (aid) params.set("aid", aid.toString());

  return makeBilibiliAPIRequest(
    `/x/web-interface/view?${params}`,
    BilibiliVideoSchema,
    options
  );
}

// Fetch playlist (收藏夹) information
export async function fetchBilibiliPlaylist({
  fid,
  ...options
}: BilibiliPlaylistFetchOptions): Promise<BilibiliAPIResult<BilibiliPlaylist>> {
  const params = new URLSearchParams({
    media_id: fid,
    pn: "1", // page number
    ps: "20", // page size, max 20
  });

  return makeBilibiliAPIRequest(
    `/x/v3/fav/resource/list?${params}`,
    BilibiliPlaylistSchema,
    options
  );
}

// Fetch article information
export async function fetchBilibiliArticle({
  cvid,
  ...options
}: BilibiliArticleFetchOptions): Promise<BilibiliAPIResult<BilibiliArticle>> {
  return makeBilibiliAPIRequest(
    `/x/article/viewinfo?id=${cvid}`,
    BilibiliArticleSchema,
    options
  );
}

// Transform functions
export function transformBilibiliVideoToVideo(video: BilibiliVideo): Video {
  return {
    id: video.bvid,
    bvid: video.bvid,
    aid: video.aid,
    title: video.title,
    description: video.desc,
    url: `https://www.bilibili.com/video/${video.bvid}`,
    embedUrl: `https://player.bilibili.com/player.html?bvid=${video.bvid}`,
    thumbnail: video.pic,
    duration: video.duration,
    publishedAt: new Date(video.pubdate * 1000),
    author: video.owner.name,
    authorId: video.owner.mid,
    viewCount: video.view,
    likeCount: video.like,
    commentCount: video.reply,
  };
}

export function transformBilibiliPlaylistToPlaylist(playlist: BilibiliPlaylist): Playlist {
  const items = playlist.medias.map(item => ({
    id: item.vid,
    bvid: item.vid,
    aid: item.id,
    title: item.title,
    description: item.intro,
    url: `https://www.bilibili.com/video/${item.vid}`,
    thumbnail: item.cover,
    duration: item.duration,
    author: item.author,
    viewCount: item.view,
    publishedAt: new Date(item.pubtime * 1000),
  }));

  return {
    id: playlist.id.toString(),
    title: playlist.title,
    description: "",
    url: `https://space.bilibili.com/${playlist.mid}/favlist?fid=${playlist.fid}`,
    thumbnail: playlist.cover,
    author: playlist.upper.name,
    authorId: playlist.upper.mid,
    itemCount: playlist.stat.view,
    viewCount: playlist.stat.view,
    publishedAt: new Date(playlist.ctime * 1000),
    items,
  };
}

export function transformBilibiliArticleToArticle(article: BilibiliArticle): Article {
  return {
    id: article.id.toString(),
    title: article.title,
    summary: article.summary,
    content: article.content,
    url: `https://www.bilibili.com/read/cv${article.id}`,
    thumbnail: article.banner_url || undefined,
    publishedAt: new Date(article.publish_time * 1000),
    updatedAt: new Date(article.mtime * 1000),
    author: article.author.name,
    authorId: article.author.mid,
    viewCount: article.view,
    likeCount: article.like,
    commentCount: article.reply,
    categories: article.categories.map(cat => cat.name),
    tags: article.tags,
  };
}