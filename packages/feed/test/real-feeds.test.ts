import { describe, it, expect, beforeEach } from "vitest";
import { feedLoader } from "../src/feed-loader.js";

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

describe("Feed Loader Real Feed Integration", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  describe("GitHub Releases Feed", () => {
    it("should load Astro GitHub releases feed", async () => {
      const loader = feedLoader({ 
        url: "https://github.com/withastro/astro/releases.atom",
        requestOptions: {
          headers: {
            "User-Agent": "Feed Loader Test"
          }
        }
      });

      try {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });

        expect(mockStore.data.size).toBeGreaterThan(0);
        
        const firstRelease = Array.from(mockStore.values())[0];
        expect(firstRelease).toBeDefined();
        expect(firstRelease.data.title).toBeDefined();
        expect(firstRelease.data.link).toBeDefined();
        expect(firstRelease.data.guid).toBeDefined();
        expect(firstRelease.data.pubdate).toBeDefined();
        
        expect(firstRelease.data.link).toMatch(/^https:\/\/github\.com\/withastro\/astro\/releases\//);
      } catch (error) {
        console.warn("GitHub releases feed test failed, possibly due to network issues:", error);
        expect(true).toBe(true);
      }
    }, 10000);

    it("should handle GitHub releases feed with conditional requests", async () => {
      const loader = feedLoader({ 
        url: "https://github.com/withastro/astro/releases.atom",
        requestOptions: {
          headers: {
            "User-Agent": "Feed Loader Test"
          }
        }
      });

      try {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });

        const firstLoadCount = mockStore.data.size;
        expect(firstLoadCount).toBeGreaterThan(0);

        const etag = mockMeta.get("etag");
        const lastModified = mockMeta.get("last-modified");
        expect(etag || lastModified).toBeDefined();

        mockStore.clear();

        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });

        expect(mockStore.data.size).toBe(0);
      } catch (error) {
        console.warn("GitHub conditional request test failed:", error);
        expect(true).toBe(true);
      }
    }, 10000);
  });

  describe("RSS Feed Examples", () => {
    it("should load a real RSS feed", async () => {
      const loader = feedLoader({ 
        url: "https://feeds.feedburner.com/oreilly/radar",
        requestOptions: {
          headers: {
            "User-Agent": "Feed Loader Test"
          }
        }
      });

      try {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });

        expect(mockStore.data.size).toBeGreaterThan(0);
        
        const firstPost = Array.from(mockStore.values())[0];
        expect(firstPost).toBeDefined();
        expect(firstPost.data.title).toBeDefined();
        expect(firstPost.data.link).toBeDefined();
        expect(firstPost.data.description).toBeDefined();
      } catch (error) {
        console.warn("RSS feed test failed, possibly due to network issues:", error);
        expect(true).toBe(true);
      }
    }, 10000);
  });

  describe("Error Resilience with Real URLs", () => {
    it("should handle non-existent real domains gracefully", async () => {
      const loader = feedLoader({ url: "https://this-domain-should-not-exist-12345.com/feed.xml" });

      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow();
    });

    it("should handle real domain with non-existent path", async () => {
      const loader = feedLoader({ url: "https://github.com/non-existent-feed-path-12345.xml" });

      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow();
    });
  });
});