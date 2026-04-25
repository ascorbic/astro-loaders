// packages/bilibili/src/schema.ts
import { z } from "astro/zod";

// Bilibili API response schemas
export const BilibiliVideoSchema = z.object({
  aid: z.number(),
  bvid: z.string(),
  cid: z.number(),
  title: z.string(),
  pic: z.string(),
  desc: z.string(),
  duration: z.number(),
  pubdate: z.number(),
  ctime: z.number(),
  view: z.number(),
  danmaku: z.number(),
  reply: z.number(),
  favorite: z.number(),
  coin: z.number(),
  share: z.number(),
  like: z.number(),
  owner: z.object({
    mid: z.number(),
    name: z.string(),
    face: z.string(),
  }),
  pages: z.array(z.object({
    cid: z.number(),
    page: z.number(),
    from: z.string(),
    part: z.string(),
    duration: z.number(),
    vid: z.string(),
    weblink: z.string(),
  })).optional(),
});

export const BilibiliPlaylistItemSchema = z.object({
  id: z.number(),
  type: z.number(),
  title: z.string(),
  cover: z.string(),
  intro: z.string(),
  page: z.number(),
  from: z.string(),
  part: z.string(),
  duration: z.number(),
  vid: z.string(),
  author: z.string(),
  view: z.number(),
  reply: z.number(),
  favorite: z.number(),
  ctime: z.number(),
  pubtime: z.number(),
});

export const BilibiliPlaylistSchema = z.object({
  id: z.number(),
  fid: z.number(),
  mid: z.number(),
  attr: z.number(),
  title: z.string(),
  cover: z.string(),
  upper: z.object({
    mid: z.number(),
    name: z.string(),
    face: z.string(),
  }),
  ctime: z.number(),
  mtime: z.number(),
  stat: z.object({
    view: z.number(),
    like: z.number(),
    favorite: z.number(),
    reply: z.number(),
  }),
  medias: z.array(BilibiliPlaylistItemSchema),
});

export const BilibiliArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string(),
  banner_url: z.string(),
  template_id: z.number(),
  view: z.number(),
  like: z.number(),
  reply: z.number(),
  share: z.number(),
  coin: z.number(),
  favorite: z.number(),
  ctime: z.number(),
  mtime: z.number(),
  publish_time: z.number(),
  author: z.object({
    mid: z.number(),
    name: z.string(),
    face: z.string(),
  }),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })),
  tags: z.array(z.string()),
  content: z.string(),
});

// Internal schemas for processed content
export const VideoSchema = z.object({
  id: z.string(),
  bvid: z.string(),
  aid: z.number(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  embedUrl: z.string(),
  thumbnail: z.string(),
  duration: z.number(),
  publishedAt: z.date(),
  author: z.string(),
  authorId: z.number(),
  viewCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number(),
  tags: z.array(z.string()).optional(),
});

export const PlaylistItemSchema = z.object({
  id: z.string(),
  bvid: z.string(),
  aid: z.number(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  thumbnail: z.string(),
  duration: z.number(),
  author: z.string(),
  viewCount: z.number(),
  publishedAt: z.date(),
});

export const PlaylistSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  thumbnail: z.string(),
  author: z.string(),
  authorId: z.number(),
  itemCount: z.number(),
  viewCount: z.number(),
  publishedAt: z.date(),
  items: z.array(PlaylistItemSchema),
});

export const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  url: z.string(),
  thumbnail: z.string().optional(),
  publishedAt: z.date(),
  updatedAt: z.date(),
  author: z.string(),
  authorId: z.number(),
  viewCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
});

// Type exports
export type BilibiliVideo = z.infer<typeof BilibiliVideoSchema>;
export type BilibiliPlaylist = z.infer<typeof BilibiliPlaylistSchema>;
export type BilibiliPlaylistItem = z.infer<typeof BilibiliPlaylistItemSchema>;
export type BilibiliArticle = z.infer<typeof BilibiliArticleSchema>;

export type Video = z.infer<typeof VideoSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;
export type Article = z.infer<typeof ArticleSchema>;