---
"@ascorbic/feed-loader": major
---

**BREAKING CHANGE**: Updated underlying feed parser library

This release updates the underlying feed parsing library from the previous parser to `@rowanmanning/feed-parser`, which provides more robust and standardized feed parsing. There is a legacy mode for the previous data shape. This change includes several breaking changes to the data structure:

## Schema Changes

### Category Structure

- **BREAKING**: Category objects now use `label`, `term`, and `url` fields instead of `name` and `domain`
  - Old: `{ name: string, domain: string | null }`
  - New: `{ label: string, term: string, url: string | null }`

### Media/Enclosure Structure

- **BREAKING**: Media objects now include additional fields and renamed properties
  - Old: `{ url: string, type: string | null, length: number | null }`
  - New: `{ url: string, image: string | null, title: string | null, length: number | null, type: string | null, mimeType: string | null }`

### Field Name Changes

- **BREAKING**: `link` field renamed to `url`
- **BREAKING**: `guid` field renamed to `id`
- **BREAKING**: Atom `summary` field now maps to `description` (consistent with RSS)
- **BREAKING**: RSS/Atom `enclosure`/`link[@rel=enclosure]` elements now map to `media` array

## Error Message Changes

- Updated error messages to match new parser behavior:
  - "Item does not have a guid, skipping" → "Item does not have an id or url, skipping"
  - "Response body is empty" → "Feed response is empty"

## Benefits

- More robust XML/Atom/RSS parsing
- Better handling of malformed feeds
- Standardized data structure across feed types
- Improved character encoding support
- More comprehensive category and media handling

## Legacy Mode Support

To ease migration, this release includes a **temporary legacy mode** that maintains backward compatibility:

```js
// Enable legacy mode for backward compatibility
const loader = feedLoader({
  url: "https://example.com/feed.xml",
  legacy: true, // Will show deprecation warning
});
```

⚠️ **Legacy mode is deprecated** and will be removed in a future major version. Use it only as a temporary migration aid.

## Migration Guide

### Option 1: Use Legacy Mode (Temporary)

Enable legacy mode to maintain the old data structure while you plan your migration:

```js
const loader = feedLoader({
  url: "https://example.com/feed.xml",
  legacy: true,
});
// Data will be in the old format with categories[].name, enclosures, link, guid
```

### Option 2: Update to New Format (Recommended)

Update your code to handle the new structured data format:

#### Field Name Changes

```js
// Item fields
item.link → item.url
item.guid → item.id
item.pubdate/item.date → item.published
item.summary → item.description (Atom feeds)
item.enclosures → item.media
```

#### Author Structure Change

```js
// Old: Single string format
item.author = "email (name)";

// New: Array of objects
item.authors = [{ email: "email", name: "name" }];
// Access: item.authors[0]?.name, item.authors[0]?.email
```

#### Category Structure Change

```js
// Old: Array of strings
item.categories = ["category1", "category2"];

// New: Array of objects
item.categories = [{ label: "category1", term: "category1", url: null }];
// Access: item.categories[0].label
```

#### Media/Enclosure Structure Change

```js
// Old: Basic enclosure format
item.enclosures = [
  {
    url: "http://example.com/file.mp3",
    type: "audio/mpeg",
    length: "1234",
  },
];

// New: Enhanced media format
item.media = [
  {
    url: "http://example.com/file.mp3",
    mimeType: "audio/mpeg",
    length: 1234,
    image: null,
    title: null,
  },
];
```

#### Image Structure Change

```js
// Old: Simple object with undefined for missing values
item.image = { url: "http://example.com/image.jpg", title: undefined };

// New: Full object structure
item.image = {
  url: "http://example.com/image.jpg",
  title: "Image Title",
  description: "Image description",
};
```

#### Meta Structure Changes

```js
// Feed generator changed from string to object
meta.generator = "WordPress" → feed.generator = { name: "WordPress" }

// Authors follow same pattern as items
meta.author = "email (name)" → feed.authors = [{ email: "email", name: "name" }]
```

Most users who only access `title`, `description`, `url`, and basic fields will not need changes.
