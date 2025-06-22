import { describe, it, expect, beforeEach, vi } from "vitest";
import { liveBlueskyLoader, BlueskyError } from "../src/live-bluesky-loader.js";
import type { AppBskyFeedDefs } from "@atproto/api";

// Mock the AtpAgent
vi.mock("@atproto/api", async () => {
  const actual = await vi.importActual("@atproto/api");
  return {
    ...actual,
    AtpAgent: vi.fn().mockImplementation(() => ({
      getAuthorFeed: vi.fn(),
      getPosts: vi.fn(),
    })),
  };
});

import { AtpAgent } from "@atproto/api";

const createMockPost = (
  overrides: Partial<AppBskyFeedDefs.PostView> = {},
): AppBskyFeedDefs.PostView => ({
  uri: "at://did:plc:test123/app.bsky.feed.post/abc123",
  cid: "bafytest123",
  author: {
    did: "did:plc:test123",
    handle: "test.bsky.social",
    displayName: "Test User",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  record: {
    $type: "app.bsky.feed.post",
    createdAt: "2023-01-01T12:00:00.000Z",
    text: "Hello, Bluesky!",
  },
  replyCount: 0,
  repostCount: 5,
  likeCount: 10,
  quoteCount: 1,
  indexedAt: "2023-01-01T12:00:00.000Z",
  ...overrides,
});

describe("Live Bluesky Loader Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Configuration Options", () => {
    it("should use default service when not specified", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: { feed: [], cursor: null },
      });

      (AtpAgent as any).mockImplementation((config: any) => {
        expect(config.service).toBe("https://public.api.bsky.app");
        return { getAuthorFeed: mockGetAuthorFeed };
      });

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      await loader.loadCollection({ filter: {} });
    });

    it("should use custom service when specified", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: { feed: [], cursor: null },
      });

      (AtpAgent as any).mockImplementation((config: any) => {
        expect(config.service).toBe("https://custom.bsky.service");
        return { getAuthorFeed: mockGetAuthorFeed };
      });

      const loader = liveBlueskyLoader({
        identifier: "test.bsky.social",
        service: "https://custom.bsky.service",
      });
      await loader.loadCollection({ filter: {} });
    });

    it("should use identifier from loader options", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: { feed: [], cursor: null },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      await loader.loadCollection({ filter: {} });

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "test.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100,
      });
    });

    it("should use identifier from collection filter when provided", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: { feed: [], cursor: null },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "default.bsky.social" });
      await loader.loadCollection({
        filter: { identifier: "override.bsky.social" },
      });

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "override.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100,
      });
    });

    it("should prioritize filter identifier over loader identifier", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: { feed: [], cursor: null },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "loader.bsky.social" });
      await loader.loadCollection({
        filter: { identifier: "filter.bsky.social" },
      });

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "filter.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100,
      });
    });

    it("should return error when no identifier provided", async () => {
      const loader = liveBlueskyLoader({}); // No identifier in options
      const result = await loader.loadCollection({ filter: {} }); // No identifier in filter

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(BlueskyError);
        expect(result.error.code).toBe("MISSING_IDENTIFIER");
        expect(result.error.message).toContain("Identifier must be provided");
      }
    });

    it("should work with no options passed", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: { feed: [], cursor: null },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader(); // No options at all
      await loader.loadCollection({
        filter: { identifier: "test.bsky.social" },
      });

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "test.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100,
      });
    });
  });

  describe("Basic Collection Loading", () => {
    it("should load collection successfully", async () => {
      const mockPost1 = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/post1",
        cid: "bafypost1",
        record: {
          $type: "app.bsky.feed.post",
          createdAt: "2023-01-01T12:00:00.000Z",
          text: "First post",
        },
        indexedAt: "2023-01-01T12:00:00.000Z",
      });

      const mockPost2 = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/post2",
        cid: "bafypost2",
        record: {
          $type: "app.bsky.feed.post",
          createdAt: "2023-01-01T11:00:00.000Z",
          text: "Second post",
        },
        indexedAt: "2023-01-01T11:00:00.000Z",
      });

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [{ post: mockPost1 }, { post: mockPost2 }],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(2);

        const firstPost = result.entries.find(
          (e) => e.id === "at://did:plc:test123/app.bsky.feed.post/post1",
        );
        expect(firstPost).toBeDefined();
        expect(firstPost?.data.record.text).toBe("First post");
        expect(firstPost?.rendered?.html).toContain("First post");

        const secondPost = result.entries.find(
          (e) => e.id === "at://did:plc:test123/app.bsky.feed.post/post2",
        );
        expect(secondPost).toBeDefined();
        expect(secondPost?.data.record.text).toBe("Second post");
      }

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "test.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100,
      });
    });

    it("should handle empty feed", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(0);
      }
    });

    it("should handle pagination", async () => {
      const mockPost1 = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/post1",
        cid: "bafypost1",
      });

      const mockPost2 = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/post2",
        cid: "bafypost2",
      });

      const mockGetAuthorFeed = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            feed: [{ post: mockPost1 }],
            cursor: "cursor1",
          },
        })
        .mockResolvedValueOnce({
          data: {
            feed: [{ post: mockPost2 }],
            cursor: null,
          },
        });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(2);
      }

      expect(mockGetAuthorFeed).toHaveBeenCalledTimes(2);
      expect(mockGetAuthorFeed).toHaveBeenNthCalledWith(1, {
        actor: "test.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100,
      });
      expect(mockGetAuthorFeed).toHaveBeenNthCalledWith(2, {
        actor: "test.bsky.social",
        filter: undefined,
        cursor: "cursor1",
        limit: 100,
      });
    });
  });

  describe("Collection Filtering", () => {
    it("should limit number of entries", async () => {
      const posts = Array.from({ length: 5 }, (_, i) =>
        createMockPost({
          uri: `at://did:plc:test123/app.bsky.feed.post/post${i}`,
          cid: `bafypost${i}`,
          record: {
            $type: "app.bsky.feed.post",
            createdAt: "2023-01-01T12:00:00.000Z",
            text: `Post ${i}`,
          },
        }),
      );

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: posts.map((post) => ({ post })),
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: { limit: 3 } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(3);
      }
    });

    it("should filter by date range (since)", async () => {
      const oldPost = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/old",
        cid: "bafyold",
        indexedAt: "2022-12-01T12:00:00.000Z",
      });

      const newPost = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/new",
        cid: "bafynew",
        indexedAt: "2023-02-01T12:00:00.000Z",
      });

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [{ post: newPost }, { post: oldPost }],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const since = new Date("2023-01-01T00:00:00.000Z");
      const result = await loader.loadCollection({ filter: { since } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].id).toBe(
          "at://did:plc:test123/app.bsky.feed.post/new",
        );
      }
    });

    it("should filter by date range (until)", async () => {
      const oldPost = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/old",
        cid: "bafyold",
        indexedAt: "2022-12-01T12:00:00.000Z",
      });

      const newPost = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/new",
        cid: "bafynew",
        indexedAt: "2023-02-01T12:00:00.000Z",
      });

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [{ post: newPost }, { post: oldPost }],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const until = new Date("2023-01-01T00:00:00.000Z");
      const result = await loader.loadCollection({ filter: { until } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].id).toBe(
          "at://did:plc:test123/app.bsky.feed.post/old",
        );
      }
    });

    it("should filter by date range (since and until)", async () => {
      const posts = [
        createMockPost({
          uri: "at://did:plc:test123/app.bsky.feed.post/too-old",
          cid: "bafytooold",
          indexedAt: "2022-12-01T12:00:00.000Z",
        }),
        createMockPost({
          uri: "at://did:plc:test123/app.bsky.feed.post/in-range",
          cid: "bafyinrange",
          indexedAt: "2023-01-15T12:00:00.000Z",
        }),
        createMockPost({
          uri: "at://did:plc:test123/app.bsky.feed.post/too-new",
          cid: "bafytoonew",
          indexedAt: "2023-03-01T12:00:00.000Z",
        }),
      ];

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: posts.map((post) => ({ post })),
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const since = new Date("2023-01-01T00:00:00.000Z");
      const until = new Date("2023-02-01T00:00:00.000Z");
      const result = await loader.loadCollection({ filter: { since, until } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].id).toBe(
          "at://did:plc:test123/app.bsky.feed.post/in-range",
        );
      }
    });
  });

  describe("Entry Loading", () => {
    it("should load single entry by ID", async () => {
      const targetPost = createMockPost({
        uri: "at://did:plc:test123/app.bsky.feed.post/target",
        cid: "bafytarget",
        record: {
          $type: "app.bsky.feed.post",
          createdAt: "2023-01-01T12:00:00.000Z",
          text: "Target post",
        },
      });

      const mockGetPosts = vi.fn().mockResolvedValue({
        data: {
          posts: [targetPost],
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getPosts: mockGetPosts,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadEntry({
        filter: { id: "at://did:plc:test123/app.bsky.feed.post/target" },
      });

      expect(result).toBeDefined();
      if (result && "data" in result) {
        expect(result.id).toBe(
          "at://did:plc:test123/app.bsky.feed.post/target",
        );
        expect(result.data.record.text).toBe("Target post");
        expect(result.rendered?.html).toContain("Target post");
      }

      expect(mockGetPosts).toHaveBeenCalledWith({
        uris: ["at://did:plc:test123/app.bsky.feed.post/target"],
      });
    });

    it("should return error for non-AT-URI ID", async () => {
      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadEntry({
        filter: { id: "bafytarget" }, // Just CID without full URI
      });

      expect(result).toBeDefined();
      if (result && "error" in result) {
        expect(result.error).toBeInstanceOf(BlueskyError);
        expect(result.error.code).toBe("INVALID_ID_FORMAT");
        expect(result.error.message).toContain("bafytarget");
        expect(result.error.message).toContain("Must be a full AT URI");
      }
    });

    it("should return undefined for non-existent entry", async () => {
      const mockGetPosts = vi.fn().mockResolvedValue({
        data: {
          posts: [],
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getPosts: mockGetPosts,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadEntry({
        filter: { id: "at://did:plc:test123/app.bsky.feed.post/nonexistent" },
      });

      expect(result).toBeUndefined();
      expect(mockGetPosts).toHaveBeenCalledWith({
        uris: ["at://did:plc:test123/app.bsky.feed.post/nonexistent"],
      });
    });

    it("should return error for missing filter", async () => {
      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadEntry({
        filter: {}, // No id provided
      });

      expect(result).toBeDefined();
      if (result && "error" in result) {
        expect(result.error).toBeInstanceOf(BlueskyError);
        expect(result.error.code).toBe("INVALID_FILTER");
      }
    });
  });

  describe("Error Handling", () => {
    it("should return BlueskyError for collection loading failure", async () => {
      const mockGetAuthorFeed = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(BlueskyError);
        expect(result.error.code).toBe("COLLECTION_LOAD_ERROR");
        expect(result.error.identifier).toBe("test.bsky.social");
        expect(result.error.message).toContain(
          "Failed to load Bluesky posts for test.bsky.social",
        );
      }
    });

    it("should return BlueskyError for entry loading failure", async () => {
      const mockGetPosts = vi.fn().mockRejectedValue(new Error("API error"));

      (AtpAgent as any).mockImplementation(() => ({
        getPosts: mockGetPosts,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadEntry({
        filter: { id: "at://did:plc:test123/app.bsky.feed.post/test" },
      });

      expect(result).toBeDefined();
      if (result && "error" in result) {
        expect(result.error).toBeInstanceOf(BlueskyError);
        expect(result.error.code).toBe("ENTRY_LOAD_ERROR");
      }
    });

    it("should handle malformed response gracefully", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          // Missing feed property
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(BlueskyError);
      }
    });
  });

  describe("Rich Text Rendering", () => {
    it("should render posts with links", async () => {
      const postWithLinks = createMockPost({
        record: {
          $type: "app.bsky.feed.post",
          createdAt: "2023-01-01T12:00:00.000Z",
          text: "Check out https://example.com",
          facets: [
            {
              index: { byteStart: 10, byteEnd: 29 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#link",
                  uri: "https://example.com",
                },
              ],
            },
          ],
        },
      });

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [{ post: postWithLinks }],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(1);
        const entry = result.entries[0];
        expect(entry.rendered?.html).toContain(
          '<a href="https://example.com">',
        );
      }
    });

    it("should render posts with mentions", async () => {
      const postWithMentions = createMockPost({
        record: {
          $type: "app.bsky.feed.post",
          createdAt: "2023-01-01T12:00:00.000Z",
          text: "Hello @alice.bsky.social!",
          facets: [
            {
              index: { byteStart: 6, byteEnd: 24 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#mention",
                  did: "did:plc:alice123",
                },
              ],
            },
          ],
        },
      });

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [{ post: postWithMentions }],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({ identifier: "test.bsky.social" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(1);
        const entry = result.entries[0];
        expect(entry.rendered?.html).toContain(
          'href="https://bsky.app/profile/did:plc:alice123"',
        );
      }
    });
  });

  describe("Filter Options", () => {
    it("should pass filter options to API", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({
        identifier: "test.bsky.social",
      });

      await loader.loadCollection({ filter: { type: "posts_no_replies" } });

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "test.bsky.social",
        filter: "posts_no_replies",
        cursor: undefined,
        limit: 100,
      });
    });

    it("should handle posts_and_author_threads filter", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [],
          cursor: null,
        },
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed,
      }));

      const loader = liveBlueskyLoader({
        identifier: "test.bsky.social",
      });

      await loader.loadCollection({
        filter: { type: "posts_and_author_threads" },
      });

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "test.bsky.social",
        filter: "posts_and_author_threads",
        cursor: undefined,
        limit: 100,
      });
    });
  });
});
