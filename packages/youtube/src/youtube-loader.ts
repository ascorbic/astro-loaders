import type { Loader } from "astro/loaders";
import { VideoSchema, type Video } from "./schema.js";
import {
  fetchYouTubeVideos,
  searchYouTubeVideos,
  fetchChannelVideos,
  fetchYouTubePlaylistItems,
  transformYouTubeVideosToVideos,
  type YouTubeAPIOptions,
} from "./youtube-api-util.js";
import { YouTubeConfigurationError } from "./youtube-errors.js";

// Base loader options
interface YouTubeBaseLoaderOptions extends YouTubeAPIOptions {
  /** Maximum number of results to fetch (default: 25) */
  maxResults?: number;
  /** Additional YouTube API parts to include */
  parts?: string[];
}

// Discriminated union for different loader types
export type YouTubeLoaderOptions = 
  | {
      type: "videos";
      videoIds: string[];
    } & YouTubeBaseLoaderOptions
  | {
      type: "channel";
      channelId?: string;
      channelHandle?: string;
      order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
      publishedAfter?: Date;
      publishedBefore?: Date;
    } & YouTubeBaseLoaderOptions
  | {
      type: "search";
      query: string;
      order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
      publishedAfter?: Date;
      publishedBefore?: Date;
      regionCode?: string;
    } & YouTubeBaseLoaderOptions
  | {
      type: "playlist";
      playlistId: string;
    } & YouTubeBaseLoaderOptions;

export function youTubeLoader(options: YouTubeLoaderOptions): Loader {
  const { type, apiKey, maxResults = 25, parts, requestOptions = {} } = options;
  // Validate required options
  if (!apiKey) {
    throw new YouTubeConfigurationError("YouTube API key is required");
  }

  if (type === "videos" && (!options.videoIds || options.videoIds.length === 0)) {
    throw new YouTubeConfigurationError(
      "Video IDs are required when type is 'videos'",
    );
  }

  if (type === "channel" && !options.channelId && !options.channelHandle) {
    throw new YouTubeConfigurationError(
      "Channel ID or handle is required when type is 'channel'",
    );
  }

  if (type === "search" && !options.query) {
    throw new YouTubeConfigurationError(
      "Search query is required when type is 'search'",
    );
  }

  if (type === "playlist" && !options.playlistId) {
    throw new YouTubeConfigurationError(
      "Playlist ID is required when type is 'playlist'",
    );
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
        if (type === "videos") {
          const videosOptions = options as Extract<YouTubeLoaderOptions, { type: "videos" }>;
          logger.info(`Fetching ${videosOptions.videoIds.length} YouTube videos`);
          const { data, wasModified } = await fetchYouTubeVideos({
            ...apiOptions,
            videoIds: videosOptions.videoIds,
            part: parts,
          });

          if (!wasModified) {
            return;
          }

          videos = transformYouTubeVideosToVideos(data.items);
        } else if (type === "channel") {
          const channelOptions = options as Extract<YouTubeLoaderOptions, { type: "channel" }>;
          logger.info(
            `Fetching videos from YouTube channel: ${channelOptions.channelId || channelOptions.channelHandle}`,
          );
          const { data, wasModified } = await fetchChannelVideos({
            ...apiOptions,
            channelId: channelOptions.channelId,
            channelHandle: channelOptions.channelHandle,
            maxResults,
            order: channelOptions.order || "date",
            publishedAfter: channelOptions.publishedAfter,
            publishedBefore: channelOptions.publishedBefore,
          });

          if (!wasModified) {
            return;
          }

          // For channel videos, we need to fetch the detailed video info
          if (data.items.length > 0) {
            const videoIds = data.items
              .filter(
                (item) => item.id.kind === "youtube#video" && item.id.videoId,
              )
              .map((item) => item.id.videoId!);

            if (videoIds.length > 0) {
              const { data: videoData } = await fetchYouTubeVideos({
                ...apiOptions,
                videoIds,
                part: parts,
              });
              videos = transformYouTubeVideosToVideos(videoData.items);
            }
          }
        } else if (type === "search") {
          const searchOptions = options as Extract<YouTubeLoaderOptions, { type: "search" }>;
          logger.info(`Searching YouTube videos: "${searchOptions.query}"`);
          const { data, wasModified } = await searchYouTubeVideos({
            ...apiOptions,
            q: searchOptions.query,
            maxResults,
            order: searchOptions.order || "date",
            publishedAfter: searchOptions.publishedAfter,
            publishedBefore: searchOptions.publishedBefore,
            regionCode: searchOptions.regionCode,
            type: "video",
          });

          if (!wasModified) {
            return;
          }

          // For search results, we need to fetch the detailed video info
          if (data.items.length > 0) {
            const videoIds = data.items
              .filter(
                (item) => item.id.kind === "youtube#video" && item.id.videoId,
              )
              .map((item) => item.id.videoId!);

            if (videoIds.length > 0) {
              const { data: videoData } = await fetchYouTubeVideos({
                ...apiOptions,
                videoIds,
                part: parts,
              });
              videos = transformYouTubeVideosToVideos(videoData.items);
            }
          }
        } else if (type === "playlist") {
          const playlistOptions = options as Extract<YouTubeLoaderOptions, { type: "playlist" }>;
          logger.info(`Fetching videos from YouTube playlist: ${playlistOptions.playlistId}`);
          const { data, wasModified } = await fetchYouTubePlaylistItems({
            ...apiOptions,
            playlistId: playlistOptions.playlistId,
            maxResults,
          });

          if (!wasModified) {
            return;
          }

          // For playlist items, we need to fetch the detailed video info
          if (data.items.length > 0) {
            const videoIds = data.items
              .filter(
                (item) =>
                  item.snippet?.resourceId?.kind === "youtube#video" &&
                  item.snippet.resourceId.videoId,
              )
              .map((item) => item.snippet!.resourceId.videoId!);

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
