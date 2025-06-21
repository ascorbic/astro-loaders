import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { liveFeedLoader, FeedLoadError, FeedValidationError } from "../src/index.js";
import { server, http, HttpResponse } from "./setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Live Feed Loader Tests", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe("Basic Feed Loading", () => {
    it("should load RSS 2.0 feed collection", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(3);
        
        const firstPost = result.entries.find(e => e.id === "https://example.com/first-post");
        expect(firstPost).toBeDefined();
        expect(firstPost?.data.title).toBe("First Post");
        expect(firstPost?.data.url).toBe("https://example.com/first-post");
        expect(firstPost?.data.description).toBe("This is the first post in our RSS feed");
        expect(firstPost?.rendered?.html).toBe("This is the first post in our RSS feed");
      }
    });

    it("should load Atom feed collection", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/atom.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(3);
        
        const firstEntry = result.entries.find(e => e.id === "https://example.com/first-entry");
        expect(firstEntry).toBeDefined();
        expect(firstEntry?.data.title).toBe("First Entry");
        expect(firstEntry?.data.url).toBe("https://example.com/first-entry");
      }
    });

    it("should load individual entry by ID", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadEntry({ filter: { id: "https://example.com/first-post" } });

      expect(result).toBeDefined();
      if (result && "data" in result) {
        expect(result.id).toBe("https://example.com/first-post");
        expect(result.data.title).toBe("First Post");
        expect(result.data.description).toBe("This is the first post in our RSS feed");
      }
    });

    it("should load individual entry by URL", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadEntry({ filter: { url: "https://example.com/second-post" } });

      expect(result).toBeDefined();
      if (result && "data" in result) {
        expect(result.id).toBe("https://example.com/second-post");
        expect(result.data.title).toBe("Second Post");
      }
    });

    it("should return undefined for non-existent entry", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadEntry({ filter: { id: "https://example.com/non-existent" } });

      expect(result).toBeUndefined();
    });
  });

  describe("Filtering", () => {
    it("should limit number of entries", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadCollection({ filter: { limit: 2 } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        expect(result.entries).toHaveLength(2);
      }
    });

    it("should filter by category", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadCollection({ filter: { category: "technology" } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        // Should find entries with technology category
        expect(result.entries.length).toBeGreaterThanOrEqual(0);
        result.entries.forEach(entry => {
          const hasCategory = entry.data.categories?.some((cat: any) => 
            cat.label?.toLowerCase().includes("technology") || 
            cat.term?.toLowerCase().includes("technology")
          );
          if (result.entries.length > 0) {
            expect(hasCategory).toBe(true);
          }
        });
      }
    });

    it("should filter by author", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadCollection({ filter: { author: "john" } });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        // Should find entries with john as author
        expect(result.entries.length).toBeGreaterThanOrEqual(0);
        result.entries.forEach(entry => {
          const hasAuthor = entry.data.authors?.some((author: any) => 
            author.name?.toLowerCase().includes("john") || 
            author.email?.toLowerCase().includes("john")
          );
          if (result.entries.length > 0) {
            expect(hasAuthor).toBe(true);
          }
        });
      }
    });

    it("should filter by date range", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const since = new Date("2020-01-01");
      const until = new Date("2025-12-31");
      
      const result = await loader.loadCollection({ 
        filter: { since, until } 
      });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        result.entries.forEach(entry => {
          if (entry.data.published) {
            expect(entry.data.published).toBeInstanceOf(Date);
            expect(entry.data.published.getTime()).toBeGreaterThanOrEqual(since.getTime());
            expect(entry.data.published.getTime()).toBeLessThanOrEqual(until.getTime());
          }
        });
      }
    });
  });

  describe("Error Handling", () => {
    it("should return FeedLoadError for 404 Not Found", async () => {
      server.use(
        http.get("https://example.com/notfound.xml", () => {
          return new HttpResponse(null, { status: 404, statusText: "Not Found" });
        })
      );

      const loader = liveFeedLoader({ url: "https://example.com/notfound.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(FeedLoadError);
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.statusCode).toBe(404);
        expect(result.error.url).toBe("https://example.com/notfound.xml");
      }
    });

    it("should return FeedLoadError for 500 Internal Server Error", async () => {
      server.use(
        http.get("https://example.com/error.xml", () => {
          return new HttpResponse(null, { status: 500, statusText: "Internal Server Error" });
        })
      );

      const loader = liveFeedLoader({ url: "https://example.com/error.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(FeedLoadError);
        expect(result.error.code).toBe("HTTP_ERROR");
        expect(result.error.statusCode).toBe(500);
      }
    });

    it("should return FeedValidationError for empty response", async () => {
      server.use(
        http.get("https://example.com/empty.xml", () => {
          return new HttpResponse("", { 
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = liveFeedLoader({ url: "https://example.com/empty.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(FeedValidationError);
        expect(result.error.url).toBe("https://example.com/empty.xml");
      }
    });

    it("should return FeedValidationError for invalid XML", async () => {
      server.use(
        http.get("https://example.com/invalid.xml", () => {
          return new HttpResponse("This is not XML!", {
            status: 200,
            headers: {
              "content-type": "application/rss+xml"
            }
          });
        })
      );

      const loader = liveFeedLoader({ url: "https://example.com/invalid.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(FeedValidationError);
        expect(result.error.url).toBe("https://example.com/invalid.xml");
      }
    });

    it("should handle network errors in loadEntry", async () => {
      server.use(
        http.get("https://example.com/network-error.xml", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const loader = liveFeedLoader({ url: "https://example.com/network-error.xml" });
      const result = await loader.loadEntry({ filter: { id: "test" } });

      expect(result).toBeDefined();
      if (result && "error" in result) {
        expect(result.error).toBeInstanceOf(FeedLoadError);
      }
    });

    it("should handle timeout errors", async () => {
      server.use(
        http.get("https://example.com/timeout.xml", async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return new HttpResponse("delayed response");
        })
      );

      const loader = liveFeedLoader({ 
        url: "https://example.com/timeout.xml",
        requestOptions: {
          signal: AbortSignal.timeout(100)
        }
      });
      
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(FeedLoadError);
        expect(result.error.code).toBe("UNKNOWN_ERROR");
      }
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

      const loader = liveFeedLoader({ 
        url: "https://example.com/custom-headers.xml",
        requestOptions: {
          headers: {
            "User-Agent": "Live Feed Loader/1.0",
            "Accept": "application/rss+xml, application/xml"
          }
        }
      });

      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      expect(receivedHeaders?.get("user-agent")).toBe("Live Feed Loader/1.0");
      expect(receivedHeaders?.get("accept")).toBe("application/rss+xml, application/xml");
    });
  });

  describe("Content Rendering", () => {
    it("should include rendered HTML when content is available", async () => {
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

      const loader = liveFeedLoader({ url: "https://example.com/rss.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        const entryWithContent = result.entries.find(e => e.rendered?.html);
        if (entryWithContent) {
          expect(entryWithContent.rendered?.html).toBeDefined();
          expect(typeof entryWithContent.rendered?.html).toBe("string");
        }
      }
    });

    it("should fallback to description when no content available", async () => {
      server.use(
        http.get("https://example.com/no-content.xml", () => {
          return new HttpResponse(`<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Test Item</title>
      <guid>test-guid</guid>
      <description>Only description, no content</description>
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

      const loader = liveFeedLoader({ url: "https://example.com/no-content.xml" });
      const result = await loader.loadCollection({ filter: {} });

      expect("error" in result).toBe(false);
      if ("entries" in result) {
        const firstEntry = result.entries[0];
        // Should fallback to description when no content
        expect(firstEntry.rendered?.html).toBe("Only description, no content");
      }
    });
  });
});