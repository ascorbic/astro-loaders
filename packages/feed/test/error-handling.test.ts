import { describe, it, expect, beforeEach } from "vitest";
import { feedLoader } from "../src/feed-loader.js";
import { server, http, HttpResponse } from "./setup.js";

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

describe("Feed Loader Error Handling", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  describe("HTTP Error Scenarios", () => {
    it("should throw error for 404 Not Found", async () => {
      server.use(
        http.get("https://example.com/notfound.xml", () => {
          return new HttpResponse(null, { status: 404, statusText: "Not Found" });
        })
      );

      const loader = feedLoader({ url: "https://example.com/notfound.xml" });
      
      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow("Failed to fetch feed: Not Found");
    });

    it("should throw error for 500 Internal Server Error", async () => {
      server.use(
        http.get("https://example.com/error.xml", () => {
          return new HttpResponse(null, { status: 500, statusText: "Internal Server Error" });
        })
      );

      const loader = feedLoader({ url: "https://example.com/error.xml" });
      
      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow("Failed to fetch feed: Internal Server Error");
    });

    it("should throw error for empty response body", async () => {
      server.use(
        http.get("https://example.com/empty-body.xml", () => {
          return new HttpResponse(null, { 
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/empty-body.xml" });
      
      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow("Feed response is empty");
    });

    it("should handle network timeouts", async () => {
      server.use(
        http.get("https://example.com/timeout.xml", async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return new HttpResponse("delayed response");
        })
      );

      const loader = feedLoader({ 
        url: "https://example.com/timeout.xml",
        requestOptions: {
          signal: AbortSignal.timeout(100)
        }
      });
      
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

  describe("Feed Parsing Errors", () => {
    it("should handle completely invalid XML", async () => {
      server.use(
        http.get("https://example.com/invalid.xml", () => {
          return new HttpResponse("This is not XML at all!", {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/invalid.xml" });
      
      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow();
    });

    it("should handle XML with wrong root element", async () => {
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<html>
  <head><title>Not a feed</title></head>
  <body>This is HTML, not a feed</body>
</html>`;

      server.use(
        http.get("https://example.com/notafeed.xml", () => {
          return new HttpResponse(invalidXml, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ url: "https://example.com/notafeed.xml" });
      
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

  describe("Network Errors", () => {
    it("should handle DNS resolution failures", async () => {
      const loader = feedLoader({ url: "https://nonexistentdomain12345.com/feed.xml" });
      
      await expect(async () => {
        await loader.load({
          store: mockStore,
          logger: mockLogger,
          parseData: mockParseData,
          meta: mockMeta
        });
      }).rejects.toThrow();
    });

    it("should handle connection refused", async () => {
      const loader = feedLoader({ url: "http://localhost:9999/feed.xml" });
      
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

  describe("Custom Request Options", () => {
    it("should pass custom headers to fetch request", async () => {
      let receivedHeaders: Headers | undefined;

      server.use(
        http.get("https://example.com/custom-headers.xml", ({ request }) => {
          receivedHeaders = request.headers;
          return new HttpResponse(`<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Test Item</title>
      <guid>test-guid</guid>
    </item>
  </channel>
</rss>`, {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = feedLoader({ 
        url: "https://example.com/custom-headers.xml",
        requestOptions: {
          headers: {
            "User-Agent": "Custom Feed Loader/1.0",
            "Accept": "application/rss+xml, application/xml"
          }
        }
      });

      await loader.load({
        store: mockStore,
        logger: mockLogger,
        parseData: mockParseData,
        meta: mockMeta
      });

      expect(receivedHeaders?.get("user-agent")).toBe("Custom Feed Loader/1.0");
      expect(receivedHeaders?.get("accept")).toBe("application/rss+xml, application/xml");
    });
  });
});