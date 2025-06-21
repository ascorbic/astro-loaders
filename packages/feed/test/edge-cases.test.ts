import { describe, it, expect, beforeEach, vi } from "vitest";
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
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

const mockParseData = async ({ data }: { data: any }) => data;

describe("Feed Loader Edge Cases", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
    vi.clearAllMocks();
  });

  describe("GUID Handling", () => {
    it("should use link as fallback GUID when no explicit GUID is provided", async () => {
      const noGuidContent = readFileSync(join(__dirname, "fixtures/no-guid.xml"), "utf-8");

      server.use(
        http.get("https://example.com/no-guid.xml", () => {
          return new HttpResponse(noGuidContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/no-guid.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
      expect(mockStore.has("https://example.com/item1")).toBe(true);
      expect(mockStore.has("https://example.com/item2")).toBe(true);
      expect(mockStore.has("https://example.com/item3")).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should handle feeds with truly missing identifiers", async () => {
      const noIdContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No ID Feed</title>
    <description>Items with no link or GUID</description>
    
    <item>
      <title>Item Without Link or GUID</title>
      <description>This item has no identifiers</description>
    </item>
  </channel>
</rss>`;

      server.use(
        http.get("https://example.com/no-id.xml", () => {
          return new HttpResponse(noIdContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/no-id.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith("Item does not have an id or url, skipping");
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it("should handle mixed feeds with explicit and implicit GUIDs", async () => {
      const mixedContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mixed GUID Feed</title>
    <link>https://example.com</link>
    <description>Mixed explicit and implicit GUIDs</description>
    
    <item>
      <title>Item With Explicit GUID</title>
      <link>https://example.com/with-guid</link>
      <description>This item has an explicit GUID</description>
      <guid>custom-guid-123</guid>
    </item>
    
    <item>
      <title>Item With Implicit GUID</title>
      <link>https://example.com/implicit-guid</link>
      <description>This item uses link as GUID</description>
    </item>
    
    <item>
      <title>Another Item With Explicit GUID</title>
      <link>https://example.com/another-explicit</link>
      <description>Another explicit GUID</description>
      <guid>custom-guid-456</guid>
    </item>
  </channel>
</rss>`;

      server.use(
        http.get("https://example.com/mixed.xml", () => {
          return new HttpResponse(mixedContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/mixed.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
      expect(mockStore.has("custom-guid-123")).toBe(true);
      expect(mockStore.has("https://example.com/implicit-guid")).toBe(true);
      expect(mockStore.has("custom-guid-456")).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe("Content Type Handling", () => {
    it("should handle different content types correctly", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      const contentTypes = [
        "application/rss+xml",
        "application/xml",
        "text/xml",
        "application/atom+xml"
      ];

      for (const contentType of contentTypes) {
        server.use(
          http.get(`https://example.com/${contentType.replace(/[+/]/g, '-')}.xml`, () => {
            return new HttpResponse(rssContent, {
              status: 200,
              headers: {
                "content-type": contentType
              }
            });
          })
        );

        const loader = feedLoader({ url: `https://example.com/${contentType.replace(/[+/]/g, '-')}.xml` });
        
        mockStore.clear();
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });

        expect(mockStore.data.size).toBe(3);
      }
    });

    it("should handle content type with charset", async () => {
      const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

      server.use(
        http.get("https://example.com/charset.xml", () => {
          return new HttpResponse(rssContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml; charset=utf-8"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/charset.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(3);
    });
  });

  describe("Character Encoding", () => {
    it("should handle ISO-8859-1 encoded feeds", async () => {
      const encodingContent = readFileSync(join(__dirname, "fixtures/encoding-test.xml"), "utf-8");

      server.use(
        http.get("https://example.com/encoding.xml", () => {
          return new HttpResponse(encodingContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml; charset=iso-8859-1"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/encoding.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(2);
      
      const latinItem = mockStore.get("https://example.com/latin");
      expect(latinItem).toBeDefined();
      expect(latinItem.data.title).toContain("áéíóú");
      expect(latinItem.data.description).toContain("café");
      
      const symbolsItem = mockStore.get("https://example.com/symbols");
      expect(symbolsItem).toBeDefined();
      expect(symbolsItem.data.title).toContain("©");
      expect(symbolsItem.data.title).toContain("€");
    });
  });

  describe("HTML Content Handling", () => {
    it("should preserve HTML content in descriptions", async () => {
      const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>HTML Content Feed</title>
    <link>https://example.com</link>
    <description>Feed with HTML content</description>
    
    <item>
      <title>HTML in Description</title>
      <link>https://example.com/html</link>
      <description><![CDATA[This has <strong>bold</strong> and <em>italic</em> text with <a href="https://example.com">links</a>.]]></description>
      <pubDate>Wed, 21 Jun 2023 10:00:00 GMT</pubDate>
      <guid>https://example.com/html</guid>
    </item>
    
    <item>
      <title>Unescaped HTML</title>
      <link>https://example.com/unescaped</link>
      <description>This has &lt;strong&gt;escaped&lt;/strong&gt; HTML entities.</description>
      <pubDate>Wed, 20 Jun 2023 15:30:00 GMT</pubDate>
      <guid>https://example.com/unescaped</guid>
    </item>
  </channel>
</rss>`;

      server.use(
        http.get("https://example.com/html.xml", () => {
          return new HttpResponse(htmlContent, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/html.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(2);
      
      const htmlItem = mockStore.get("https://example.com/html");
      expect(htmlItem).toBeDefined();
      expect(htmlItem.data.description).toContain("<strong>bold</strong>");
      expect(htmlItem.data.description).toContain("<em>italic</em>");
      expect(htmlItem.data.description).toContain('<a href="https://example.com">links</a>');
      
      const unescapedItem = mockStore.get("https://example.com/unescaped");
      expect(unescapedItem).toBeDefined();
      expect(unescapedItem.data.description).toContain("<strong>escaped</strong>");
    });
  });

  describe("Large Feed Handling", () => {
    it("should handle feeds with many items", async () => {
      const generateLargeFeed = (itemCount: number) => {
        const items = Array.from({ length: itemCount }, (_, i) => `
    <item>
      <title>Item ${i + 1}</title>
      <link>https://example.com/item-${i + 1}</link>
      <description>Description for item ${i + 1}</description>
      <pubDate>Wed, ${21 - (i % 30)} Jun 2023 10:00:00 GMT</pubDate>
      <guid>https://example.com/item-${i + 1}</guid>
    </item>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Large Feed</title>
    <link>https://example.com</link>
    <description>Feed with many items</description>
    ${items}
  </channel>
</rss>`;
      };

      const largeFeed = generateLargeFeed(100);

      server.use(
        http.get("https://example.com/large.xml", () => {
          return new HttpResponse(largeFeed, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/large.xml" });
      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(mockStore.data.size).toBe(100);
      expect(mockStore.has("https://example.com/item-1")).toBe(true);
      expect(mockStore.has("https://example.com/item-100")).toBe(true);
    });
  });
});