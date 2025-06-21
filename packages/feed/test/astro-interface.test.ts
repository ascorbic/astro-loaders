import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { feedLoader } from "../src/feed-loader.js";
import { ItemSchema } from "../src/schema.js";
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

const mockParseData = async ({ data }: { id: string; data: any }) => {
  const result = ItemSchema.parse(data);
  return result;
};

describe("Astro Loader Interface Compliance", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  describe("Loader Interface", () => {
    it("should implement the Loader interface correctly", () => {
      const loader = feedLoader({ url: "https://example.com/feed.xml" });

      expect(loader).toHaveProperty("name");
      expect(loader).toHaveProperty("load");
      expect(loader).toHaveProperty("schema");

      expect(typeof loader.name).toBe("string");
      expect(typeof loader.load).toBe("function");
      expect(loader.schema).toBeDefined();

      expect(loader.name).toBe("feed-loader");
    });

    it("should have correct schema export", () => {
      const loader = feedLoader({ url: "https://example.com/feed.xml" });
      
      expect(loader.schema).toBe(ItemSchema);
    });

    it("should accept URL as string or URL object", () => {
      const stringLoader = feedLoader({ url: "https://example.com/feed.xml" });
      const urlLoader = feedLoader({ url: new URL("https://example.com/feed.xml") });

      expect(stringLoader.name).toBe("feed-loader");
      expect(urlLoader.name).toBe("feed-loader");
    });
  });

  describe("Data Store Integration", () => {
    it("should clear store before loading new data", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      server.use(
        http.get("https://example.com/feed.xml", () => {
          return new HttpResponse(rssContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      mockStore.set({ 
        id: "old-item", 
        data: { title: "Old Item" }, 
        rendered: { html: "Old content" } 
      });
      
      expect(mockStore.data.size).toBe(1);

      const loader = feedLoader({ url: "https://example.com/feed.xml" });
      await loader.load({
        store: mockStore as any,
        logger: mockLogger as any,
        parseData: mockParseData as any,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
      expect(mockStore.has("old-item")).toBe(false);
    });

    it("should store items with correct structure", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      server.use(
        http.get("https://example.com/feed.xml", () => {
          return new HttpResponse(rssContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/feed.xml" });
      await loader.load({
        store: mockStore as any,
        logger: mockLogger as any,
        parseData: mockParseData as any,
        meta: mockMeta
      });

      const storedItem = mockStore.get("https://example.com/first-post");
      
      expect(storedItem).toHaveProperty("data");
      expect(storedItem).toHaveProperty("rendered");
      expect(storedItem.rendered).toHaveProperty("html");

      expect(storedItem.data.title).toBe("First Post");
      expect(storedItem.data.url).toBe("https://example.com/first-post");
      expect(storedItem.data.id).toBe("https://example.com/first-post");
      expect(storedItem.rendered.html).toBe("This is the first post in our RSS feed");
    });

    it("should handle empty description gracefully", async () => {
      const feedContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Item without description</title>
      <link>https://example.com/no-desc</link>
      <guid>https://example.com/no-desc</guid>
    </item>
  </channel>
</rss>`;

      server.use(
        http.get("https://example.com/no-desc.xml", () => {
          return new HttpResponse(feedContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/no-desc.xml" });
      await loader.load({
        store: mockStore as any,
        logger: mockLogger as any,
        parseData: mockParseData as any,
        meta: mockMeta
      });

      const storedItem = mockStore.get("https://example.com/no-desc");
      expect(storedItem).toBeDefined();
      expect(storedItem.rendered.html).toBe("");
    });
  });

  describe("Schema Validation", () => {
    it("should validate parsed data against schema", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      server.use(
        http.get("https://example.com/schema-test.xml", () => {
          return new HttpResponse(rssContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/schema-test.xml" });
      await loader.load({
        store: mockStore as any,
        logger: mockLogger as any,
        parseData: mockParseData as any,
        meta: mockMeta
      });

      const storedItem = mockStore.get("https://example.com/first-post");
      const validationResult = ItemSchema.safeParse(storedItem!.data);
      
      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.title).toBe("First Post");
        expect(validationResult.data.url).toBe("https://example.com/first-post");
        expect(validationResult.data.id).toBe("https://example.com/first-post");
      }
    });

    it("should handle all schema fields correctly", async () => {
      const complexRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Complex Feed</title>
    <item>
      <title>Complex Item</title>
      <link>https://example.com/complex</link>
      <description>Complex description</description>
      <pubDate>Wed, 21 Jun 2023 10:00:00 GMT</pubDate>
      <guid>https://example.com/complex</guid>
      <author>author@example.com (Author Name)</author>
      <category>Technology</category>
      <category>News</category>
      <enclosure url="https://example.com/file.mp3" length="1024" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

      server.use(
        http.get("https://example.com/complex.xml", () => {
          return new HttpResponse(complexRss, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/complex.xml" });
      await loader.load({
        store: mockStore as any,
        logger: mockLogger as any,
        parseData: mockParseData as any,
        meta: mockMeta
      });

      const storedItem = mockStore.get("https://example.com/complex");
      expect(storedItem).toBeDefined();
      
      const validationResult = ItemSchema.safeParse(storedItem!.data);
      expect(validationResult.success).toBe(true);
      
      if (validationResult.success) {
        expect(validationResult.data.title).toBe("Complex Item");
        expect(validationResult.data.categories).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ label: "Technology" }),
            expect.objectContaining({ label: "News" })
          ])
        );
        expect(validationResult.data.media).toHaveLength(1);
        expect(validationResult.data.media![0]!.url).toBe("https://example.com/file.mp3");
        expect(validationResult.data.media![0]!.mimeType).toBe("audio/mpeg");
      }
    });
  });

});