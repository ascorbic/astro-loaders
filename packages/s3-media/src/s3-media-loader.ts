// packages/s3/src/s3-media-loader.ts
import type { Loader } from "astro/loaders";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import type { MediaItem, S3LoaderOptions } from "./schema.js";

let cachedClient: S3Client | null = null;
let cachedOptions: S3LoaderOptions | null = null;

interface CacheEntry {
	data: MediaItem[];
	timestamp: number;
}

const loaderCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(options: S3LoaderOptions): string {
	return `${options.bucket}:${options.prefix || ""}`;
}

function getOrCreateClient(options: S3LoaderOptions): S3Client {
	if (
		cachedClient &&
		cachedOptions &&
		cachedOptions.endpoint === options.endpoint &&
		cachedOptions.bucket === options.bucket &&
		cachedOptions.accessKeyId === options.accessKeyId
	) {
		return cachedClient;
	}

	cachedClient = new S3Client({
		endpoint: options.endpoint,
		region: options.region || "auto",
		credentials: {
			accessKeyId: options.accessKeyId,
			secretAccessKey: options.secretAccessKey,
		},
		forcePathStyle: options.forcePathStyle ?? true,
	});

	cachedOptions = options;
	return cachedClient;
}

function buildUrl(publicBaseUrl: string, key: string): string {
	const base = publicBaseUrl.endsWith("/") ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
	const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
	return `${base}/${normalizedKey}`;
}

async function* listAllObjects(
	client: S3Client,
	bucket: string,
	prefix: string,
	maxKeys: number
): AsyncGenerator<NonNullable<ListObjectsV2CommandOutput["Contents"]>[number]> {
	let continuationToken: string | undefined;

	do {
		const command = new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: prefix,
			MaxKeys: maxKeys,
			ContinuationToken: continuationToken,
		});

		const response = await client.send(command);

		if (response.Contents) {
			for (const item of response.Contents) {
				yield item;
			}
		}

		continuationToken = response.NextContinuationToken;
	} while (continuationToken);
}

export function s3Loader(options: S3LoaderOptions): Loader {
	return {
		name: "s3",

		async load({ store, logger }) {
			const cacheKey = getCacheKey(options);
			const now = Date.now();

			// Production cache
			const isProd = process.env.NODE_ENV === "production";
			if (isProd) {
				const cached = loaderCache.get(cacheKey);
				if (cached && now - cached.timestamp < CACHE_TTL) {
					for (const item of cached.data) {
						store.set({
							id: item.id,
							data: item,
							rendered: { html: "" },
						});
					}
					logger.info(`Loaded ${cached.data.length} media items from cache`);
					return;
				}
			}

			const client = getOrCreateClient(options);
			const maxKeys = options.maxKeys ?? 1000;

			const allowedExts = new Set(
				(options.extensions ?? [".mp3", ".flac", ".wav", ".mp4", ".webm", ".ogg"]).map((ext) =>
					ext.toLowerCase()
				)
			);

			const results: MediaItem[] = [];

			try {
				for await (const item of listAllObjects(client, options.bucket, options.prefix || "", maxKeys)) {
					if (!item.Key) continue;

					const key = item.Key;
					const lastDotIndex = key.lastIndexOf(".");
					const ext = lastDotIndex !== -1 ? key.substring(lastDotIndex).toLowerCase() : "";

					if (!ext || !allowedExts.has(ext)) continue;

					const parts = key.split("/");
					const name = parts.pop() || key;

					const mediaItem: MediaItem = {
						id: key,
						name,
						ext,
						url: buildUrl(options.publicBaseUrl, key),
					};

					if (item.Size !== undefined) {
						mediaItem.size = item.Size;
					}
					if (item.LastModified) {
						mediaItem.lastModified = item.LastModified;
					}

					results.push(mediaItem);

					store.set({
						id: key,
						data: mediaItem,
						rendered: { html: "" },
					});
				}

				loaderCache.set(cacheKey, {
					data: results,
					timestamp: now,
				});

				logger.info(`Loaded ${results.length} media items from S3`);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				logger.error(`Error loading media from S3: ${errorMessage}`);
				throw err;
			}
		},
	};
}
