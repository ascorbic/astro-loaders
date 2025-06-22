import { describe, it, expect } from "vitest";
import { renderPostAsHtml, escapeHTML, nl2br } from "../src/utils.js";

describe("Rich Text Rendering", () => {
  describe("escapeHTML", () => {
    it("should escape HTML characters", () => {
      expect(escapeHTML("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
      expect(escapeHTML("Quotes: \"double\" & 'single'")).toBe("Quotes: &quot;double&quot; &amp; &#39;single&#39;");
      expect(escapeHTML("Normal text")).toBe("Normal text");
      expect(escapeHTML("")).toBe("");
      expect(escapeHTML(undefined)).toBe("");
    });
  });

  describe("nl2br", () => {
    it("should convert newlines to br tags", () => {
      expect(nl2br("Line 1\nLine 2")).toBe("Line 1<br/ >\nLine 2");
      expect(nl2br("Multiple\n\nNewlines")).toBe("Multiple<br/ >\n<br/ >\nNewlines");
      expect(nl2br("No newlines")).toBe("No newlines");
      expect(nl2br("")).toBe("");
      expect(nl2br(undefined)).toBe("");
    });
  });

  describe("renderPostAsHtml", () => {
    it("should render plain text", () => {
      const post = {
        record: {
          text: "Hello, world!"
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe("Hello, world!");
    });

    it("should render text with newlines", () => {
      const post = {
        record: {
          text: "Line 1\nLine 2",
          facets: []
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe("Line 1<br/ >\nLine 2");
    });

    it("should not transform newlines when disabled", () => {
      const post = {
        record: {
          text: "Line 1\nLine 2",
          facets: []
        }
      };

      const html = renderPostAsHtml(post as any, false);
      expect(html).toBe("Line 1\nLine 2");
    });

    it("should render mentions as links", () => {
      const post = {
        record: {
          text: "Hey @alice.bsky.social!",
          facets: [
            {
              index: { byteStart: 4, byteEnd: 22 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#mention",
                  did: "did:plc:alice123"
                }
              ]
            }
          ]
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe('Hey <a href="https://bsky.app/profile/did:plc:alice123">@alice.bsky.social</a>!');
    });

    it("should render hashtags as links", () => {
      const post = {
        record: {
          text: "Check out #bluesky!",
          facets: [
            {
              index: { byteStart: 10, byteEnd: 18 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#tag",
                  tag: "bluesky"
                }
              ]
            }
          ]
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe('Check out <a href="https://bsky.app/hashtag/bluesky">#bluesky</a>!');
    });

    it("should render external links", () => {
      const post = {
        record: {
          text: "Visit https://example.com for more info",
          facets: [
            {
              index: { byteStart: 6, byteEnd: 25 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#link",
                  uri: "https://example.com"
                }
              ]
            }
          ]
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe('Visit <a href="https://example.com">https://example.com</a> for more info');
    });

    it("should render multiple facets correctly", () => {
      const post = {
        record: {
          text: "Hey @alice.bsky.social, check out #bluesky and visit https://example.com!",
          facets: [
            {
              index: { byteStart: 4, byteEnd: 22 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#mention",
                  did: "did:plc:alice123"
                }
              ]
            },
            {
              index: { byteStart: 34, byteEnd: 42 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#tag",
                  tag: "bluesky"
                }
              ]
            },
            {
              index: { byteStart: 53, byteEnd: 72 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#link",
                  uri: "https://example.com"
                }
              ]
            }
          ]
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe(
        'Hey <a href="https://bsky.app/profile/did:plc:alice123">@alice.bsky.social</a>, check out <a href="https://bsky.app/hashtag/bluesky">#bluesky</a> and visit <a href="https://example.com">https://example.com</a>!'
      );
    });

    it("should escape HTML in text content", () => {
      const post = {
        record: {
          text: "Alert: <script>alert('xss')</script>",
          facets: []
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe("Alert: &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    });

    it("should escape HTML in facet URLs", () => {
      const post = {
        record: {
          text: "Dangerous link",
          facets: [
            {
              index: { byteStart: 0, byteEnd: 14 },
              features: [
                {
                  $type: "app.bsky.richtext.facet#link",
                  uri: "javascript:alert('xss')"
                }
              ]
            }
          ]
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe('<a href="javascript:alert(&#39;xss&#39;)">Dangerous link</a>');
    });

    it("should handle empty or missing text", () => {
      const emptyPost = {
        record: {
          text: "",
          facets: []
        }
      };

      const html = renderPostAsHtml(emptyPost as any);
      expect(html).toBe("");

      const noTextPost = {
        record: {
          facets: []
        }
      };

      const html2 = renderPostAsHtml(noTextPost as any);
      expect(html2).toBe("");
    });

    it("should handle posts with no facets", () => {
      const post = {
        record: {
          text: "Simple post with no formatting"
        }
      };

      const html = renderPostAsHtml(post as any);
      expect(html).toBe("Simple post with no formatting");
    });
  });
});