import type { LiveLoader } from "astro/loaders";
import { 
  fetchYouTubeVideos, 
  searchYouTubeVideos, 
  fetchChannelVideos,
  transformYouTubeVideosToVideos,
  type YouTubeAPIOptions 
} from "./youtube-api-util.js";
import { type Video } from "./schema.js";
import {
  YouTubeError,
  YouTubeAPIError,
  YouTubeConfigurationError,
  type YouTubeErrorTypes,
} from "./youtube-errors.js";

export interface LiveYouTubeLoaderOptions extends YouTubeAPIOptions {
  /** 
   * Type of YouTube content to load.
   * - 'videos': Load specific videos by ID
   * - 'channel': Load videos from a channel
   * - 'search': Search for videos
   */
  type: 'videos' | 'channel' | 'search';
  
  /** Video IDs to load (required when type is 'videos') */
  videoIds?: string[];
  
  /** Channel ID to load videos from (required when type is 'channel') */
  channelId?: string;
  
  /** Channel handle to load videos from (alternative to channelId) */
  channelHandle?: string;
  
  /** Search query (required when type is 'search') */
  query?: string;
  
  /** Default maximum number of results to fetch */
  defaultMaxResults?: number;
  
  /** Default order of results */
  defaultOrder?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  
  /** Default region code for localized results */
  defaultRegionCode?: string;
  
  /** Additional YouTube API parts to include */
  parts?: string[];
}

export interface YouTubeCollectionFilter {
  limit?: number;
  order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  categoryId?: string;
  channelId?: string;
  query?: string;
  duration?: "short" | "medium" | "long";
}

export interface YouTubeEntryFilter {
  id?: string;
  url?: string;
}

export function liveYouTubeLoader(
  options: LiveYouTubeLoaderOptions,
): LiveLoader<Video, YouTubeEntryFilter, YouTubeCollectionFilter, YouTubeErrorTypes> {
  const { 
    type, 
    apiKey, 
    videoIds, 
    channelId, 
    channelHandle, 
    query, 
    defaultMaxResults = 25,
    defaultOrder = "date",
    defaultRegionCode,
    parts,
    requestOptions = {} 
  } = options;

  // Validate required options
  if (!apiKey) {
    throw new YouTubeConfigurationError("YouTube API key is required");
  }

  if (type === 'videos' && (!videoIds || videoIds.length === 0)) {
    throw new YouTubeConfigurationError("Video IDs are required when type is 'videos'");
  }

  if (type === 'channel' && !channelId && !channelHandle) {
    throw new YouTubeConfigurationError("Channel ID or handle is required when type is 'channel'");
  }

  if (type === 'search' && !query) {
    throw new YouTubeConfigurationError("Search query is required when type is 'search'");
  }

  return {
    name: "live-youtube-loader",

    loadCollection: async ({ filter }) => {
      try {
        const apiOptions = {
          apiKey,
          requestOptions,
        };

        let videos: Video[] = [];
        let lastModified: Date | undefined;

        if (type === 'videos') {
          const { data } = await fetchYouTubeVideos({
            ...apiOptions,
            videoIds: videoIds!,
            part: parts,
          });

          videos = transformYouTubeVideosToVideos(data.items);
          lastModified = videos.length > 0 ? videos[0]?.publishedAt : undefined;
        } else if (type === 'channel') {
          const effectiveChannelId = filter?.channelId || channelId;
          if (!effectiveChannelId && !channelHandle) {
            throw new YouTubeConfigurationError("Channel ID or handle is required for channel videos");
          }
          const { data } = await fetchChannelVideos({
            ...apiOptions,
            channelId: effectiveChannelId,
            channelHandle: !effectiveChannelId ? channelHandle : undefined,
            maxResults: filter?.limit || defaultMaxResults,
            order: filter?.order || defaultOrder,
            publishedAfter: filter?.publishedAfter,
            publishedBefore: filter?.publishedBefore,
          });

          // For channel videos, we need to fetch the detailed video info
          if (data.items.length > 0) {
            const videoIds = data.items
              .filter(item => item.id.videoId)
              .map(item => item.id.videoId!);

            if (videoIds.length > 0) {
              const { data: videoData } = await fetchYouTubeVideos({
                ...apiOptions,
                videoIds,
                part: parts,
              });
              videos = transformYouTubeVideosToVideos(videoData.items);
            }
          }
        } else if (type === 'search') {
          const effectiveQuery = filter?.query || query;
          const { data } = await searchYouTubeVideos({
            ...apiOptions,
            q: effectiveQuery,
            channelId: filter?.channelId,
            maxResults: filter?.limit || defaultMaxResults,
            order: filter?.order || defaultOrder,
            publishedAfter: filter?.publishedAfter,
            publishedBefore: filter?.publishedBefore,
            regionCode: filter?.regionCode || defaultRegionCode,
            type: 'video',
          });

          // For search results, we need to fetch the detailed video info
          if (data.items.length > 0) {
            const videoIds = data.items
              .filter(item => item.id.videoId)
              .map(item => item.id.videoId!);

            if (videoIds.length > 0) {
              const { data: videoData } = await fetchYouTubeVideos({
                ...apiOptions,
                videoIds,
                part: parts,
              });
              videos = transformYouTubeVideosToVideos(videoData.items);
            }
          }
        }

        // Apply additional filters
        if (filter) {
          if (filter.categoryId) {
            videos = videos.filter(video => video.categoryId === filter.categoryId);
          }

          if (filter.duration) {
            videos = videos.filter(video => {
              const duration = video.duration;
              if (!duration) return false;
              
              // Parse YouTube duration format (ISO 8601)
              const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (!match) return false;
              
              const hours = parseInt(match[1] || '0', 10);
              const minutes = parseInt(match[2] || '0', 10);
              const seconds = parseInt(match[3] || '0', 10);
              const totalSeconds = hours * 3600 + minutes * 60 + seconds;
              
              switch (filter.duration) {
                case 'short': return totalSeconds <= 240; // 4 minutes
                case 'medium': return totalSeconds > 240 && totalSeconds <= 1200; // 4-20 minutes
                case 'long': return totalSeconds > 1200; // 20+ minutes
                default: return true;
              }
            });
          }

          if (filter.limit && filter.limit < videos.length) {
            videos = videos.slice(0, filter.limit);
          }
        }

        // Sort videos by published date (newest first) if no specific order
        if (!filter?.order) {
          videos.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
        }

        return {
          entries: videos.map((video) => ({
            id: video.id,
            data: video,
            rendered: {
              html: video.description || "",
            },
            cacheHint: {
              lastModified: video.publishedAt,
            },
          })),
          cacheHint: {
            lastModified: lastModified || (videos.length > 0 ? videos[0]?.publishedAt : undefined),
          },
        };
      } catch (error) {
        if (error instanceof YouTubeError) {
          return { error };
        }
        return {
          error: new YouTubeAPIError(
            "Failed to load YouTube collection",
            "",
            500,
            error instanceof Error ? error.message : String(error),
            undefined,
            { cause: error },
          ),
        };
      }
    },

    loadEntry: async ({ filter }) => {
      try {
        const apiOptions = {
          apiKey,
          requestOptions,
        };

        let video: Video | undefined;

        if (filter.id) {
          // Try to load by video ID
          try {
            const { data } = await fetchYouTubeVideos({
              ...apiOptions,
              videoIds: [filter.id],
              part: parts,
            });

            if (data.items.length > 0) {
              video = transformYouTubeVideosToVideos(data.items)[0];
            }
          } catch (error) {
            // If loading by ID fails, try to find it in the collection
            // This is a fallback for when the ID might be from a search result
          }
        }

        if (!video && filter.url) {
          // Extract video ID from YouTube URL
          const videoId = extractVideoIdFromUrl(filter.url);
          if (videoId) {
            try {
              const { data } = await fetchYouTubeVideos({
                ...apiOptions,
                videoIds: [videoId],
                part: parts,
              });

              if (data.items.length > 0) {
                video = transformYouTubeVideosToVideos(data.items)[0];
              }
            } catch (error) {
              // Video not found or inaccessible
            }
          }
        }

        if (!video) {
          return undefined;
        }

        return {
          id: video.id,
          data: video,
          rendered: {
            html: video.description || "",
          },
        };
      } catch (error) {
        if (error instanceof YouTubeError) {
          return { error };
        }
        return {
          error: new YouTubeAPIError(
            "Failed to load YouTube entry",
            "",
            500,
            error instanceof Error ? error.message : String(error),
            undefined,
            { cause: error },
          ),
        };
      }
    },
  };
}

function extractVideoIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle different YouTube URL formats
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
    
    return null;
  } catch {
    return null;
  }
}