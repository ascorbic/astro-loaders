# Astro loader utils

Utilities to help building Astro loaders

## Installation

```sh
npm install @ascorbic/feed-utils astro@experimental--contentlayer
```

## API

### Conditional requests

Some APIs allow you to make conditional requests by providing an `If-None-Match` or `If-Modified-Since` header. This can be used to avoid downloading the same data multiple times. These helpers allow you to store the etag or last-modified value from a response and then use it to make a conditional request when updating later.

- `getConditionalHeaders`

Get the headers needed to make a conditional request. Uses the etag and last-modified values from the meta store, and sets the `If-None-Match` or `If-Modified-Since` headers.

- `storeConditionalHeaders`

Store the `ETag` or `Last-Modified` headers from a response in the meta store.
