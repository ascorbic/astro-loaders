import {
  AtpAgent,
  type AppBskyFeedGetAuthorFeed,
  type AppBskyFeedDefs,
} from "@atproto/api";
import type { LiveLoader } from "astro/loaders";
import { renderPostAsHtml } from "./utils.js";

export interface LiveBlueskyLoaderOptions {
  identifier?: string;
  service?: string;
}

export interface CollectionFilter {
  limit?: number;
  since?: Date;
  until?: Date;
  type?: AppBskyFeedGetAuthorFeed.QueryParams["filter"];
  identifier?: string;
}

export interface EntryFilter {
  id?: string;
}

export class BlueskyError extends Error {
  constructor(
    message: string,
    public code?: string,
    public identifier?: string,
  ) {
    super(message);
    this.name = "BlueskyError";
  }
}

export function liveBlueskyLoader(
  options: LiveBlueskyLoaderOptions = {},
): LiveLoader<
  AppBskyFeedDefs.PostView,
  EntryFilter,
  CollectionFilter,
  BlueskyError
> {
  const {
    identifier: defaultIdentifier,
    service = "https://public.api.bsky.app",
  } = options;

  return {
    name: "live-bluesky-loader",

    loadCollection: async ({ filter }) => {
      try {
        const identifier = filter?.identifier || defaultIdentifier;

        if (!identifier) {
          return {
            error: new BlueskyError(
              "Identifier must be provided either in loader options or collection filter",
              "MISSING_IDENTIFIER",
            ),
          };
        }

        const agent = new AtpAgent({ service });

        let cursor = undefined;
        let allPosts: AppBskyFeedDefs.PostView[] = [];
        let count = 0;

        do {
          const { data } = await agent.getAuthorFeed({
            actor: identifier,
            filter: filter?.type,
            cursor,
            limit: 100,
          });

          for (const { post } of data.feed) {
            // Apply collection filters
            if (filter?.limit && count >= filter.limit) {
              break;
            }

            if (filter?.since) {
              const postDate = new Date(post.indexedAt);
              if (postDate < filter.since) {
                continue;
              }
            }

            if (filter?.until) {
              const postDate = new Date(post.indexedAt);
              if (postDate > filter.until) {
                continue;
              }
            }

            allPosts.push(post);
            count++;
          }

          cursor = data.cursor;
        } while (cursor && (!filter?.limit || count < filter.limit));

        return {
          entries: allPosts.map((post) => ({
            id: post.uri,
            data: post,
            rendered: {
              html: renderPostAsHtml(post),
            },
          })),
        };
      } catch (error) {
        const identifier = filter?.identifier || defaultIdentifier;
        return {
          error: new BlueskyError(
            `Failed to load Bluesky posts for ${identifier || "unknown"}`,
            "COLLECTION_LOAD_ERROR",
            identifier,
          ),
        };
      }
    },

    loadEntry: async ({ filter }) => {
      try {
        const agent = new AtpAgent({ service });

        if (!filter.id) {
          return {
            error: new BlueskyError(
              "'id' must be provided in the filter",
              "INVALID_FILTER",
            ),
          };
        }

        // Validate that the ID is a full AT URI
        if (!filter.id.startsWith("at://")) {
          return {
            error: new BlueskyError(
              `Invalid ID format: '${filter.id}'. Must be a full AT URI (e.g., 'at://did:plc:user/app.bsky.feed.post/id')`,
              "INVALID_ID_FORMAT",
            ),
          };
        }

        const postUri = filter.id;

        // Fetch the post directly using getPosts
        const { data } = await agent.getPosts({ uris: [postUri] });

        const [post] = data.posts;

        if (!post) {
          return;
        }

        return {
          id: post.uri,
          data: post,
          rendered: {
            html: renderPostAsHtml(post),
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const requestedUri = filter.id || "unknown";
        return {
          error: new BlueskyError(
            `Failed to load Bluesky post '${requestedUri}': ${errorMessage}`,
            "ENTRY_LOAD_ERROR",
          ),
        };
      }
    },
  };
}
