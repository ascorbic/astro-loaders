// packages/bilibili/src/bilibili-loader.ts
import type { Loader } from "astro/loaders";
import {
  VideoSchema,
  PlaylistSchema,
  ArticleSchema,
  type Video,
  type Playlist,
  type Article,
} from "./schema.js";
import {
  fetchBilibiliVideo,
  fetchBilibiliPlaylist,
  fetchBilibiliArticle,
  transformBilibiliVideoToVideo,
  transformBilibiliPlaylistToPlaylist,
  transformBilibiliArticleToArticle,
} from "./bilibili-api-util.js";

// Base loader options
interface BilibiliBaseLoaderOptions {
  /** Maximum number of results to fetch (default: 25) */
  maxResults?: number;
  /** Additional request options */
  requestOptions?: RequestInit;
}

// Discriminated union for different loader types
export interface BilibiliVideosLoaderOptions extends BilibiliBaseLoaderOptions {
  type: "videos";
  bvids: string[];
}

export interface BilibiliVideoLoaderOptions extends BilibiliBaseLoaderOptions {
  type: "video";
  bvid: string;
}

export interface BilibiliPlaylistLoaderOptions extends BilibiliBaseLoaderOptions {
  type: "playlist";
  fid: string; // 收藏夹 ID
}

export interface BilibiliArticleLoaderOptions extends BilibiliBaseLoaderOptions {
  type: "article";
  cvid: string; // 文章 ID
}

export type BilibiliLoaderOptions =
  | BilibiliVideosLoaderOptions
  | BilibiliVideoLoaderOptions
  | BilibiliPlaylistLoaderOptions
  | BilibiliArticleLoaderOptions;

export function bilibiliLoader(
  options: BilibiliLoaderOptions & { fetchFullDetails?: boolean },
): Loader {
  const {
    type,
    maxResults = 25,
    requestOptions = {},
    fetchFullDetails = true,
  } = options;

  return {
    name: "bilibili-loader",
    load: async ({ store, logger, parseData, meta }) => {
      logger.info(`Loading Bilibili ${type} content`);

      const apiOptions = {
        requestOptions,
        meta,
        logger,
        fetchFullDetails,
      };

      let items: (Video | Playlist | Article)[] = [];

      try {
        if (options.type === "video") {
          logger.info(`Fetching Bilibili video: ${options.bvid}`);
          const { data, wasModified } = await fetchBilibiliVideo({
            bvid: options.bvid,
            ...apiOptions,
          });

          if (!wasModified) {
            return;
          }

          const video = transformBilibiliVideoToVideo(data);
          items = [video];
        } else if (options.type === "videos") {
          logger.info(`Fetching ${options.bvids.length} Bilibili videos`);

          for (const bvid of options.bvids.slice(0, maxResults)) {
            try {
              const { data, wasModified } = await fetchBilibiliVideo({
                bvid,
                ...apiOptions,
              });

              if (wasModified) {
                const video = transformBilibiliVideoToVideo(data);
                items.push(video);
              }
            } catch (error) {
              logger.warn(`Failed to fetch video ${bvid}: ${error}`);
            }
          }
        } else if (options.type === "playlist") {
          logger.info(`Fetching Bilibili playlist: ${options.fid}`);
          const { data, wasModified } = await fetchBilibiliPlaylist({
            fid: options.fid,
            ...apiOptions,
          });

          if (!wasModified) {
            return;
          }

          const playlist = transformBilibiliPlaylistToPlaylist(data);
          items = [playlist];
        } else if (options.type === "article") {
          logger.info(`Fetching Bilibili article: ${options.cvid}`);
          const { data, wasModified } = await fetchBilibiliArticle({
            cvid: options.cvid,
            ...apiOptions,
          });

          if (!wasModified) {
            return;
          }

          const article = transformBilibiliArticleToArticle(data);
          items = [article];
        }

        // Clear existing data
        store.clear();

        // Store items
        for (const item of items) {
          const id = item.id;
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(item))
          );

          const parsed = await parseData({
            id,
            data: item,
          });

          await store.set({
            id,
            data: parsed,
            digest: Array.from(new Uint8Array(digest))
              .map(b => b.toString(16).padStart(2, "0"))
              .join(""),
          });
        }

        logger.info(`Stored ${items.length} Bilibili ${type} items`);
      } catch (error) {
        logger.error(`Failed to load Bilibili ${type}: ${error}`);
        throw error;
      }
    },
  };
}