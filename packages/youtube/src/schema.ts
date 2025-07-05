import { z } from "astro/zod";

// YouTube thumbnail schema
export const YouTubeThumbnailSchema = z.object({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
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

// YouTube playlist snippet schema
export const YouTubePlaylistSnippetSchema = z.object({
  publishedAt: z.coerce.date(),
  channelId: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnails: YouTubeThumbnailsSchema,
  channelTitle: z.string(),
  defaultLanguage: z.string().optional(),
  localized: z.object({
    title: z.string(),
    description: z.string(),
  }).optional(),
});

// YouTube playlist status schema
export const YouTubePlaylistStatusSchema = z.object({
  privacyStatus: z.string().optional(),
});

// YouTube playlist content details schema
export const YouTubePlaylistContentDetailsSchema = z.object({
  itemCount: z.number().optional(),
});

// YouTube playlist resource schema
export const YouTubePlaylistSchema = z.object({
  kind: z.literal("youtube#playlist"),
  etag: z.string(),
  id: z.string(),
  snippet: YouTubePlaylistSnippetSchema.optional(),
  status: YouTubePlaylistStatusSchema.optional(),
  contentDetails: YouTubePlaylistContentDetailsSchema.optional(),
});

// YouTube playlist list response schema
export const YouTubePlaylistListResponseSchema = z.object({
  kind: z.literal("youtube#playlistListResponse"),
  etag: z.string(),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
  items: z.array(YouTubePlaylistSchema),
});

// YouTube playlist item snippet schema
export const YouTubePlaylistItemSnippetSchema = z.object({
  publishedAt: z.coerce.date(),
  channelId: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnails: YouTubeThumbnailsSchema,
  channelTitle: z.string(),
  playlistId: z.string(),
  position: z.number(),
  resourceId: z.object({
    kind: z.string(),
    videoId: z.string().optional(),
  }),
  videoOwnerChannelTitle: z.string().optional(),
  videoOwnerChannelId: z.string().optional(),
});

// YouTube playlist item content details schema
export const YouTubePlaylistItemContentDetailsSchema = z.object({
  videoId: z.string(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  note: z.string().optional(),
  videoPublishedAt: z.coerce.date().optional(),
});

// YouTube playlist item status schema
export const YouTubePlaylistItemStatusSchema = z.object({
  privacyStatus: z.string().optional(),
});

// YouTube playlist item resource schema
export const YouTubePlaylistItemSchema = z.object({
  kind: z.literal("youtube#playlistItem"),
  etag: z.string(),
  id: z.string(),
  snippet: YouTubePlaylistItemSnippetSchema.optional(),
  contentDetails: YouTubePlaylistItemContentDetailsSchema.optional(),
  status: YouTubePlaylistItemStatusSchema.optional(),
});

// YouTube playlist items list response schema
export const YouTubePlaylistItemListResponseSchema = z.object({
  kind: z.literal("youtube#playlistItemListResponse"),
  etag: z.string(),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
  items: z.array(YouTubePlaylistItemSchema),
});

// Simplified video schema for internal use
export const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  publishedAt: z.coerce.date(),
  duration: z.string().optional(),
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

export const VideoWithFullDetailsSchema = VideoSchema.extend({
  duration: z.string(),
  viewCount: z.string(),
  likeCount: z.string(),
  commentCount: z.string(),
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
export type YouTubePlaylistSnippet = z.infer<typeof YouTubePlaylistSnippetSchema>;
export type YouTubePlaylistStatus = z.infer<typeof YouTubePlaylistStatusSchema>;
export type YouTubePlaylistContentDetails = z.infer<typeof YouTubePlaylistContentDetailsSchema>;
export type YouTubePlaylist = z.infer<typeof YouTubePlaylistSchema>;
export type YouTubePlaylistListResponse = z.infer<typeof YouTubePlaylistListResponseSchema>;
export type YouTubePlaylistItemSnippet = z.infer<typeof YouTubePlaylistItemSnippetSchema>;
export type YouTubePlaylistItemContentDetails = z.infer<typeof YouTubePlaylistItemContentDetailsSchema>;
export type YouTubePlaylistItemStatus = z.infer<typeof YouTubePlaylistItemStatusSchema>;
export type YouTubePlaylistItem = z.infer<typeof YouTubePlaylistItemSchema>;
export type YouTubePlaylistItemListResponse = z.infer<typeof YouTubePlaylistItemListResponseSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type VideoWithFullDetails = z.infer<typeof VideoWithFullDetailsSchema>;