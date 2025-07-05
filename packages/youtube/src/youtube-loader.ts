import type { Loader } from "astro/loaders";
import {
  VideoSchema,
  VideoWithFullDetailsSchema,
  type Video,
  type VideoWithFullDetails,
} from "./schema.js";
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
export interface YouTubeVideosLoaderOptions extends YouTubeBaseLoaderOptions {
  type: "videos";
  videoIds: string[];
}

export interface YouTubeChannelLoaderOptions extends YouTubeBaseLoaderOptions {
  type: "channel";
  channelId?: string;
  channelHandle?: string;
  order?:
    | "date"
    | "rating"
    | "relevance"
    | "title"
    | "videoCount"
    | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  /** Filter by video category ID. Only applicable for channel videos. */
  categoryId?: string;
  /** Filter by video duration. Only applicable for channel videos. */
  duration?: "short" | "medium" | "long";
}

export interface YouTubeSearchLoaderOptions extends YouTubeBaseLoaderOptions {
  type: "search";
  query: string;
  order?:
    | "date"
    | "rating"
    | "relevance"
    | "title"
    | "videoCount"
    | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  /** Filter by video category ID. Only applicable for search results. */
  categoryId?: string;
  /** Filter by video duration. Only applicable for search results. */
  duration?: "short" | "medium" | "long";
}

export interface YouTubePlaylistLoaderOptions extends YouTubeBaseLoaderOptions {
  type: "playlist";
  playlistId: string;
}

export type YouTubeLoaderOptions =
  | YouTubeVideosLoaderOptions
  | YouTubeChannelLoaderOptions
  | YouTubeSearchLoaderOptions
  | YouTubePlaylistLoaderOptions;

export function youTubeLoader(
  options: YouTubeLoaderOptions & { fetchFullDetails?: boolean },
): Loader {
  const {
    type,
    apiKey,
    maxResults = 25,
    parts,
    requestOptions = {},
    fetchFullDetails = true,
  } = options;
  // Validate required options
  if (!apiKey) {
    throw new YouTubeConfigurationError("YouTube API key is required");
  }

  if (
    type === "videos" &&
    (!options.videoIds || options.videoIds.length === 0)
  ) {
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
        fetchFullDetails,
      };

      let videos: Video[] = [];

      try {
        if (options.type === "videos") {
          logger.info(`Fetching ${options.videoIds.length} YouTube videos`);
          const { data, wasModified } = await fetchYouTubeVideos({
            ...apiOptions,
            videoIds: options.videoIds,
            part: parts,
          });

          if (!wasModified) {
            return;
          }

          videos = transformYouTubeVideosToVideos(data.items, fetchFullDetails);
        } else if (options.type === "channel") {
          logger.info(
            `Fetching videos from YouTube channel: ${options.channelId || options.channelHandle}`,
          );
          const { data, wasModified } = await fetchChannelVideos({
            ...apiOptions,
            channelId: options.channelId,
            channelHandle: options.channelHandle,
            maxResults,
            order: options.order || "date",
            publishedAfter: options.publishedAfter,
            publishedBefore: options.publishedBefore,
            part: parts,
          });

          if (!wasModified) {
            return;
          }

          // For channel videos, we need to fetch the detailed video info if not already present
          if (data.items.length > 0 && fetchFullDetails) {
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
              videos = transformYouTubeVideosToVideos(
                videoData.items,
                fetchFullDetails,
              );
            }
          } else if (data.items.length > 0) {
            // If not fetching full details, transform the search results directly
            videos = transformYouTubeVideosToVideos(
              data.items.map((item) => ({
                kind: "youtube#video",
                etag: item.etag,
                id: item.id.videoId!,
                snippet: item.snippet,
              })),
              fetchFullDetails,
            );
          }
        } else if (options.type === "search") {
          logger.info(`Searching YouTube videos: "${options.query}"`);
          const { data, wasModified } = await searchYouTubeVideos({
            ...apiOptions,
            q: options.query,
            maxResults,
            order: options.order || "date",
            publishedAfter: options.publishedAfter,
            publishedBefore: options.publishedBefore,
            regionCode: options.regionCode,
            type: "video",
          });

          if (!wasModified) {
            return;
          }

          // For search results, we need to fetch the detailed video info
          if (data.items.length > 0 && fetchFullDetails) {
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
              videos = transformYouTubeVideosToVideos(
                videoData.items,
                fetchFullDetails,
              );
            }
          } else if (data.items.length > 0) {
            // If not fetching full details, transform the search results directly
            videos = transformYouTubeVideosToVideos(
              data.items.map((item) => ({
                kind: "youtube#video",
                etag: item.etag,
                id: item.id.videoId!,
                snippet: item.snippet,
              })),
              fetchFullDetails,
            );
          }
        } else if (options.type === "playlist") {
          logger.info(
            `Fetching videos from YouTube playlist: ${options.playlistId}`,
          );
          const { data, wasModified } = await fetchYouTubePlaylistItems({
            ...apiOptions,
            playlistId: options.playlistId,
            maxResults,
          });

          if (!wasModified) {
            return;
          }

          // For playlist items, we need to fetch the detailed video info
          if (data.items.length > 0 && fetchFullDetails) {
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
              videos = transformYouTubeVideosToVideos(videoData.items, fetchFullDetails);
            }
          } else if (data.items.length > 0) {
            // If not fetching full details, transform the playlist items directly
            videos = transformYouTubeVideosToVideos(
              data.items.map((item) => ({
                kind: "youtube#video",
                etag: item.etag,
                id: item.snippet!.resourceId!.videoId!,
                snippet: item.snippet,
              })),
              fetchFullDetails,
            );
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
    schema: fetchFullDetails ? VideoWithFullDetailsSchema : VideoSchema,
  };
}
