import type { LiveLoader } from "astro/loaders";
import {
  fetchYouTubeVideos,
  searchYouTubeVideos,
  fetchChannelVideos,
  fetchYouTubePlaylistItems,
  transformYouTubeVideosToVideos,
  type YouTubeAPIOptions,
  type VideoType,
} from "./youtube-api-util.js";
import { type Video, type VideoWithFullDetails } from "./schema.js";
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
  defaultOrder?:
    | "date"
    | "rating"
    | "relevance"
    | "title"
    | "videoCount"
    | "viewCount";
  /** Default region code for localized results */
  defaultRegionCode?: string;
  /** Additional YouTube API parts to include */
  parts?: string[];
}

export interface LiveYouTubeVideosLoaderOptions
  extends LiveYouTubeBaseLoaderOptions {
  type: "videos";
  videoIds: string[];
}

export interface LiveYouTubeChannelLoaderOptions
  extends LiveYouTubeBaseLoaderOptions {
  type: "channel";
  channelId?: string;
  channelHandle?: string;
}

export interface LiveYouTubeSearchLoaderOptions
  extends LiveYouTubeBaseLoaderOptions {
  type: "search";
  query: string;
}

export interface LiveYouTubePlaylistLoaderOptions
  extends LiveYouTubeBaseLoaderOptions {
  type: "playlist";
  playlistId: string;
}

export type LiveYouTubeLoaderOptions =
  | LiveYouTubeVideosLoaderOptions
  | LiveYouTubeChannelLoaderOptions
  | LiveYouTubeSearchLoaderOptions
  | LiveYouTubePlaylistLoaderOptions;

export interface YouTubeBaseCollectionFilter {
  limit?: number;
}

export interface YouTubeChannelCollectionFilter
  extends YouTubeBaseCollectionFilter {
  channelId?: string;
  order?:
    | "date"
    | "rating"
    | "relevance"
    | "title"
    | "videoCount"
    | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  categoryId?: string;
  duration?: "short" | "medium" | "long";
}

export interface YouTubeSearchCollectionFilter
  extends YouTubeBaseCollectionFilter {
  query?: string;
  channelId?: string;
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
  categoryId?: string;
  duration?: "short" | "medium" | "long";
}

export type YouTubeCollectionFilter =
  | YouTubeChannelCollectionFilter
  | YouTubeSearchCollectionFilter;

export interface YouTubeEntryFilter {
  id?: string;
  url?: string;
}

export function liveYouTubeLoader<TFetchFullDetails extends boolean = true>(
  options: LiveYouTubeLoaderOptions & { fetchFullDetails?: TFetchFullDetails },
): LiveLoader<
  VideoType<TFetchFullDetails>,
  YouTubeEntryFilter,
  YouTubeCollectionFilter,
  YouTubeErrorTypes
> {
  const {
    type,
    apiKey,
    defaultMaxResults = 25,
    defaultOrder = "date",
    defaultRegionCode,
    parts,
    requestOptions = {},
    fetchFullDetails = true as TFetchFullDetails,
  } = options;

  if (!apiKey) {
    throw new YouTubeConfigurationError("YouTube API key is required");
  }

  if (type === "videos" && !options.videoIds?.length) {
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
    name: "live-youtube-loader",

    loadCollection: async ({ filter }) => {
      try {
        const apiOptions = {
          apiKey,
          requestOptions,
          fetchFullDetails,
        };

        let videos: Video[] = [];
        let lastModified: Date | undefined;

        if (options.type === "videos") {
          const { data } = await fetchYouTubeVideos({
            ...apiOptions,
            videoIds: options.videoIds,
            part: parts,
          });

          videos = transformYouTubeVideosToVideos(data.items, fetchFullDetails);
          lastModified = videos.length > 0 ? videos[0]?.publishedAt : undefined;
        } else if (options.type === "channel") {
          const channelFilter = filter as YouTubeChannelCollectionFilter;
          const effectiveChannelId =
            channelFilter?.channelId || options.channelId;
          if (!effectiveChannelId && !options.channelHandle) {
            throw new YouTubeConfigurationError(
              "Channel ID or handle is required for channel videos",
            );
          }
          const { data } = await fetchChannelVideos({
            ...apiOptions,
            channelId: effectiveChannelId,
            channelHandle: !effectiveChannelId
              ? options.channelHandle
              : undefined,
            maxResults: filter?.limit || defaultMaxResults,
            order: channelFilter?.order || defaultOrder,
            publishedAfter: channelFilter?.publishedAfter,
            publishedBefore: channelFilter?.publishedBefore,
            videoCategoryId: channelFilter?.categoryId,
            videoDuration: channelFilter?.duration,
          });

          // For channel videos, we need to fetch the detailed video info if not already present
          if (data.items.length > 0 && fetchFullDetails) {
            const videoIds = data.items
              .filter((item) => item.id.videoId)
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
          const searchFilter = filter as YouTubeSearchCollectionFilter;
          const effectiveQuery = searchFilter?.query || options.query;
          const { data } = await searchYouTubeVideos({
            ...apiOptions,
            q: effectiveQuery,
            channelId: searchFilter?.channelId,
            maxResults: filter?.limit || defaultMaxResults,
            order: searchFilter?.order || defaultOrder,
            publishedAfter: searchFilter?.publishedAfter,
            publishedBefore: searchFilter?.publishedBefore,
            regionCode: searchFilter?.regionCode || defaultRegionCode,
            type: "video",
            videoCategoryId: searchFilter?.categoryId,
            videoDuration: searchFilter?.duration,
          });

          // For search results, we need to fetch the detailed video info
          if (data.items.length > 0 && fetchFullDetails) {
            const videoIds = data.items
              .filter((item) => item.id.videoId)
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
          const { data } = await fetchYouTubePlaylistItems({
            ...apiOptions,
            playlistId: options.playlistId,
            maxResults: filter?.limit || defaultMaxResults,
          });

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
              videos = transformYouTubeVideosToVideos(
                videoData.items,
                fetchFullDetails,
              );
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

        // Apply additional filters
        if (filter?.limit && filter.limit < videos.length) {
          videos = videos.slice(0, filter.limit);
        }

        // Sort videos by published date (newest first) if no specific order
        if (!filter?.order) {
          videos.sort(
            (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
          );
        }

        return {
          entries: videos.map((video) => ({
            id: video.id,
            data: video as VideoType<TFetchFullDetails>,
            rendered: {
              html: video.description || "",
            },
            cacheHint: {
              lastModified: video.publishedAt,
            },
          })),
          cacheHint: {
            lastModified:
              lastModified ||
              (videos.length > 0 ? videos[0]?.publishedAt : undefined),
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
          fetchFullDetails,
        };

        let video: VideoType<TFetchFullDetails> | undefined;

        if (filter.id) {
          try {
            const { data } = await fetchYouTubeVideos({
              ...apiOptions,
              videoIds: [filter.id],
              part: parts,
            });

            if (data.items.length > 0) {
              video = transformYouTubeVideosToVideos(
                data.items,
                fetchFullDetails,
              )[0];
            }
          } catch (error) {
            // If loading by ID fails, it might be an ID from a search result
            // that is not a canonical video ID. In this case, we can try
            // searching for it.
            const { data: searchData } = await searchYouTubeVideos({
              ...apiOptions,
              q: filter.id,
              maxResults: 1,
            });
            const videoId = searchData?.items?.[0]?.id?.videoId;
            if (videoId) {
              const { data: videoData } = await fetchYouTubeVideos({
                ...apiOptions,
                videoIds: [videoId],
                part: parts,
              });
              if (videoData?.items?.length > 0) {
                video = transformYouTubeVideosToVideos(
                  videoData.items,
                  fetchFullDetails,
                )[0];
              }
            }
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
                video = transformYouTubeVideosToVideos(
                  data.items,
                  fetchFullDetails,
                )[0];
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
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    if (hostname.includes("youtube.com")) {
      if (pathname.startsWith("/watch")) {
        return searchParams.get("v");
      } else if (pathname.startsWith("/embed/")) {
        return pathname.substring(7);
      } else if (pathname.startsWith("/shorts/")) {
        return pathname.substring(8);
      }
    } else if (hostname.includes("youtu.be")) {
      return pathname.substring(1);
    }

    return null;
  } catch {
    return null;
  }
}
