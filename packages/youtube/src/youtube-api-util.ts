import type { LoaderContext } from "astro/loaders";
import {
  getConditionalHeaders,
  storeConditionalHeaders,
} from "@ascorbic/loader-utils";
import {
  YouTubeVideoListResponseSchema,
  YouTubeSearchListResponseSchema,
  YouTubeVideoSchema,
  VideoSchema,
  type YouTubeVideo,
  type YouTubeVideoListResponse,
  type YouTubeSearchListResponse,
  type Video,
} from "./schema.js";
import { YouTubeError, YouTubeAPIError, YouTubeValidationError } from "./youtube-errors.js";

export interface YouTubeAPIOptions {
  apiKey: string;
  requestOptions?: RequestInit;
  meta?: LoaderContext["meta"];
  logger?: LoaderContext["logger"];
}

export interface YouTubeVideoFetchOptions extends YouTubeAPIOptions {
  videoIds: string[];
  part?: string[];
}

export interface YouTubeChannelVideoFetchOptions extends YouTubeAPIOptions {
  channelId?: string;
  channelHandle?: string;
  maxResults?: number;
  order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
}

export interface YouTubeSearchOptions extends YouTubeAPIOptions {
  q?: string;
  channelId?: string;
  channelType?: "any" | "show";
  maxResults?: number;
  order?: "date" | "rating" | "relevance" | "title" | "videoCount" | "viewCount";
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  type?: "channel" | "playlist" | "video";
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
  schema: any
): Promise<YouTubeAPIResult<T>> {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/${endpoint}`);
  
  // Add API key
  url.searchParams.set("key", options.apiKey);
  
  // Add other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const requestOptions = { ...options.requestOptions };

  // Only use caching if meta is provided
  if (options.meta) {
    requestOptions.headers = getConditionalHeaders({
      init: requestOptions.headers,
      meta: options.meta,
    });
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
      errorData
    );
  }

  const responseText = await res.text();
  if (!responseText) {
    throw new YouTubeValidationError("YouTube API response is empty", url.toString());
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
      { cause: error }
    );
  }
}

export async function fetchYouTubeVideos({
  videoIds,
  part = ["snippet", "contentDetails", "statistics"],
  ...options
}: YouTubeVideoFetchOptions): Promise<YouTubeAPIResult<YouTubeVideoListResponse>> {
  const params = {
    part: part.join(","),
    id: videoIds.join(","),
    maxResults: 50, // YouTube API max for videos endpoint
  };

  return makeYouTubeAPIRequest<YouTubeVideoListResponse>(
    "videos",
    params,
    options,
    YouTubeVideoListResponseSchema
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
  ...options
}: YouTubeSearchOptions): Promise<YouTubeAPIResult<YouTubeSearchListResponse>> {
  const params: Record<string, string | number | boolean | undefined> = {
    part: "snippet",
    type,
    maxResults,
    order,
    regionCode,
    channelType,
  };

  if (q) params.q = q;
  if (channelId) params.channelId = channelId;
  if (publishedAfter) params.publishedAfter = publishedAfter.toISOString();
  if (publishedBefore) params.publishedBefore = publishedBefore.toISOString();

  return makeYouTubeAPIRequest<YouTubeSearchListResponse>(
    "search",
    params,
    options,
    YouTubeSearchListResponseSchema
  );
}

async function getChannelIdFromHandle(
  handle: string,
  options: YouTubeAPIOptions,
): Promise<string> {
  options.logger?.info(`Fetching channel ID for handle: ${handle}`);

  const params = {
    part: 'snippet',
    type: 'channel',
    q: handle,
    maxResults: 1,
  };

  const searchResult = await makeYouTubeAPIRequest<YouTubeSearchListResponse>(
    'search',
    params,
    options,
    YouTubeSearchListResponseSchema,
  );

  if (
    !searchResult.wasModified ||
    !searchResult.data ||
    searchResult.data.items.length === 0
  ) {
    throw new YouTubeError(`Could not find channel with handle: ${handle}`);
  }

  const channel = searchResult.data.items[0];
  if (!channel.id.channelId) {
    throw new YouTubeError(`Could not find channel with handle: ${handle}`);
  }

  return channel.id.channelId;
}

export async function fetchChannelVideos({
  channelId,
  channelHandle,
  maxResults = 25,
  order = "date",
  publishedAfter,
  publishedBefore,
  ...options
}: YouTubeChannelVideoFetchOptions): Promise<YouTubeAPIResult<YouTubeSearchListResponse>> {
  if (!channelId && !channelHandle) {
    throw new YouTubeError("Either channelId or channelHandle must be provided");
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
    ...options,
  };

  return searchYouTubeVideos(searchOptions);
}

export function transformYouTubeVideoToVideo(ytVideo: YouTubeVideo): Video {
  if (!ytVideo.snippet) {
    throw new YouTubeValidationError("YouTube video missing snippet data", ytVideo.id);
  }

  return VideoSchema.parse({
    id: ytVideo.id,
    title: ytVideo.snippet.title,
    description: ytVideo.snippet.description,
    url: `https://www.youtube.com/watch?v=${ytVideo.id}`,
    publishedAt: ytVideo.snippet.publishedAt,
    duration: ytVideo.contentDetails?.duration || "PT0S",
    channelId: ytVideo.snippet.channelId,
    channelTitle: ytVideo.snippet.channelTitle,
    thumbnails: ytVideo.snippet.thumbnails,
    tags: ytVideo.snippet.tags,
    categoryId: ytVideo.snippet.categoryId,
    viewCount: ytVideo.statistics?.viewCount,
    likeCount: ytVideo.statistics?.likeCount,
    commentCount: ytVideo.statistics?.commentCount,
    liveBroadcastContent: ytVideo.snippet.liveBroadcastContent,
    defaultLanguage: ytVideo.snippet.defaultLanguage,
  });
}

export function transformYouTubeVideosToVideos(ytVideos: YouTubeVideo[]): Video[] {
  return ytVideos.map(transformYouTubeVideoToVideo);
}