import type { LoaderContext } from "astro/loaders";
import {
	createFetch as createProxyFetch,
	createProxy,
	type ProxyOptions,
} from "node-fetch-native/proxy";

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

let cachedProxyFetch: typeof globalThis.fetch | null = null;
let cachedProxyAgent: ReturnType<typeof createProxy>["agent"] | null = null;
let cachedProxyDispatcher: ReturnType<typeof createProxy>["dispatcher"] | null = null;
let cachedProxyCacheKey: string | null = null;

function getEnvValue(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

export function getLoaderProxyOptions(): ProxyOptions | undefined {
	if (process.env.NODE_ENV === "production") {
		return undefined;
	}

	const url =
		getEnvValue("ASTRO_LOADER_PROXY") ??
		getEnvValue("HTTPS_PROXY") ??
		getEnvValue("https_proxy") ??
		getEnvValue("HTTP_PROXY") ??
		getEnvValue("http_proxy");

	if (!url) {
		return undefined;
	}

	const noProxy = getEnvValue("NO_PROXY") ?? getEnvValue("no_proxy");

	return {
		url,
		...(noProxy ? { noProxy } : {}),
	};
}

function getProxyCacheKey(options?: ProxyOptions): string {
	if (!options?.url) return "no-proxy";
	return `${options.url}::${Array.isArray(options.noProxy) ? options.noProxy.join(",") : options.noProxy ?? ""}`;
}

export function getLoaderFetch(): typeof globalThis.fetch {
	const proxyOptions = getLoaderProxyOptions();
	if (!proxyOptions?.url) {
		return globalThis.fetch;
	}

	const cacheKey = getProxyCacheKey(proxyOptions);
	if (!cachedProxyFetch || cacheKey !== cachedProxyCacheKey) {
		cachedProxyFetch = createProxyFetch(proxyOptions);
		cachedProxyCacheKey = cacheKey;
	}

	return cachedProxyFetch;
}

function ensureProxyCache() {
	const proxyOptions = getLoaderProxyOptions();
	if (!proxyOptions?.url) {
		cachedProxyAgent = null;
		cachedProxyDispatcher = null;
		cachedProxyCacheKey = "no-proxy";
		return;
	}

	const cacheKey = getProxyCacheKey(proxyOptions);
	if (cacheKey === cachedProxyCacheKey && (cachedProxyAgent || cachedProxyDispatcher)) {
		return;
	}

	const proxy = createProxy(proxyOptions);
	cachedProxyAgent = proxy.agent ?? null;
	cachedProxyDispatcher = proxy.dispatcher ?? null;
	cachedProxyCacheKey = cacheKey;
}

export function getLoaderProxyAgent(): ReturnType<typeof createProxy>["agent"] | undefined {
	ensureProxyCache();
	return cachedProxyAgent ?? undefined;
}

export function getLoaderProxyDispatcher(): ReturnType<typeof createProxy>["dispatcher"] | undefined {
	ensureProxyCache();
	return cachedProxyDispatcher ?? undefined;
}
