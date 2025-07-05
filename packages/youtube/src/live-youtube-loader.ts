import type { LiveLoader } from "astro/loaders";
import { 
  fetchYouTubeVideos, 
  searchYouTubeVideos, 
  fetchChannelVideos,
  fetchYouTubePlaylistItems,
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

// Base live loader options
interface LiveYouTubeBaseLoaderOptions extends YouTubeAPIOptions {
  /** Default maximum number of results to fetch */
  defaultMaxResults?: number;
  /** Default order of results */
  defaultOrder?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  /** Default region code for localized results */
  defaultRegionCode?: string;
  /** Additional YouTube API parts to include */
  parts?: string[];
}

// Discriminated union for different live loader types
export type LiveYouTubeLoaderOptions = 
  | {
      type: 'videos';
      videoIds: string[];
    } & LiveYouTubeBaseLoaderOptions
  | {
      type: 'channel';
      channelId?: string;
      channelHandle?: string;
    } & LiveYouTubeBaseLoaderOptions
  | {
      type: 'search';
      query: string;
    } & LiveYouTubeBaseLoaderOptions
  | {
      type: 'playlist';
      playlistId: string;
    } & LiveYouTubeBaseLoaderOptions;

// Base filter interface with common properties
export interface YouTubeBaseCollectionFilter {
  limit?: number;
  categoryId?: string;
  duration?: "short" | "medium" | "long";
}

// Filter for videos loader type
export interface YouTubeVideosCollectionFilter extends YouTubeBaseCollectionFilter {
  // Videos are loaded by ID, so no additional filtering options needed
}

// Filter for channel loader type
export interface YouTubeChannelCollectionFilter extends YouTubeBaseCollectionFilter {
  channelId?: string; // Override the channel specified in loader options
  order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
}

// Filter for search loader type
export interface YouTubeSearchCollectionFilter extends YouTubeBaseCollectionFilter {
  query?: string; // Override the search query specified in loader options
  channelId?: string; // Limit search to specific channel
  order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
}

// Filter for playlist loader type
export interface YouTubePlaylistCollectionFilter extends YouTubeBaseCollectionFilter {
  // Playlists maintain their order, so no order option
  // Position-based filtering could be added in future
}

// Union type for all collection filters
export type YouTubeCollectionFilter = 
  | YouTubeVideosCollectionFilter
  | YouTubeChannelCollectionFilter 
  | YouTubeSearchCollectionFilter
  | YouTubePlaylistCollectionFilter;

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

  if (type === 'videos' && (!options.videoIds || options.videoIds.length === 0)) {
    throw new YouTubeConfigurationError("Video IDs are required when type is 'videos'");
  }

  if (type === 'channel' && !options.channelId && !options.channelHandle) {
    throw new YouTubeConfigurationError("Channel ID or handle is required when type is 'channel'");
  }

  if (type === 'search' && !options.query) {
    throw new YouTubeConfigurationError("Search query is required when type is 'search'");
  }

  if (type === 'playlist' && !options.playlistId) {
    throw new YouTubeConfigurationError("Playlist ID is required when type is 'playlist'");
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
          const videosOptions = options as Extract<LiveYouTubeLoaderOptions, { type: 'videos' }>;
          const { data } = await fetchYouTubeVideos({
            ...apiOptions,
            videoIds: videosOptions.videoIds,
            part: parts,
          });

          videos = transformYouTubeVideosToVideos(data.items);
          lastModified = videos.length > 0 ? videos[0]?.publishedAt : undefined;
        } else if (type === 'channel') {
          const channelOptions = options as Extract<LiveYouTubeLoaderOptions, { type: 'channel' }>;
          const channelFilter = filter as YouTubeChannelCollectionFilter;
          const effectiveChannelId = channelFilter?.channelId || channelOptions.channelId;
          if (!effectiveChannelId && !channelOptions.channelHandle) {
            throw new YouTubeConfigurationError("Channel ID or handle is required for channel videos");
          }
          const { data } = await fetchChannelVideos({
            ...apiOptions,
            channelId: effectiveChannelId,
            channelHandle: !effectiveChannelId ? channelOptions.channelHandle : undefined,
            maxResults: filter?.limit || defaultMaxResults,
            order: channelFilter?.order || defaultOrder,
            publishedAfter: channelFilter?.publishedAfter,
            publishedBefore: channelFilter?.publishedBefore,
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
          const searchOptions = options as Extract<LiveYouTubeLoaderOptions, { type: 'search' }>;
          const searchFilter = filter as YouTubeSearchCollectionFilter;
          const effectiveQuery = searchFilter?.query || searchOptions.query;
          const { data } = await searchYouTubeVideos({
            ...apiOptions,
            q: effectiveQuery,
            channelId: searchFilter?.channelId,
            maxResults: filter?.limit || defaultMaxResults,
            order: searchFilter?.order || defaultOrder,
            publishedAfter: searchFilter?.publishedAfter,
            publishedBefore: searchFilter?.publishedBefore,
            regionCode: searchFilter?.regionCode || defaultRegionCode,
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
        } else if (type === 'playlist') {
          const playlistOptions = options as Extract<LiveYouTubeLoaderOptions, { type: 'playlist' }>;
          const { data } = await fetchYouTubePlaylistItems({
            ...apiOptions,
            playlistId: playlistOptions.playlistId,
            maxResults: filter?.limit || defaultMaxResults,
          });

          // For playlist items, we need to fetch the detailed video info
          if (data.items.length > 0) {
            const videoIds = data.items
              .filter(item => 
                item.snippet?.resourceId?.kind === "youtube#video" && 
                item.snippet.resourceId.videoId
              )
              .map(item => item.snippet!.resourceId.videoId!);

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
        const hasOrder = (filter as YouTubeChannelCollectionFilter | YouTubeSearchCollectionFilter)?.order;
        if (!hasOrder) {
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