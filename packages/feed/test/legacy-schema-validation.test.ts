import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { feedLoader } from "../src/feed-loader.js";
import { LegacyItemSchema } from "../src/schema.js";
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

const mockParseData = async ({ data }: { data: any }) => {
  // Validate against original schema
  const result = LegacyItemSchema.parse(data);
  return result;
};

describe("Legacy Schema Validation", () => {
  beforeEach(() => {
    mockStore.clear();
    mockMeta.data.clear();
  });

  it("should produce data that validates against original schema", async () => {
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

    const loader = feedLoader({ 
      url: "https://example.com/schema-test.xml", 
      legacy: true 
    });
    
    // This should not throw - the mockParseData function validates against LegacyItemSchema
    await loader.load({
      store: mockStore,
      logger: mockLogger,
      parseData: mockParseData,
      meta: mockMeta
    });

    expect(mockStore.data.size).toBe(3);
    
    // Verify the structure matches original exactly
    const firstPost = mockStore.get("https://example.com/first-post");
    expect(firstPost).toBeDefined();
    
    // Check that all required fields from original schema are present
    expect(firstPost.data).toHaveProperty("title");
    expect(firstPost.data).toHaveProperty("description");
    expect(firstPost.data).toHaveProperty("summary");
    expect(firstPost.data).toHaveProperty("date");
    expect(firstPost.data).toHaveProperty("pubdate");
    expect(firstPost.data).toHaveProperty("link");
    expect(firstPost.data).toHaveProperty("origlink");
    expect(firstPost.data).toHaveProperty("author");
    expect(firstPost.data).toHaveProperty("guid");
    expect(firstPost.data).toHaveProperty("comments");
    expect(firstPost.data).toHaveProperty("image");
    expect(firstPost.data).toHaveProperty("categories");
    expect(firstPost.data).toHaveProperty("enclosures");
    expect(firstPost.data).toHaveProperty("meta");
    
    // Check meta structure
    expect(firstPost.data.meta).toHaveProperty("#ns");
    expect(firstPost.data.meta).toHaveProperty("#type");
    expect(firstPost.data.meta).toHaveProperty("#version");
    expect(firstPost.data.meta).toHaveProperty("title");
    expect(firstPost.data.meta).toHaveProperty("description");
    expect(firstPost.data.meta).toHaveProperty("link");
    expect(firstPost.data.meta).toHaveProperty("language");
    expect(firstPost.data.meta).toHaveProperty("categories");
  });
});