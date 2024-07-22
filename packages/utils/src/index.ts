import type { LoaderContext } from "astro/loaders";

/**
 * Get the headers needed to make a conditional request.
 * Uses the etag and last-modified values from the meta store.
 */
export function getConditionalHeaders({
  init,
  meta,
}: {
  /** Initial headers to include */
  init?: RequestInit["headers"];
  /** Meta store to get etag and last-modified values from */
  meta: LoaderContext["meta"];
}): Headers {
  const etag = meta.get("etag");
  const lastModified = meta.get("last-modified");
  const headers = new Headers(init);
  if (etag) {
    headers.set("If-None-Match", etag);
  } else if (lastModified) {
    headers.set("If-Modified-Since", lastModified);
  }
  return headers;
}

/**
 * Store the etag or last-modified headers from a response in the meta store.
 */
export function storeConditionalHeaders({
  headers,
  meta,
}: {
  /** Headers from the response */
  headers: Headers;
  /** Meta store to store etag and last-modified values in */
  meta: LoaderContext["meta"];
}) {
  const etag = headers.get("etag");
  const lastModified = headers.get("last-modified");
  meta.delete("etag");
  meta.delete("last-modified");
  if (etag) {
    meta.set("etag", etag);
  } else if (lastModified) {
    meta.set("last-modified", lastModified);
  }
}
