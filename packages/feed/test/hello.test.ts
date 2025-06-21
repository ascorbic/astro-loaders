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

describe("Feed Loader HTTP Conditional Requests", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  it("should handle ETag-based conditional requests", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");
    const etag = '"test-etag-123"';

    server.use(
      http.get("https://example.com/feed.xml", ({ request }) => {
        const ifNoneMatch = request.headers.get("if-none-match");
        
        if (ifNoneMatch === etag) {
          return new HttpResponse(null, { status: 304 });
        }
        
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml",
            "etag": etag
          }
        });
      })
    );

    const loader = feedLoader({ url: "https://example.com/feed.xml" });

    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(3);
    expect(mockMeta.get("etag")).toBe(etag);

    mockStore.clear();

    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(0);
  });

  it("should handle Last-Modified-based conditional requests", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");
    const lastModified = "Wed, 21 Jun 2023 12:00:00 GMT";

    server.use(
      http.get("https://example.com/feed.xml", ({ request }) => {
        const ifModifiedSince = request.headers.get("if-modified-since");
        
        if (ifModifiedSince === lastModified) {
          return new HttpResponse(null, { status: 304 });
        }
        
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml",
            "Last-Modified": lastModified
          }
        });
      })
    );

    const loader = feedLoader({ url: "https://example.com/feed.xml" });

    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(3);
    expect(mockMeta.get("last-modified")).toBe(lastModified);

    mockStore.clear();

    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(0);
  });

  it("should prefer ETag over Last-Modified when both are present", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");
    const etag = '"test-etag-456"';
    const lastModified = "Wed, 21 Jun 2023 14:00:00 GMT";

    server.use(
      http.get("https://example.com/feed-both.xml", ({ request }) => {
        const ifNoneMatch = request.headers.get("if-none-match");
        const ifModifiedSince = request.headers.get("if-modified-since");
        
        if (ifNoneMatch === etag || ifModifiedSince === lastModified) {
          return new HttpResponse(null, { status: 304 });
        }
        
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml",
            "etag": etag,
            "Last-Modified": lastModified
          }
        });
      })
    );

    const loader = feedLoader({ url: "https://example.com/feed-both.xml" });

    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(3);
    expect(mockMeta.get("etag")).toBe(etag);
    expect(mockMeta.get("last-modified")).toBeUndefined();

    mockStore.clear();

    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(0);
  });
});
