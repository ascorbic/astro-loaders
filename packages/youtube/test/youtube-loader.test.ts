import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { youTubeLoader } from "../src/youtube-loader.js";
import { server, http, HttpResponse } from "./setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  }
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
  info: () => {},
  warn: () => {},
  error: () => {}
};

const mockParseData = async ({ data }: { data: any }) => data;

describe("YouTube Loader Integration Tests", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  describe("Video Loading by IDs", () => {
    it("should load specific videos by ID", async () => {
      const videosResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-videos-response.json"), "utf-8")
      );

      server.use(
        http.get("https://www.googleapis.com/youtube/v3/videos", ({ request }) => {
          const url = new URL(request.url);
          const ids = url.searchParams.get("id");
          const apiKey = url.searchParams.get("key");
          
          expect(apiKey).toBe("test-api-key");
          expect(ids).toBe("JIOPB36ALMM,cc91EfoBh8A,eYuUAGXN0KM,m3wzpC2o42I,E9de-cmycx8");
          
          return HttpResponse.json(videosResponse);
        })
      );

      const loader = youTubeLoader({
        type: 'videos',
        apiKey: 'test-api-key',
        videoIds: ['JIOPB36ALMM', 'cc91EfoBh8A', 'eYuUAGXN0KM', 'm3wzpC2o42I', 'E9de-cmycx8']
      });

      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(5);
      
      const rickRoll = mockStore.get("JIOPB36ALMM");
      expect(rickRoll).toBeDefined();
      expect(rickRoll.data.title).toBe("Rick Astley - abcdefu (GAYLE Cover)");
      expect(rickRoll.data.url).toBe("https://www.youtube.com/watch?v=JIOPB36ALMM");
      expect(rickRoll.data.channelTitle).toBe("Rick Astley");
      expect(rickRoll.data.duration).toBe("PT2M50S");
      expect(rickRoll.data.viewCount).toBe("1451084");
      
      const gangnam = mockStore.get("cc91EfoBh8A");
      expect(gangnam).toBeDefined();
      expect(gangnam.data.title).toBe("Rick Astley - Angels On My Side (Official Video) [4K Remaster]");
      expect(gangnam.data.channelTitle).toBe("Rick Astley");
      expect(gangnam.data.tags).toEqual(expect.arrayContaining(["Rick Astley", "Astley"]));
    });

    it("should load videos from a channel handle", async () => {
      const searchResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-search-response.json"), "utf-8")
      );
      const videosResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-videos-response.json"), "utf-8")
      );
      const channelSearchResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-channel-search-response.json"), "utf-8")
      );

      // Mock channel handle lookup
      server.use(
        http.get("https://www.googleapis.com/youtube/v3/search", ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get("q");
          const type = url.searchParams.get("type");

          if (type === 'channel' && query === '@rickastley') {
            return HttpResponse.json(channelSearchResponse);
          }

          if (type === 'video' && url.searchParams.get("channelId") === 'UCuAXFkgsw1L7xaCfnd5JJOw') {
             return HttpResponse.json(searchResponse);
          }
          
          return new HttpResponse("Not found", { status: 404 });
        })
      );

      // Mock videos API call (for detailed info)
      server.use(
        http.get("https://www.googleapis.com/youtube/v3/videos", ({ request }) => {
          const url = new URL(request.url);
          const ids = url.searchParams.get("id");
          
          expect(ids).toBe("JIOPB36ALMM,cc91EfoBh8A,eYuUAGXN0KM,m3wzpC2o42I,E9de-cmycx8");
          
          return HttpResponse.json(videosResponse);
        })
      );

      const loader = youTubeLoader({
        type: 'channel',
        apiKey: 'test-api-key',
        channelHandle: '@rickastley',
      });

      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(5);
      
      const rickRoll = mockStore.get("JIOPB36ALMM");
      expect(rickRoll).toBeDefined();
      expect(rickRoll.data.title).toBe("Rick Astley - abcdefu (GAYLE Cover)");
    });

    it("should handle empty video response", async () => {
      const emptyResponse = {
        kind: "youtube#videoListResponse",
        etag: "empty-etag",
        items: [],
        pageInfo: {
          totalResults: 0,
          resultsPerPage: 0
        }
      };

      server.use(
        http.get("https://www.googleapis.com/youtube/v3/videos", () => {
          return HttpResponse.json(emptyResponse);
        })
      );

      const loader = youTubeLoader({
        type: 'videos',
        apiKey: 'test-api-key',
        videoIds: ['nonexistent']
      });

      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(0);
    });
  });

  describe("Search Videos", () => {
    it("should search and load videos", async () => {
      const searchResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-search-response.json"), "utf-8")
      );
      
      const videosResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-videos-response.json"), "utf-8")
      );

      // Mock search API call
      server.use(
        http.get("https://www.googleapis.com/youtube/v3/search", ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get("q");
          const type = url.searchParams.get("type");
          const apiKey = url.searchParams.get("key");
          
          expect(apiKey).toBe("test-api-key");
          expect(query).toBe("rick astley");
          expect(type).toBe("video");
          
          return HttpResponse.json(searchResponse);
        })
      );

      // Mock videos API call (for detailed info)
      server.use(
        http.get("https://www.googleapis.com/youtube/v3/videos", ({ request }) => {
          const url = new URL(request.url);
          const ids = url.searchParams.get("id");
          
          expect(ids).toBe("JIOPB36ALMM,cc91EfoBh8A,eYuUAGXN0KM,m3wzpC2o42I,E9de-cmycx8");
          
          return HttpResponse.json(videosResponse);
        })
      );

      const loader = youTubeLoader({
        type: 'search',
        apiKey: 'test-api-key',
        query: 'rick astley',
        maxResults: 5
      });

      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(5);
      
      const rickRoll = mockStore.get("JIOPB36ALMM");
      expect(rickRoll).toBeDefined();
      expect(rickRoll.data.title).toBe("Rick Astley - abcdefu (GAYLE Cover)");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      server.use(
        http.get("https://www.googleapis.com/youtube/v3/videos", () => {
          return HttpResponse.json(
            {
              error: {
                code: 403,
                message: "The request cannot be completed because you have exceeded your quota.",
                errors: [
                  {
                    message: "The request cannot be completed because you have exceeded your quota.",
                    domain: "youtube.quota",
                    reason: "quotaExceeded"
                  }
                ]
              }
            },
            { status: 403 }
          );
        })
      );

      const loader = youTubeLoader({
        type: 'videos',
        apiKey: 'test-api-key',
        videoIds: ['dQw4w9WgXcQ']
      });

      await expect(loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      })).rejects.toThrow();
    });

    it("should validate required configuration", () => {
      expect(() => youTubeLoader({
        type: 'videos',
        apiKey: '',
        videoIds: ['test']
      })).toThrow("YouTube API key is required");

      expect(() => youTubeLoader({
        type: 'videos',
        apiKey: 'test-key',
        videoIds: []
      })).toThrow("Video IDs are required when type is 'videos'");

      expect(() => youTubeLoader({
        type: 'search',
        apiKey: 'test-key'
      })).toThrow("Search query is required when type is 'search'");
    });
  });

  describe("Caching", () => {
    it("should respect HTTP caching headers", async () => {
      const videosResponse = JSON.parse(
        readFileSync(join(__dirname, "fixtures/youtube-videos-response.json"), "utf-8")
      );

      let requestCount = 0;
      server.use(
        http.get("https://www.googleapis.com/youtube/v3/videos", ({ request }) => {
          requestCount++;
          
          if (requestCount === 1) {
            return HttpResponse.json(videosResponse, {
              headers: {
                'etag': 'test-etag-123',
                'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT'
              }
            });
          } else {
            // Simulate 304 Not Modified on second request
            return new HttpResponse("", { status: 304 });
          }
        })
      );

      const loader = youTubeLoader({
        type: 'videos',
        apiKey: 'test-api-key',
        videoIds: ['JIOPB36ALMM', 'cc91EfoBh8A', 'eYuUAGXN0KM', 'm3wzpC2o42I', 'E9de-cmycx8']
      });

      // First load
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(5);
      expect(requestCount).toBe(1);

      // Second load should use cache
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(requestCount).toBe(2);
      // Store should not be modified on 304 response
      expect(mockStore.data.size).toBe(5);
    });
  });
});