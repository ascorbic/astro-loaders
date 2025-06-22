import { describe, it, expect, beforeEach, vi } from "vitest";
import { authorFeedLoader } from "../src/index.js";

// Mock the AtpAgent and RichText
vi.mock("@atproto/api", async () => {
  const actual = await vi.importActual("@atproto/api");
  return {
    ...actual,
    AtpAgent: vi.fn().mockImplementation(() => ({
      getAuthorFeed: vi.fn()
    }))
  };
});

import { AtpAgent } from "@atproto/api";

const mockStore = {
  data: new Map(),
  clear() {
    this.data.clear();
  },
  set({ id, data, rendered }: { id: string; data: any; rendered: any }) {
    this.data.set(id, { data, rendered });
  },
  get(id: string) {
    return this.data.get(id);
  },
  has(id: string) {
    return this.data.has(id);
  },
  keys() {
    return this.data.keys();
  },
  values() {
    return Array.from(this.data.values());
  },
  entries() {
    return Array.from(this.data.entries());
  },
  delete(id: string) {
    return this.data.delete(id);
  },
  addModuleImport: vi.fn()
};

const mockMeta = {
  data: new Map(),
  get(key: string) {
    return this.data.get(key);
  },
  set(key: string, value: any) {
    this.data.set(key, value);
  },
  has(key: string) {
    return this.data.has(key);
  },
  delete(key: string) {
    return this.data.delete(key);
  }
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  options: { dest: 1, level: "info" },
  label: "test",
  fork: vi.fn()
};

const mockParseData = async ({ data }: { data: any }) => data;

describe("Bluesky Loader", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should create loader with correct name and schema", () => {
      const loader = authorFeedLoader({ identifier: "test.bsky.social" });
      
      expect(loader.name).toBe("bluesky-loader");
      expect(loader.schema).toBeDefined();
    });

    it("should handle basic author feed loading", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [
            {
              post: {
                uri: "at://did:plc:test123/app.bsky.feed.post/abc123",
                cid: "bafytest123",
                author: {
                  did: "did:plc:test123",
                  handle: "test.bsky.social",
                  displayName: "Test User",
                  avatar: "https://example.com/avatar.jpg",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T12:00:00.000Z",
                  text: "Hello, Bluesky!"
                },
                replyCount: 0,
                repostCount: 5,
                likeCount: 10,
                quoteCount: 1,
                indexedAt: "2023-01-01T12:00:00.000Z"
              }
            }
          ],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ identifier: "test.bsky.social" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "test.bsky.social",
        filter: undefined,
        cursor: undefined,
        limit: 100
      });

      expect(mockStore.data.size).toBe(1);
      expect(mockMeta.get("lastFetched")).toBe("bafytest123");
      
      const post = mockStore.get("at://did:plc:test123/app.bsky.feed.post/abc123");
      expect(post).toBeDefined();
      expect(post.data.author.handle).toBe("test.bsky.social");
      expect(post.data.record.text).toBe("Hello, Bluesky!");
      expect(post.rendered.html).toContain("Hello, Bluesky!");
    });

    it("should handle multiple posts", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/post1",
                cid: "bafypost1",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T12:00:00.000Z",
                  text: "First post",
                  langs: ["en"]
                },
                replyCount: 2,
                repostCount: 5,
                likeCount: 15,
                quoteCount: 3,
                indexedAt: "2023-01-01T12:00:00.000Z"
              }
            },
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/post2",
                cid: "bafypost2",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T11:00:00.000Z",
                  text: "Second post",
                  langs: ["en"]
                },
                replyCount: 0,
                repostCount: 1,
                likeCount: 8,
                quoteCount: 0,
                indexedAt: "2023-01-01T11:00:00.000Z"
              }
            }
          ],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ identifier: "user1.bsky.social" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockStore.data.size).toBe(2);
      expect(mockMeta.get("lastFetched")).toBe("bafypost1");
      
      const firstPost = mockStore.get("at://did:plc:user1/app.bsky.feed.post/post1");
      expect(firstPost).toBeDefined();
      expect(firstPost.data.replyCount).toBe(2);
      expect(firstPost.data.likeCount).toBe(15);

      const secondPost = mockStore.get("at://did:plc:user1/app.bsky.feed.post/post2");
      expect(secondPost).toBeDefined();
      expect(secondPost.data.likeCount).toBe(8);
    });
  });

  describe("Incremental loading", () => {
    it("should stop loading when encountering lastFetched post", async () => {
      mockMeta.set("lastFetched", "bafypost2");

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/post3",
                cid: "bafypost3",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T13:00:00.000Z",
                  text: "New post"
                },
                replyCount: 0,
                repostCount: 0,
                likeCount: 1,
                quoteCount: 0,
                indexedAt: "2023-01-01T13:00:00.000Z"
              }
            },
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/post2",
                cid: "bafypost2",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T11:00:00.000Z",
                  text: "Previously fetched post"
                },
                replyCount: 0,
                repostCount: 0,
                likeCount: 3,
                quoteCount: 0,
                indexedAt: "2023-01-01T11:00:00.000Z"
              }
            }
          ],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ identifier: "user1.bsky.social" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockStore.data.size).toBe(1);
      expect(mockStore.has("at://did:plc:user1/app.bsky.feed.post/post3")).toBe(true);
      expect(mockStore.has("at://did:plc:user1/app.bsky.feed.post/post2")).toBe(false);
      expect(mockMeta.get("lastFetched")).toBe("bafypost3");
    });

    it("should update lastFetched with the most recent post", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/newest",
                cid: "bafynewest",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T15:00:00.000Z",
                  text: "Newest post"
                },
                replyCount: 0,
                repostCount: 0,
                likeCount: 10,
                quoteCount: 0,
                indexedAt: "2023-01-01T15:00:00.000Z"
              }
            }
          ],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      expect(mockMeta.get("lastFetched")).toBeUndefined();

      const loader = authorFeedLoader({ identifier: "user1.bsky.social" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockMeta.get("lastFetched")).toBe("bafynewest");
    });
  });

  describe("Pagination and limits", () => {
    it("should respect limit parameter", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/post1",
                cid: "bafypost1",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T12:00:00.000Z",
                  text: "First post"
                },
                replyCount: 0,
                repostCount: 0,
                likeCount: 5,
                quoteCount: 0,
                indexedAt: "2023-01-01T12:00:00.000Z"
              }
            },
            {
              post: {
                uri: "at://did:plc:user1/app.bsky.feed.post/post2",
                cid: "bafypost2",
                author: {
                  did: "did:plc:user1",
                  handle: "user1.bsky.social",
                  displayName: "User One",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T11:00:00.000Z",
                  text: "Second post"
                },
                replyCount: 0,
                repostCount: 0,
                likeCount: 3,
                quoteCount: 0,
                indexedAt: "2023-01-01T11:00:00.000Z"
              }
            }
          ],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ 
        identifier: "user1.bsky.social",
        limit: 1
      });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockStore.data.size).toBe(1);
      expect(mockStore.has("at://did:plc:user1/app.bsky.feed.post/post1")).toBe(true);
      expect(mockStore.has("at://did:plc:user1/app.bsky.feed.post/post2")).toBe(false);
      expect(mockMeta.get("lastFetched")).toBe("bafypost1");
    });

    it("should pass filter parameter to API", async () => {
      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ 
        identifier: "user1.bsky.social",
        filter: "posts_no_replies"
      });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockGetAuthorFeed).toHaveBeenCalledWith({
        actor: "user1.bsky.social",
        filter: "posts_no_replies",
        cursor: undefined,
        limit: 100
      });
      expect(mockStore.data.size).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("should handle errors gracefully", async () => {
      const mockGetAuthorFeed = vi.fn().mockRejectedValue(new Error("Network error"));

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ identifier: "test.bsky.social" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      } as any);

      expect(mockStore.data.size).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to load Bluesky posts. Network error"
      );
    });

    it("should handle parseData errors gracefully", async () => {
      const failingParseData = async () => {
        throw new Error("Parse data failed");
      };

      const mockGetAuthorFeed = vi.fn().mockResolvedValue({
        data: {
          feed: [
            {
              post: {
                uri: "at://did:plc:test123/app.bsky.feed.post/abc123",
                cid: "bafytest123",
                author: {
                  did: "did:plc:test123",
                  handle: "test.bsky.social",
                  displayName: "Test User",
                  createdAt: "2023-01-01T00:00:00.000Z"
                },
                record: {
                  $type: "app.bsky.feed.post",
                  createdAt: "2023-01-01T12:00:00.000Z",
                  text: "Hello, Bluesky!"
                },
                replyCount: 0,
                repostCount: 0,
                likeCount: 0,
                quoteCount: 0,
                indexedAt: "2023-01-01T12:00:00.000Z"
              }
            }
          ],
          cursor: null
        }
      });

      (AtpAgent as any).mockImplementation(() => ({
        getAuthorFeed: mockGetAuthorFeed
      }));

      const loader = authorFeedLoader({ identifier: "test.bsky.social" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: failingParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load Bluesky posts")
      );
    });
  });
});