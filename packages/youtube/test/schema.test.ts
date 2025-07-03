import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  YouTubeVideoListResponseSchema,
  YouTubeSearchListResponseSchema,
  VideoSchema,
} from "../src/schema.js";
import { transformYouTubeVideoToVideo } from "../src/youtube-api-util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("YouTube Schema Validation", () => {
  describe("YouTubeVideoListResponseSchema", () => {
    it("should validate valid video list response", () => {
      const videosResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-videos-response.json"), "utf-8")
      );

      const result = YouTubeVideoListResponseSchema.safeParse(videosResponse);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.kind).toBe("youtube#videoListResponse");
        expect(result.data.items).toHaveLength(5);
        expect(result.data.items[0].id).toBe("JIOPB36ALMM");
        expect(result.data.items[0].snippet?.title).toBe("Rick Astley - abcdefu (GAYLE Cover)");
      }
    });

    it("should reject invalid video list response", () => {
      const invalidResponse = {
        kind: "invalid#kind",
        items: []
      };

      const result = YouTubeVideoListResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe("YouTubeSearchListResponseSchema", () => {
    it("should validate valid search response", () => {
      const searchResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-search-response.json"), "utf-8")
      );

      const result = YouTubeSearchListResponseSchema.safeParse(searchResponse);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.kind).toBe("youtube#searchListResponse");
        expect(result.data.items).toHaveLength(5);
        expect(result.data.items[0].id.videoId).toBe("JIOPB36ALMM");
      }
    });
  });

  describe("Video transformation", () => {
    it("should transform YouTube video to internal Video format", () => {
      const videosResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-videos-response.json"), "utf-8")
      );

      const youtubeVideo = videosResponse.items[0];
      const video = transformYouTubeVideoToVideo(youtubeVideo);

      expect(video.id).toBe("JIOPB36ALMM");
      expect(video.title).toBe("Rick Astley - abcdefu (GAYLE Cover)");
      expect(video.url).toBe("https://www.youtube.com/watch?v=JIOPB36ALMM");
      expect(video.channelId).toBe("UCuAXFkgsw1L7xaCfnd5JJOw");
      expect(video.channelTitle).toBe("Rick Astley");
      expect(video.duration).toBe("PT2M50S");
      expect(video.viewCount).toBe("1451084");
      expect(video.likeCount).toBe("85766");
      expect(video.tags).toEqual(expect.arrayContaining(["rick astley", "never going to give you up"]));
      
      // Validate the transformed video against our schema
      const schemaResult = VideoSchema.safeParse(video);
      expect(schemaResult.success).toBe(true);
    });

    it("should handle video without optional fields", () => {
      const minimalVideo = {
        kind: "youtube#video",
        etag: "test",
        id: "test123",
        snippet: {
          publishedAt: "2023-01-01T00:00:00Z",
          channelId: "test-channel",
          title: "Test Video",
          description: "Test description",
          thumbnails: {
            default: {
              url: "https://example.com/thumb.jpg",
              width: 120,
              height: 90
            }
          },
          channelTitle: "Test Channel"
        }
      };

      const video = transformYouTubeVideoToVideo(minimalVideo);
      
      expect(video.id).toBe("test123");
      expect(video.title).toBe("Test Video");
      expect(video.duration).toBe("PT0S"); // Default value
      expect(video.tags).toBeUndefined();
      expect(video.viewCount).toBeUndefined();
      
      const schemaResult = VideoSchema.safeParse(video);
      expect(schemaResult.success).toBe(true);
    });

    it("should throw error for video without snippet", () => {
      const videoWithoutSnippet = {
        kind: "youtube#video",
        etag: "test",
        id: "test123"
      };

      expect(() => transformYouTubeVideoToVideo(videoWithoutSnippet)).toThrow();
    });
  });

  describe("Edge cases", () => {
    it("should handle YouTube duration formats", () => {
      const testCases = [
        { duration: "PT4M13S", expectedSeconds: 253 },
        { duration: "PT1H23M45S", expectedSeconds: 5025 },
        { duration: "PT30S", expectedSeconds: 30 },
        { duration: "PT2M", expectedSeconds: 120 },
        { duration: "PT1H", expectedSeconds: 3600 }
      ];

      testCases.forEach(({ duration }) => {
        const video = {
          id: "test",
          title: "Test",
          description: "Test",
          url: "https://youtube.com/watch?v=test",
          publishedAt: new Date(),
          duration,
          channelId: "test",
          channelTitle: "Test",
          thumbnails: {
            default: {
              url: "https://example.com/thumb.jpg",
              width: 120,
              height: 90
            }
          }
        };

        const result = VideoSchema.safeParse(video);
        expect(result.success).toBe(true);
      });
    });

    it("should handle various thumbnail configurations", () => {
      const thumbnailConfigs = [
        // Only default
        { default: { url: "test.jpg", width: 120, height: 90 } },
        // All sizes
        {
          default: { url: "test.jpg", width: 120, height: 90 },
          medium: { url: "test.jpg", width: 320, height: 180 },
          high: { url: "test.jpg", width: 480, height: 360 },
          standard: { url: "test.jpg", width: 640, height: 480 },
          maxres: { url: "test.jpg", width: 1280, height: 720 }
        },
        // Missing some sizes
        {
          default: { url: "test.jpg", width: 120, height: 90 },
          high: { url: "test.jpg", width: 480, height: 360 }
        }
      ];

      thumbnailConfigs.forEach((thumbnails, index) => {
        const video = {
          id: `test${index}`,
          title: "Test",
          description: "Test",
          url: `https://youtube.com/watch?v=test${index}`,
          publishedAt: new Date(),
          duration: "PT1M",
          channelId: "test",
          channelTitle: "Test",
          thumbnails
        };

        const result = VideoSchema.safeParse(video);
        expect(result.success).toBe(true);
      });
    });
  });
});