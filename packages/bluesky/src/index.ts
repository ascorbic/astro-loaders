import { AtpAgent, type AppBskyFeedGetAuthorFeed } from "@atproto/api";
import type { Loader } from "astro/loaders";
import { renderPostAsHtml } from "./utils.js";
import { PostSchema } from "./schema.js";
export type { Post } from "./schema.js";
export { renderPostAsHtml } from "./utils.js";

/**
 * Load posts from a Bluesky author feed.
 */

export const authorFeedLoader = ({
  identifier,
  filter,
  limit,
}: {
  identifier: string;
  filter?: AppBskyFeedGetAuthorFeed.QueryParams["filter"];
  limit?: number;
}): Loader => {
  return {
    name: "bluesky-loader",
    schema: PostSchema,
    async load({ store, logger, meta, parseData }) {
      const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
      try {
        const mostRecent = meta.get("lastFetched") || 0;

        let cursor = undefined;
        let first;
        let count = 0;
        fetching: do {
          const { data } = await agent.getAuthorFeed({
            actor: identifier,
            filter,
            cursor,
            limit: 100,
          });

          for (const { post } of data.feed) {
            if (
              (mostRecent && mostRecent === post.cid) ||
              (limit && count++ >= limit)
            ) {
              break fetching;
            }
            if (!first) {
              first = post.cid;
            }

            store.set({
              id: post.uri,
              data: await parseData({
                id: post.uri,
                // Convert the post object to a plain object
                data: JSON.parse(JSON.stringify(post)),
              }),
              rendered: {
                html: renderPostAsHtml(post),
              },
            });
          }
          cursor = data.cursor;
        } while (cursor);

        if (first) {
          meta.set("lastFetched", first);
        }
      } catch (error) {
        logger.error(
          `Failed to load Bluesky posts. ${(error as Error).message}`,
        );
      }
    },
  };
};
