import { describe, it, expect } from "vitest";
import { PostSchema } from "../src/schema.js";

describe("Schema Validation", () => {
  const validPost = {
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
      text: "Hello, Bluesky!",
      langs: ["en"]
    },
    replyCount: 0,
    repostCount: 5,
    likeCount: 10,
    quoteCount: 1,
    indexedAt: "2023-01-01T12:00:00.000Z"
  };

  describe("Basic Post Validation", () => {
    it("should validate a basic valid post", () => {
      const result = PostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it("should require required fields", () => {
      const invalidPost = { ...validPost };
      delete (invalidPost as any).uri;

      const result = PostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should validate author object", () => {
      const invalidPost = {
        ...validPost,
        author: {
          ...validPost.author,
          handle: 123 // invalid type
        }
      };

      const result = PostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should validate record object", () => {
      const invalidPost = {
        ...validPost,
        record: {
          ...validPost.record,
          $type: "invalid.type" // wrong type
        }
      };

      const result = PostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should validate numeric fields are non-negative", () => {
      const invalidPost = {
        ...validPost,
        likeCount: -1
      };

      const result = PostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should validate datetime fields", () => {
      const invalidPost = {
        ...validPost,
        indexedAt: "not-a-date"
      };

      const result = PostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });
  });

  describe("Optional Fields", () => {
    it("should allow missing optional fields", () => {
      const minimalPost = {
        uri: validPost.uri,
        cid: validPost.cid,
        author: {
          did: validPost.author.did,
          handle: validPost.author.handle,
          displayName: validPost.author.displayName,
          createdAt: validPost.author.createdAt
        },
        record: {
          $type: validPost.record.$type,
          createdAt: validPost.record.createdAt
        },
        replyCount: validPost.replyCount,
        repostCount: validPost.repostCount,
        likeCount: validPost.likeCount,
        quoteCount: validPost.quoteCount,
        indexedAt: validPost.indexedAt
      };

      const result = PostSchema.safeParse(minimalPost);
      expect(result.success).toBe(true);
    });

    it("should validate avatar URL when present", () => {
      const postWithInvalidAvatar = {
        ...validPost,
        author: {
          ...validPost.author,
          avatar: "not-a-url"
        }
      };

      const result = PostSchema.safeParse(postWithInvalidAvatar);
      expect(result.success).toBe(false);
    });
  });

  describe("Embed Validation", () => {
    it("should validate image embeds", () => {
      const postWithImages = {
        ...validPost,
        embed: {
          $type: "app.bsky.embed.images#view",
          images: [
            {
              thumb: "https://example.com/thumb.jpg",
              fullsize: "https://example.com/full.jpg",
              alt: "A beautiful sunset"
            }
          ]
        }
      };

      const result = PostSchema.safeParse(postWithImages);
      expect(result.success).toBe(true);
    });

    it("should validate external embeds", () => {
      const postWithExternal = {
        ...validPost,
        embed: {
          $type: "app.bsky.embed.external#view",
          external: {
            uri: "https://example.com/article",
            title: "Amazing Article",
            description: "This is an amazing article",
            thumb: "https://example.com/thumb.jpg"
          }
        }
      };

      const result = PostSchema.safeParse(postWithExternal);
      expect(result.success).toBe(true);
    });

    it("should validate record embeds", () => {
      const postWithRecord = {
        ...validPost,
        embed: {
          $type: "app.bsky.embed.record#view",
          record: {
            uri: "at://did:plc:other/app.bsky.feed.post/quoted",
            cid: "bafyquoted123",
            author: {
              did: "did:plc:other",
              handle: "other.bsky.social",
              displayName: "Other User"
            },
            value: {
              $type: "app.bsky.feed.post",
              createdAt: "2023-01-01T10:00:00.000Z",
              text: "Original post"
            }
          }
        }
      };

      const result = PostSchema.safeParse(postWithRecord);
      expect(result.success).toBe(true);
    });

    it("should handle unknown embed types", () => {
      const postWithUnknownEmbed = {
        ...validPost,
        embed: {
          $type: "app.bsky.embed.unknown",
          someData: "arbitrary data"
        }
      };

      const result = PostSchema.safeParse(postWithUnknownEmbed);
      expect(result.success).toBe(true);
    });
  });

  describe("Facets Validation", () => {
    it("should validate mention facets", () => {
      const postWithMention = {
        ...validPost,
        record: {
          ...validPost.record,
          text: "Hey @alice!",
          facets: [
            {
              index: { byteStart: 4, byteEnd: 10 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#mention",
                  did: "did:plc:alice123"
                }
              ]
            }
          ]
        }
      };

      const result = PostSchema.safeParse(postWithMention);
      expect(result.success).toBe(true);
    });

    it("should validate link facets", () => {
      const postWithLink = {
        ...validPost,
        record: {
          ...validPost.record,
          text: "Visit https://example.com",
          facets: [
            {
              index: { byteStart: 6, byteEnd: 25 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#link",
                  uri: "https://example.com"
                }
              ]
            }
          ]
        }
      };

      const result = PostSchema.safeParse(postWithLink);
      expect(result.success).toBe(true);
    });

    it("should validate tag facets", () => {
      const postWithTag = {
        ...validPost,
        record: {
          ...validPost.record,
          text: "Check out #bluesky",
          facets: [
            {
              index: { byteStart: 10, byteEnd: 18 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#tag",
                  tag: "bluesky"
                }
              ]
            }
          ]
        }
      };

      const result = PostSchema.safeParse(postWithTag);
      expect(result.success).toBe(true);
    });

    it("should validate facet byte ranges", () => {
      const postWithInvalidRange = {
        ...validPost,
        record: {
          ...validPost.record,
          facets: [
            {
              index: { byteStart: -1, byteEnd: 10 }, // negative start
              features: [
                {
                  $type: "app.bsky.richtext.facet#tag",
                  tag: "test"
                }
              ]
            }
          ]
        }
      };

      const result = PostSchema.safeParse(postWithInvalidRange);
      expect(result.success).toBe(false);
    });
  });

  describe("Reply Validation", () => {
    it("should validate reply structure", () => {
      const replyPost = {
        ...validPost,
        record: {
          ...validPost.record,
          reply: {
            parent: {
              cid: "bafyparent123",
              uri: "at://did:plc:other/app.bsky.feed.post/parent"
            },
            root: {
              cid: "bafyroot123",
              uri: "at://did:plc:other/app.bsky.feed.post/root"
            }
          }
        }
      };

      const result = PostSchema.safeParse(replyPost);
      expect(result.success).toBe(true);
    });

    it("should require both parent and root in reply", () => {
      const invalidReply = {
        ...validPost,
        record: {
          ...validPost.record,
          reply: {
            parent: {
              cid: "bafyparent123",
              uri: "at://did:plc:other/app.bsky.feed.post/parent"
            }
            // missing root
          }
        }
      };

      const result = PostSchema.safeParse(invalidReply);
      expect(result.success).toBe(false);
    });
  });

  describe("Author Associated Data", () => {
    it("should validate author chat settings", () => {
      const postWithChatSettings = {
        ...validPost,
        author: {
          ...validPost.author,
          associated: {
            chat: {
              allowIncoming: "following" as const
            }
          }
        }
      };

      const result = PostSchema.safeParse(postWithChatSettings);
      expect(result.success).toBe(true);
    });

    it("should validate chat allowIncoming enum values", () => {
      const postWithInvalidChatSetting = {
        ...validPost,
        author: {
          ...validPost.author,
          associated: {
            chat: {
              allowIncoming: "invalid" as any
            }
          }
        }
      };

      const result = PostSchema.safeParse(postWithInvalidChatSetting);
      expect(result.success).toBe(false);
    });
  });
});