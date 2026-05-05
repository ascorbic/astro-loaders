// packages/github/src/github-commits-loader.ts
import type { Loader, LoaderContext } from "astro/loaders";
import { getLoaderFetch } from "@ascorbic/loader-utils";
import type {
	GitHubCommit,
	GitHubCommitFile,
	ProcessedCommit,
	GitHubLoaderOptions,
} from "./schema.js";

import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "src/content/content-metadata");
const CACHE_VERSION = "v1"; // ✅ 防 schema 变更

function getCacheFile(cacheKey: string): string {
	return `github-commits-${cacheKey}.json`;
}

function getCacheKey(options: GitHubLoaderOptions): string {
	return `${CACHE_VERSION}_${options.repo}_${options.perPage || 15}`;
}

async function readCache(
	cacheKey: string
): Promise<{ data: ProcessedCommit[]; isFresh: boolean } | null> {
	try {
		const filePath = path.join(CACHE_DIR, getCacheFile(cacheKey));
		const stat = await fs.stat(filePath);
		const file = await fs.readFile(filePath, "utf-8");

		const data = JSON.parse(file) as ProcessedCommit[];

		return {
			data: data.map((c) => ({
				...c,
				date: new Date(c.date),
			})),
			isFresh: Date.now() - stat.mtime.getTime() < 60 * 60 * 1000,
		};
	} catch {
		return null;
	}
}

async function writeCache(cacheKey: string, data: ProcessedCommit[]) {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		await fs.writeFile(
			path.join(CACHE_DIR, getCacheFile(cacheKey)),
			JSON.stringify(data, null, 2)
		);
	} catch (e) {
		console.error("Failed to write cache", e);
	}
}

const ETAG_KEY = (repo: string, perPage: number) =>
	`gh-commits-etag:${repo}:${perPage}`;

export function githubLoader(options: GitHubLoaderOptions): Loader {
	const {
		repo,
		token,
		perPage = 15,
		timeoutMs = 8000,
		fetchFilesFor = 0,
	} = options;

	return {
		name: "github",

		load: async ({ store, logger, parseData, meta, generateDigest }: LoaderContext) => {
			const cacheKey = getCacheKey(options);
			const cached = await readCache(cacheKey);

			// ✅ 优先使用 fresh cache
			if (cached?.isFresh) {
				logger.info(`Using fresh cache (${cached.data.length})`);
				await store.clear();

				for (const commit of cached.data) {
					await store.set({
						id: commit.shortSha,
						data: await parseData({
							id: commit.shortSha,
							data: serialize(commit),
						}),
						digest: getDigest(commit, generateDigest),
					});
				}
				return;
			}

			const fetchImpl = getLoaderFetch();
			const headers = getHeaders(token);

			const etagKey = ETAG_KEY(repo, perPage);
			const prevEtag = meta.get(etagKey);
			if (prevEtag) headers["If-None-Match"] = prevEtag;

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

			try {
				const res = await fetchImpl(
					`https://api.github.com/repos/${repo}/commits?per_page=${perPage}`,
					{ headers, signal: controller.signal }
				);

				clearTimeout(timeoutId);

				if (res.status === 304) {
					logger.info("ETag hit → skip update");
					return;
				}

				if (!res.ok) {
					throw new Error(`GitHub API ${res.status}`);
				}

				const etag = res.headers.get("ETag");
				if (etag) meta.set(etagKey, etag);

				const commits = (await res.json()) as GitHubCommit[];

				// ✅ 限制并发（关键优化）
				const detailed: ProcessedCommit[] = [];
				for (let i = 0; i < commits.length; i++) {
					const c = commits[i];

					let files: ProcessedCommit["files"] = [];

					if (i < fetchFilesFor) {
						try {
							const detailRes = await fetchImpl(
								`https://api.github.com/repos/${repo}/commits/${c.sha}`,
								{ headers }
							);

							if (detailRes.ok) {
								const detail = await detailRes.json();
								files = (detail.files || []).map((f: GitHubCommitFile) => ({
									filename: f.filename,
									status: f.status,
									changes: f.changes,
									additions: f.additions,
									deletions: f.deletions,
								}));
							}
						} catch (e) {
							logger.warn(`files fetch failed: ${c.sha}`);
						}
					}

					detailed.push({
						sha: c.sha,
						shortSha: c.sha.slice(0, 7),
						message: c.commit.message.split("\n")[0] || "",
						author: c.commit.author.name,
						date: new Date(c.commit.author.date),
						files,
					});
				}

				// ✅ 只有成功拿到数据才 clear
				await store.clear();

				for (const commit of detailed) {
					await store.set({
						id: commit.shortSha,
						data: await parseData({
							id: commit.shortSha,
							data: serialize(commit),
						}),
						digest: getDigest(commit, generateDigest),
					});
				}

				await writeCache(cacheKey, detailed);

				logger.info(`Stored ${detailed.length} commits`);
			} catch (err) {
				clearTimeout(timeoutId);

				logger.error(`Load failed: ${String(err)}`);

				if (cached) {
					logger.warn("Fallback to cache");
					await store.clear();

					for (const commit of cached.data) {
						await store.set({
							id: commit.shortSha,
							data: await parseData({
								id: commit.shortSha,
								data: serialize(commit),
							}),
							digest: getDigest(commit, generateDigest),
						});
					}
					return;
				}

				throw err;
			}
		},
	};
}

/* ---------------- utils ---------------- */

function serialize(commit: ProcessedCommit) {
	return {
		...commit,
		date: commit.date.toISOString(),
	};
}

function getDigest(commit: ProcessedCommit, generateDigest: any) {
	return generateDigest({
		sha: commit.sha,
		message: commit.message,
		date: commit.date.toISOString(),
		filesLength: commit.files.length,
	});
}

function getHeaders(token?: string): Record<string, string> {
	const h: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "Astro-GitHub-Loader",
	};
	if (token) h.Authorization = `Bearer ${token}`;
	return h;
}