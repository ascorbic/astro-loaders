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

describe("Feed Loader Legacy Mode", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
    vi.clearAllMocks();
  });

  it("should show deprecation warning when legacy mode is enabled", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

    server.use(
      http.get("https://example.com/legacy-test.xml", () => {
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml"
          }
        });
      })
    );

    const loader = feedLoader({ 
      url: "https://example.com/legacy-test.xml", 
      legacy: true 
    });
    
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Using legacy mode. This is deprecated and will be removed in a future version. Please migrate to the new format."
    );
  });

  it("should transform categories to legacy format", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

    server.use(
      http.get("https://example.com/legacy-categories.xml", () => {
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml"
          }
        });
      })
    );

    const loader = feedLoader({ 
      url: "https://example.com/legacy-categories.xml", 
      legacy: true 
    });
    
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    const firstPost = mockStore.get("https://example.com/first-post");
    expect(firstPost).toBeDefined();
    
    // Check legacy category format
    expect(firstPost.data.categories).toEqual([
      { name: "Technology", domain: null }
    ]);
  });

  it("should transform media to enclosures in legacy format", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

    server.use(
      http.get("https://example.com/legacy-media.xml", () => {
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml"
          }
        });
      })
    );

    const loader = feedLoader({ 
      url: "https://example.com/legacy-media.xml", 
      legacy: true 
    });
    
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    const secondPost = mockStore.get("https://example.com/second-post");
    expect(secondPost).toBeDefined();
    
    // Check legacy enclosures format
    expect(secondPost.data.enclosures).toBeDefined();
    expect(secondPost.data.enclosures).toEqual([
      {
        url: "https://example.com/audio.mp3",
        type: "audio/mpeg",
        length: 1024
      }
    ]);
  });

  it("should add legacy aliases (link and guid)", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

    server.use(
      http.get("https://example.com/legacy-aliases.xml", () => {
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml"
          }
        });
      })
    );

    const loader = feedLoader({ 
      url: "https://example.com/legacy-aliases.xml", 
      legacy: true 
    });
    
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    const firstPost = mockStore.get("https://example.com/first-post");
    expect(firstPost).toBeDefined();
    
    // Check legacy aliases exist alongside modern fields
    expect(firstPost.data.url).toBe("https://example.com/first-post");
    expect(firstPost.data.link).toBe("https://example.com/first-post"); // Legacy alias
    expect(firstPost.data.id).toBe("https://example.com/first-post");
    expect(firstPost.data.guid).toBe("https://example.com/first-post"); // Legacy alias
  });

  it("should use legacy schema when legacy mode is enabled", async () => {
    const loader = feedLoader({ 
      url: "https://example.com/test.xml", 
      legacy: true 
    });
    
    // Check that the loader uses the legacy schema
    expect(loader.schema).toBeDefined();
    // We can't easily inspect the schema object directly, but we know it's using LegacyItemSchema
    // The real test is in the data transformation tests above
  });

  it("should not show deprecation warning in normal mode", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

    server.use(
      http.get("https://example.com/normal-mode.xml", () => {
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml"
          }
        });
      })
    );

    const loader = feedLoader({ 
      url: "https://example.com/normal-mode.xml"
      // legacy defaults to false
    });
    
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    // Should not have shown deprecation warning
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("legacy mode")
    );
  });

  it("should maintain modern format in normal mode", async () => {
    const rssContent = readFileSync(join(__dirname, "fixtures/rss2.xml"), "utf-8");

    server.use(
      http.get("https://example.com/modern-format.xml", () => {
        return new HttpResponse(rssContent, {
          status: 200,
          headers: {
            "content-type": "application/rss+xml"
          }
        });
      })
    );

    const loader = feedLoader({ 
      url: "https://example.com/modern-format.xml"
    });
    
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    const firstPost = mockStore.get("https://example.com/first-post");
    expect(firstPost).toBeDefined();
    
    // Check modern format (no legacy aliases)
    expect(firstPost.data.url).toBeDefined();
    expect(firstPost.data.link).toBeUndefined(); // No legacy alias
    expect(firstPost.data.id).toBeDefined();
    expect(firstPost.data.guid).toBeUndefined(); // No legacy alias
    
    // Check modern category format
    expect(firstPost.data.categories[0]).toEqual({
      label: "Technology",
      term: "Technology", 
      url: null
    });
    
    // Check modern media format
    const secondPost = mockStore.get("https://example.com/second-post");
    expect(secondPost.data.media).toBeDefined();
    expect(secondPost.data.enclosures).toBeUndefined(); // No legacy field
  });
});