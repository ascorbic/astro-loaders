// packages/bilibili/src/index.ts
export { bilibiliLoader } from "./bilibili-loader.js";
export type {
  BilibiliLoaderOptions,
  BilibiliVideosLoaderOptions,
  BilibiliVideoLoaderOptions,
  BilibiliPlaylistLoaderOptions,
  BilibiliArticleLoaderOptions,
} from "./bilibili-loader.js";

export type {
  Video,
  Playlist,
  PlaylistItem,
  Article,
  BilibiliVideo,
  BilibiliPlaylist,
  BilibiliPlaylistItem,
  BilibiliArticle,
} from "./schema.js";

export {
  VideoSchema,
  PlaylistSchema,
  ArticleSchema,
} from "./schema.js";