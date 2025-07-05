import { z } from "astro/zod";
import type { LoaderContext } from "astro/loaders";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
} from "@ascorbic/loader-utils";
import {
  YouTubeVideoListResponseSchema,
  YouTubeSearchListResponseSchema,
  YouTubePlaylistListResponseSchema,
  YouTubePlaylistItemListResponseSchema,
  YouTubeVideoSchema,
  VideoSchema,
  VideoWithFullDetailsSchema,
  type YouTubeVideo,
  type YouTubeVideoListResponse,
  type YouTubeSearchListResponse,
  type YouTubePlaylistListResponse,
  type YouTubePlaylistItemListResponse,
  type Video,
  type VideoWithFullDetails,
} from "./schema.js";
import {
  YouTubeError,
  YouTubeAPIError,
  YouTubeValidationError,
} from "./youtube-errors.js";

export interface YouTubeAPIOptions {
  apiKey: string;
  requestOptions?: RequestInit;
  meta?: LoaderContext["meta"];
  logger?: LoaderContext["logger"];
  fetchFullDetails?: boolean;
}

export interface YouTubeVideoFetchOptions extends YouTubeAPIOptions {
  videoIds: string[];
  part?: string[];
  videoCategoryId?: string;
}

export interface YouTubeChannelVideoFetchOptions extends YouTubeAPIOptions {
  channelId?: string;
  channelHandle?: string;
  maxResults?: number;
  order?:
    | "date"
    | "rating"
    | "relevance"
    | "title"
    | "videoCount"
    | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  part?: string[];
  videoCategoryId?: string;
  videoDuration?: "short" | "medium" | "long" | "any";
}

export interface YouTubeSearchOptions extends YouTubeAPIOptions {
  q?: string;
  channelId?: string;
  channelType?: "any" | "show";
  maxResults?: number;
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
  type?: "channel" | "playlist" | "video";
  part?: string[];
  videoCategoryId?: string;
  videoDuration?: "short" | "medium" | "long" | "any";
}

export interface YouTubePlaylistFetchOptions extends YouTubeAPIOptions {
  playlistId: string;
  part?: string[];
}

export interface YouTubePlaylistItemFetchOptions extends YouTubeAPIOptions {
  playlistId: string;
  maxResults?: number;
  part?: string[];
  fetchFullDetails?: boolean;
}

export interface YouTubeAPIResult<T> {
  data: T;
  wasModified: boolean;
}

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

async function makeYouTubeAPIRequest<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
  options: YouTubeAPIOptions,
  schema: any,
): Promise<YouTubeAPIResult<T>> {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/${endpoint}`);

  // Add other parameters (but NOT the API key - we'll send that in headers)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  // Copy request options to avoid mutating the original
  const requestOptions = { ...options.requestOptions };

  // Add API key to headers (more secure than query params)
  const headers = new Headers(requestOptions.headers);
  headers.set("X-goog-api-key", options.apiKey);

  // Only use caching if meta is provided
  if (options.meta) {
    const conditionalHeaders = getConditionalHeaders({
      init: headers,
      meta: options.meta,
    });
    requestOptions.headers = conditionalHeaders;
  } else {
    requestOptions.headers = headers;
  }

  const res = await fetch(url, requestOptions);

  if (res.status === 304 && options.meta) {
    options.logger?.info(`YouTube data not modified, skipping`);
    return { data: null as any, wasModified: false };
  }

  if (!res.ok) {
    const errorText = await res.text();
    let errorData: any = null;

    try {
      errorData = JSON.parse(errorText);
    } catch {
      // If we can't parse the error response, use the status text
    }

    throw new YouTubeAPIError(
      `YouTube API request failed: ${res.status} ${res.statusText}`,
      url.toString(),
      res.status,
      errorData?.error?.message || res.statusText,
      errorData,
    );
  }

  const responseText = await res.text();
  if (!responseText) {
    throw new YouTubeValidationError(
      "YouTube API response is empty",
      url.toString(),
    );
  }

  try {
    const jsonData = JSON.parse(responseText);
    const validatedData = schema.parse(jsonData);

    // Only store cache headers if meta is provided
    if (options.meta) {
      storeConditionalHeaders({
        headers: res.headers,
        meta: options.meta,
      });
    }

    return { data: validatedData, wasModified: true };
  } catch (error) {
    throw new YouTubeValidationError(
      "Failed to parse YouTube API response",
      url.toString(),
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

export async function fetchYouTubeVideos({
  videoIds,
  part = ["snippet", "contentDetails", "statistics"],
  videoCategoryId,
  fetchFullDetails = true,
  ...options
}: YouTubeVideoFetchOptions): Promise<
  YouTubeAPIResult<YouTubeVideoListResponse>
> {
  const effectiveParts = fetchFullDetails ? part : ["snippet"];
  const params = {
    part: effectiveParts.join(","),
    id: videoIds.join(","),
    maxResults: 50, // YouTube API max for videos endpoint
    videoCategoryId,
  };

  return makeYouTubeAPIRequest<YouTubeVideoListResponse>(
    "videos",
    params,
    options,
    YouTubeVideoListResponseSchema,
  );
}

export async function searchYouTubeVideos({
  q,
  channelId,
  channelType,
  maxResults = 25,
  order = "relevance",
  publishedAfter,
  publishedBefore,
  regionCode,
  type = "video",
  part = ["snippet"],
  videoCategoryId,
  videoDuration,
  ...options
}: YouTubeSearchOptions): Promise<YouTubeAPIResult<YouTubeSearchListResponse>> {
  const params: Record<string, string | number | boolean | undefined> = {
    part: part.join(","),
    type,
    maxResults,
    order,
    regionCode,
    channelType,
    videoCategoryId,
    videoDuration,
  };

  if (q) params.q = q;
  if (channelId) params.channelId = channelId;
  if (publishedAfter) params.publishedAfter = publishedAfter.toISOString();
  if (publishedBefore) params.publishedBefore = publishedBefore.toISOString();

  return makeYouTubeAPIRequest<YouTubeSearchListResponse>(
    "search",
    params,
    options,
    YouTubeSearchListResponseSchema,
  );
}

async function getChannelIdFromHandle(
  handle: string,
  options: YouTubeAPIOptions,
): Promise<string> {
  options.logger?.info(`Fetching channel ID for handle: ${handle}`);

  const params = {
    part: "id",
    forHandle: handle,
  };

  const result = await makeYouTubeAPIRequest<any>(
    "channels",
    params,
    options,
    z.object({ items: z.array(z.object({ id: z.string() })) }),
  );

  if (!result.wasModified || !result.data?.items?.length) {
    throw new YouTubeError(`Could not find channel with handle: ${handle}`);
  }

  const channel = result.data.items[0];
  if (!channel?.id) {
    throw new YouTubeError(`Could not find channel with handle: ${handle}`);
  }

  return channel.id;
}

export async function fetchChannelVideos({
  channelId,
  channelHandle,
  maxResults = 25,
  order = "date",
  publishedAfter,
  publishedBefore,
  part,
  fetchFullDetails = true,
  ...options
}: YouTubeChannelVideoFetchOptions): Promise<
  YouTubeAPIResult<YouTubeSearchListResponse>
> {
  if (!channelId && !channelHandle) {
    throw new YouTubeError(
      "Either channelId or channelHandle must be provided",
    );
  }

  let resolvedChannelId = channelId;
  if (channelHandle && !channelId) {
    resolvedChannelId = await getChannelIdFromHandle(channelHandle, options);
  }

  const searchOptions: YouTubeSearchOptions = {
    channelId: resolvedChannelId,
    maxResults,
    order,
    publishedAfter,
    publishedBefore,
    type: "video",
    part,
    fetchFullDetails,
    apiKey: options.apiKey,
    requestOptions: options.requestOptions,
    meta: options.meta,
    logger: options.logger,
  };

  return searchYouTubeVideos(searchOptions);
}

export type VideoType<TWithFullDetails extends boolean> =
  TWithFullDetails extends true ? VideoWithFullDetails : Video;

export function transformYouTubeVideoToVideo<TWithFullDetails extends boolean>(
  ytVideo: YouTubeVideo,
  fetchFullDetails: TWithFullDetails,
): VideoType<TWithFullDetails> {
  if (!ytVideo.snippet) {
    throw new YouTubeValidationError(
      "YouTube video missing snippet data",
      ytVideo.id,
    );
  }

  const baseVideo = {
    id: ytVideo.id,
    title: ytVideo.snippet.title,
    description: ytVideo.snippet.description,
    url: `https://www.youtube.com/watch?v=${ytVideo.id}`,
    publishedAt: ytVideo.snippet.publishedAt,
    channelId: ytVideo.snippet.channelId,
    channelTitle: ytVideo.snippet.channelTitle,
    thumbnails: ytVideo.snippet.thumbnails,
    tags: ytVideo.snippet.tags,
    categoryId: ytVideo.snippet.categoryId,
    liveBroadcastContent: ytVideo.snippet.liveBroadcastContent,
    defaultLanguage: ytVideo.snippet.defaultLanguage,
  };

  if (fetchFullDetails) {
    return VideoWithFullDetailsSchema.parse({
      ...baseVideo,
      duration: ytVideo.contentDetails?.duration || "PT0S",
      viewCount: ytVideo.statistics?.viewCount || "0",
      likeCount: ytVideo.statistics?.likeCount || "0",
      commentCount: ytVideo.statistics?.commentCount || "0",
    });
  } else {
    return VideoSchema.parse({
      ...baseVideo,
      duration: ytVideo.contentDetails?.duration,
      viewCount: ytVideo.statistics?.viewCount,
      likeCount: ytVideo.statistics?.likeCount,
      commentCount: ytVideo.statistics?.commentCount,
    }) as VideoType<TWithFullDetails>;
  }
}

export function transformYouTubeVideosToVideos<
  TFetchFullDetails extends boolean,
>(
  ytVideos: YouTubeVideo[],
  fetchFullDetails: TFetchFullDetails,
): Array<VideoType<TFetchFullDetails>> {
  return ytVideos.map((video) =>
    transformYouTubeVideoToVideo(video, fetchFullDetails),
  );
}

export async function fetchYouTubePlaylist({
  playlistId,
  part = ["snippet", "contentDetails"],
  ...options
}: YouTubePlaylistFetchOptions): Promise<
  YouTubeAPIResult<YouTubePlaylistListResponse>
> {
  const params = {
    part: part.join(","),
    id: playlistId,
  };

  return makeYouTubeAPIRequest<YouTubePlaylistListResponse>(
    "playlists",
    params,
    options,
    YouTubePlaylistListResponseSchema,
  );
}

export const fetchYouTubePlaylistItems = ({
  playlistId,
  maxResults = 50,
  part = ["snippet", "contentDetails"],
  fetchFullDetails = true,
  ...options
}: YouTubePlaylistItemFetchOptions): Promise<
  YouTubeAPIResult<YouTubePlaylistItemListResponse>
> =>
  makeYouTubeAPIRequest<YouTubePlaylistItemListResponse>(
    "playlistItems",
    {
      part: part.join(","),
      playlistId,
      maxResults,
    },
    options,
    YouTubePlaylistItemListResponseSchema,
  );
