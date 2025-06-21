import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { feedLoader } from "../src/feed-loader.js";
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

describe("Feed Loader Integration Tests", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  describe("RSS 2.0 Feed Parsing", () => {
    it("should parse RSS 2.0 feed correctly", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      server.use(
        http.get("https://example.com/rss.xml", () => {
          return new HttpResponse(rssContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/rss.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
      
      const firstPost = mockStore.get("https://example.com/first-post");
      expect(firstPost).toBeDefined();
      expect(firstPost.data.title).toBe("First Post");
      expect(firstPost.data.url).toBe("https://example.com/first-post");
      expect(firstPost.data.description).toBe("This is the first post in our RSS feed");
      
      const secondPost = mockStore.get("https://example.com/second-post");
      expect(secondPost).toBeDefined();
      expect(secondPost.data.title).toBe("Second Post");
      expect(secondPost.data.description).toContain("second post");
      expect(secondPost.data.media).toBeDefined();
      expect(secondPost.data.media[0]).toMatchObject({
        url: "https://example.com/audio.mp3",
        mimeType: "audio/mpeg"
      });
    });

    it("should handle RSS items without GUID", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      server.use(
        http.get("https://example.com/rss.xml", () => {
          return new HttpResponse(rssContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/rss.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
    });
  });

  describe("Atom Feed Parsing", () => {
    it("should parse Atom feed correctly", async () => {
      const atomContent = readFileSync(join(__dirname, "fixtures/atom.xml"), "utf-8");

      server.use(
        http.get("https://example.com/atom.xml", () => {
          return new HttpResponse(atomContent, {
            status: 200,
            headers: {
              "content-type": "application/atom+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/atom.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
      
      const firstEntry = mockStore.get("https://example.com/first-entry");
      expect(firstEntry).toBeDefined();
      expect(firstEntry.data.title).toBe("First Entry");
      expect(firstEntry.data.url).toBe("https://example.com/first-entry");
      expect(firstEntry.data.description).toBe("This is the first entry in our Atom feed");
      
      const secondEntry = mockStore.get("https://example.com/second-entry");
      expect(secondEntry).toBeDefined();
      expect(secondEntry.data.title).toBe("Second Entry with HTML");
      expect(secondEntry.data.description).toContain("second entry");
      
      const mediaEntry = mockStore.get("https://example.com/media-entry");
      expect(mediaEntry).toBeDefined();
      expect(mediaEntry.data.media).toBeDefined();
      expect(mediaEntry.data.media[0]).toMatchObject({
        url: "https://example.com/video.mp4",
        mimeType: "video/mp4"
      });
    });
  });

  describe("RDF Feed Parsing", () => {
    it("should parse RDF feed correctly", async () => {
      const rdfContent = readFileSync(join(__dirname, "fixtures/rdf.xml"), "utf-8");

      server.use(
        http.get("https://example.com/rdf.xml", () => {
          return new HttpResponse(rdfContent, {
            status: 200,
            headers: {
              "content-type": "application/rdf+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/rdf.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(2);
      
      const firstItem = mockStore.get("https://example.com/rdf-first-item");
      expect(firstItem).toBeDefined();
      expect(firstItem.data.title).toBe("First RDF Item");
      expect(firstItem.data.url).toBe("https://example.com/rdf-first-item");
      expect(firstItem.data.description).toBe("This is the first item in our RDF feed");
      
      const secondItem = mockStore.get("https://example.com/rdf-second-item");
      expect(secondItem).toBeDefined();
      expect(secondItem.data.title).toBe("Second RDF Item");
      expect(secondItem.data.description).toContain("special characters");
    });
  });

  describe("Empty Feed Handling", () => {
    it("should handle empty feeds gracefully", async () => {
      const emptyContent = readFileSync(join(__dirname, "fixtures/empty.xml"), "utf-8");

      server.use(
        http.get("https://example.com/empty.xml", () => {
          return new HttpResponse(emptyContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/empty.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(0);
    });
  });

  describe("Malformed Feed Handling", () => {
    it("should handle feeds with recoverable parsing issues", async () => {
      const malformedContent = readFileSync(join(__dirname, "fixtures/malformed.xml"), "utf-8");

      server.use(
        http.get("https://example.com/malformed.xml", () => {
          return new HttpResponse(malformedContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/malformed.xml" });
      
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBeGreaterThanOrEqual(1);
    });
  });
});