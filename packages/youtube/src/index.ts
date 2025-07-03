// Main loaders
export { youTubeLoader, type YouTubeLoaderOptions } from "./youtube-loader.js";
export { liveYouTubeLoader, type LiveYouTubeLoaderOptions, type YouTubeCollectionFilter, type YouTubeEntryFilter } from "./live-youtube-loader.js";

// Utility functions
export { 
  fetchYouTubeVideos, 
  searchYouTubeVideos, 
  fetchChannelVideos,
  transformYouTubeVideoToVideo,
  transformYouTubeVideosToVideos,
  type YouTubeAPIOptions,
  type YouTubeVideoFetchOptions,
  type YouTubeChannelVideoFetchOptions,
  type YouTubeSearchOptions,
  type YouTubeAPIResult,
} from "./youtube-api-util.js";

// Schemas and types
export {
  YouTubeThumbnailSchema,
  YouTubeThumbnailsSchema,
  YouTubeVideoSnippetSchema,
  YouTubeVideoContentDetailsSchema,
  YouTubeVideoStatisticsSchema,
  YouTubeVideoStatusSchema,
  YouTubeVideoSchema,
  YouTubeVideoListResponseSchema,
  YouTubeSearchResultSchema,
  YouTubeSearchListResponseSchema,
  YouTubeChannelSchema,
  VideoSchema,
  type YouTubeThumbnail,
  type YouTubeThumbnails,
  type YouTubeVideoSnippet,
  type YouTubeVideoContentDetails,
  type YouTubeVideoStatistics,
  type YouTubeVideoStatus,
  type YouTubeVideo,
  type YouTubeVideoListResponse,
  type YouTubeSearchResult,
  type YouTubeSearchListResponse,
  type YouTubeChannel,
  type Video,
} from "./schema.js";

// Error classes
export {
  YouTubeError,
  YouTubeAPIError,
  YouTubeValidationError,
  YouTubeConfigurationError,
  type YouTubeErrorTypes,
} from "./youtube-errors.js";