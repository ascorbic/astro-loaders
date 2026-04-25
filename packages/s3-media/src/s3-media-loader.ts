// packages/s3/src/s3-media-loader.ts
import type { Loader } from "astro/loaders";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { getLoaderProxyAgent } from "@ascorbic/loader-utils";
import type { MediaItem, S3LoaderOptions } from "./schema.js";

import fs from "node:fs/promises";
import path from "node:path";

let cachedClient: S3Client | null = null;
let cachedOptions: S3LoaderOptions | null = null;

const CACHE_DIR = path.join(process.cwd(), "src/content/content-metadata");

function getCacheFile(cacheKey: string): string {
	return `s3-media-${cacheKey.replace(/[:\/]/g, '_')}.json`;
}

async function readCache(cacheKey: string): Promise<{ data: MediaItem[]; isFresh: boolean } | null> {
	try {
		const filePath = path.join(CACHE_DIR, getCacheFile(cacheKey));
		const stat = await fs.stat(filePath);
		const file = await fs.readFile(filePath, "utf-8");
		const data = JSON.parse(file) as MediaItem[];
		// Convert date strings back to Date objects
		const processedData = data.map(item => ({
			...item,
			lastModified: item.lastModified ? new Date(item.lastModified) : undefined
		}));
		const isFresh = Date.now() - stat.mtime.getTime() < 60 * 60 * 1000; // 1 hour
		return { data: processedData, isFresh };
	} catch {
		return null;
	}
}

async function writeCache(cacheKey: string, data: MediaItem[]) {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		await fs.writeFile(path.join(CACHE_DIR, getCacheFile(cacheKey)), JSON.stringify(data, null, 2));
	} catch (e) {
		console.error("Failed to write s3 cache to disk", e);
	}
}

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

	const proxyAgent = getLoaderProxyAgent();

	cachedClient = new S3Client({
		endpoint: options.endpoint,
		region: options.region || "auto",
		credentials: {
			accessKeyId: options.accessKeyId,
			secretAccessKey: options.secretAccessKey,
		},
		forcePathStyle: options.forcePathStyle ?? true,
		...(proxyAgent
			? {
					requestHandler: new NodeHttpHandler({
						httpAgent: proxyAgent,
						httpsAgent: proxyAgent,
					}),
				}
			: {}),
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
			const cached = await readCache(cacheKey);

			if (cached?.isFresh) {
				logger.info(`Using fresh cache for ${cached.data.length} media items`);
				for (const item of cached.data) {
					store.set({
						id: item.id,
						data: item,
						rendered: { html: "" },
					});
				}
				return;
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

				await writeCache(cacheKey, results);

				logger.info(`Loaded ${results.length} media items from S3`);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				logger.error(`Error loading media from S3: ${errorMessage}`);

				// Fallback to cache if available
				if (cached) {
					logger.info(`Falling back to cache for ${cached.data.length} media items`);
					for (const item of cached.data) {
						store.set({
							id: item.id,
							data: item,
							rendered: { html: "" },
						});
					}
					return;
				}

				throw err;
			}
		},
	};
}
