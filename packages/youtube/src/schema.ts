import { z } from "astro/zod";

// YouTube thumbnail schema
export const YouTubeThumbnailSchema = z.object({
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

// YouTube thumbnails collection schema
export const YouTubeThumbnailsSchema = z.object({
  default: YouTubeThumbnailSchema.optional(),
  medium: YouTubeThumbnailSchema.optional(),
  high: YouTubeThumbnailSchema.optional(),
  standard: YouTubeThumbnailSchema.optional(),
  maxres: YouTubeThumbnailSchema.optional(),
});

// YouTube video snippet schema
export const YouTubeVideoSnippetSchema = z.object({
  publishedAt: z.coerce.date(),
  channelId: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnails: YouTubeThumbnailsSchema,
  channelTitle: z.string(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  liveBroadcastContent: z.string().optional(),
  defaultLanguage: z.string().optional(),
  localized: z.object({
    title: z.string(),
    description: z.string(),
  }).optional(),
  defaultAudioLanguage: z.string().optional(),
});

// YouTube video content details schema
export const YouTubeVideoContentDetailsSchema = z.object({
  duration: z.string(),
  dimension: z.string().optional(),
  definition: z.string().optional(),
  caption: z.string().optional(),
  licensedContent: z.boolean().optional(),
  regionRestriction: z.object({
    allowed: z.array(z.string()).optional(),
    blocked: z.array(z.string()).optional(),
  }).optional(),
  projection: z.string().optional(),
});

// YouTube video statistics schema
export const YouTubeVideoStatisticsSchema = z.object({
  viewCount: z.string().optional(),
  likeCount: z.string().optional(),
  dislikeCount: z.string().optional(),
  favoriteCount: z.string().optional(),
  commentCount: z.string().optional(),
});

// YouTube video status schema
export const YouTubeVideoStatusSchema = z.object({
  uploadStatus: z.string().optional(),
  failureReason: z.string().optional(),
  rejectionReason: z.string().optional(),
  privacyStatus: z.string().optional(),
  publishAt: z.coerce.date().optional(),
  license: z.string().optional(),
  embeddable: z.boolean().optional(),
  publicStatsViewable: z.boolean().optional(),
  madeForKids: z.boolean().optional(),
  selfDeclaredMadeForKids: z.boolean().optional(),
});

// YouTube video resource schema
export const YouTubeVideoSchema = z.object({
  kind: z.literal("youtube#video"),
  etag: z.string(),
  id: z.string(),
  snippet: YouTubeVideoSnippetSchema.optional(),
  contentDetails: YouTubeVideoContentDetailsSchema.optional(),
  statistics: YouTubeVideoStatisticsSchema.optional(),
  status: YouTubeVideoStatusSchema.optional(),
});

// YouTube video list response schema
export const YouTubeVideoListResponseSchema = z.object({
  kind: z.literal("youtube#videoListResponse"),
  etag: z.string(),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
  items: z.array(YouTubeVideoSchema),
});

// YouTube search result schema
export const YouTubeSearchResultSchema = z.object({
  kind: z.literal("youtube#searchResult"),
  etag: z.string(),
  id: z.object({
    kind: z.string(),
    videoId: z.string().optional(),
    channelId: z.string().optional(),
    playlistId: z.string().optional(),
  }),
  snippet: YouTubeVideoSnippetSchema,
});

// YouTube search list response schema
export const YouTubeSearchListResponseSchema = z.object({
  kind: z.literal("youtube#searchListResponse"),
  etag: z.string(),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  regionCode: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
  items: z.array(YouTubeSearchResultSchema),
});

// Channel information schema
export const YouTubeChannelSchema = z.object({
  kind: z.literal("youtube#channel"),
  etag: z.string(),
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    thumbnails: YouTubeThumbnailsSchema,
    country: z.string().optional(),
    defaultLanguage: z.string().optional(),
  }).optional(),
  statistics: z.object({
    viewCount: z.string().optional(),
    subscriberCount: z.string().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
    videoCount: z.string().optional(),
  }).optional(),
});

// Simplified video schema for internal use
export const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  publishedAt: z.coerce.date(),
  duration: z.string(),
  channelId: z.string(),
  channelTitle: z.string(),
  thumbnails: YouTubeThumbnailsSchema,
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  viewCount: z.string().optional(),
  likeCount: z.string().optional(),
  commentCount: z.string().optional(),
  liveBroadcastContent: z.string().optional(),
  defaultLanguage: z.string().optional(),
});

// Export types
export type YouTubeThumbnail = z.infer<typeof YouTubeThumbnailSchema>;
export type YouTubeThumbnails = z.infer<typeof YouTubeThumbnailsSchema>;
export type YouTubeVideoSnippet = z.infer<typeof YouTubeVideoSnippetSchema>;
export type YouTubeVideoContentDetails = z.infer<typeof YouTubeVideoContentDetailsSchema>;
export type YouTubeVideoStatistics = z.infer<typeof YouTubeVideoStatisticsSchema>;
export type YouTubeVideoStatus = z.infer<typeof YouTubeVideoStatusSchema>;
export type YouTubeVideo = z.infer<typeof YouTubeVideoSchema>;
export type YouTubeVideoListResponse = z.infer<typeof YouTubeVideoListResponseSchema>;
export type YouTubeSearchResult = z.infer<typeof YouTubeSearchResultSchema>;
export type YouTubeSearchListResponse = z.infer<typeof YouTubeSearchListResponseSchema>;
export type YouTubeChannel = z.infer<typeof YouTubeChannelSchema>;
export type Video = z.infer<typeof VideoSchema>;