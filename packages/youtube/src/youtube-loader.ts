import type { Loader } from "astro/loaders";
import { VideoSchema, type Video } from "./schema.js";
import { 
  fetchYouTubeVideos, 
  searchYouTubeVideos, 
  fetchChannelVideos,
  transformYouTubeVideosToVideos,
  type YouTubeAPIOptions 
} from "./youtube-api-util.js";
import { YouTubeConfigurationError } from "./youtube-errors.js";

export interface YouTubeLoaderOptions extends YouTubeAPIOptions {
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
  
  /** Maximum number of results to fetch (default: 25) */
  maxResults?: number;
  
  /** Order of results */
  order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  
  /** Filter videos published after this date */
  publishedAfter?: Date;
  
  /** Filter videos published before this date */
  publishedBefore?: Date;
  
  /** Region code for localized results */
  regionCode?: string;
  
  /** Additional YouTube API parts to include */
  parts?: string[];
}

export function youTubeLoader({
  type,
  apiKey,
  videoIds,
  channelId,
  channelHandle,
  query,
  maxResults = 25,
  order = "date",
  publishedAfter,
  publishedBefore,
  regionCode,
  parts,
  requestOptions = {},
}: YouTubeLoaderOptions): Loader {
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
    name: "youtube-loader",
    load: async ({ store, logger, parseData, meta }) => {
      logger.info(`Loading YouTube ${type} content`);
      
      const apiOptions = {
        apiKey,
        requestOptions,
        meta,
        logger,
      };

      let videos: Video[] = [];

      try {
        if (type === 'videos') {
          logger.info(`Fetching ${videoIds!.length} YouTube videos`);
          const { data, wasModified } = await fetchYouTubeVideos({
            ...apiOptions,
            videoIds: videoIds!,
            part: parts,
          });

          if (!wasModified) {
            return;
          }

          videos = transformYouTubeVideosToVideos(data.items);
        } else if (type === 'channel') {
          logger.info(`Fetching videos from YouTube channel: ${channelId || channelHandle}`);
          const { data, wasModified } = await fetchChannelVideos({
            ...apiOptions,
            channelId,
            channelHandle,
            maxResults,
            order,
            publishedAfter,
            publishedBefore,
          });

          if (!wasModified) {
            return;
          }

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
          logger.info(`Searching YouTube videos: "${query}"`);
          const { data, wasModified } = await searchYouTubeVideos({
            ...apiOptions,
            q: query,
            maxResults,
            order,
            publishedAfter,
            publishedBefore,
            regionCode,
            type: 'video',
          });

          if (!wasModified) {
            return;
          }

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

        // Clear existing data
        store.clear();

        // Process and store videos
        let processedCount = 0;
        for (const video of videos) {
          const data = await parseData({
            id: video.id,
            data: video as unknown as Record<string, unknown>,
          });

          store.set({
            id: video.id,
            data,
            rendered: {
              html: video.description || "",
            },
          });

          processedCount++;
        }

        logger.info(`Loaded ${processedCount} YouTube videos`);
      } catch (error) {
        logger.error(`Failed to load YouTube content: ${error}`);
        throw error;
      }
    },
    schema: VideoSchema,
  };
}