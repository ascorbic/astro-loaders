// packages/github/src/github-commits-loader.ts
import type { Loader, LoaderContext } from "astro/loaders";
import { getLoaderFetch } from "@ascorbic/loader-utils";
import type { GitHubCommit, GitHubCommitFile, ProcessedCommit, GitHubLoaderOptions } from "./schema.js";

import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "src/content/content-metadata");

function getCacheFile(cacheKey: string): string {
	return `github-commits-${cacheKey.replace(/[:\/]/g, '_')}.json`;
}

async function readCache(cacheKey: string): Promise<{ data: ProcessedCommit[]; isFresh: boolean } | null> {
	try {
		const filePath = path.join(CACHE_DIR, getCacheFile(cacheKey));
		const stat = await fs.stat(filePath);
		const file = await fs.readFile(filePath, "utf-8");
		const data = JSON.parse(file) as ProcessedCommit[];
		const isFresh = Date.now() - stat.mtime.getTime() < 60 * 60 * 1000; // 1 hour
		return { data, isFresh };
	} catch {
		return null;
	}
}

async function writeCache(cacheKey: string, data: ProcessedCommit[]) {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		await fs.writeFile(path.join(CACHE_DIR, getCacheFile(cacheKey)), JSON.stringify(data, null, 2));
	} catch (e) {
		console.error("Failed to write github-commits cache to disk", e);
	}
}

function getCacheKey(options: GitHubLoaderOptions): string {
	return `${options.repo}:${options.perPage || 15}`;
}

const ETAG_KEY = (repo: string, perPage: number) => `gh-commits-etag:${repo}:${perPage}`;

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

				if (cached?.isFresh) {
					logger.info(`Using fresh cache for ${cached.data.length} commits`);
					for (const commit of cached.data) {
						const id = commit.shortSha;

						const digest = generateDigest({
							sha: commit.sha,
							message: commit.message,
							date: commit.date.toISOString(),
							filesLength: commit.files.length,
						});

						const parsed = await parseData({
							id,
							data: {
								...commit,
								date: commit.date.toISOString(),
							},
						});

						await store.set({
							id,
							data: parsed,
							digest,
						});
					}
					return;
				}

				const etagKey = ETAG_KEY(repo, perPage);
				const fetchImpl = getLoaderFetch();

				try {
					// Test if repo is accessible
					const testRes = await fetchImpl(`https://api.github.com/repos/${repo}`, {
						headers: getHeaders(token),
					});
				if (!testRes.ok) {
					const text = await testRes.text().catch(() => "");
					logger.error(`Cannot access repo ${repo}: ${testRes.status} - ${text.slice(0, 200)}`);
					return;
				}

				const url = `https://api.github.com/repos/${repo}/commits?per_page=${perPage}`;
				const headers = getHeaders(token);

				// ETag support
				const prevEtag = meta.get(etagKey);
				if (prevEtag) {
					headers["If-None-Match"] = prevEtag;
				}

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

					const res = await fetchImpl(url, { headers, signal: controller.signal });
				clearTimeout(timeoutId);

				if (res.status === 304) {
					logger.info(`Commits not modified (ETag hit) → keeping existing data`);
					return;
				}

				if (!res.ok) {
					throw new Error(`GitHub API error: ${res.status} ${await res.text().catch(() => "")}`);
				}

				const etag = res.headers.get("ETag");
				if (etag) meta.set(etagKey, etag);

				const commits = (await res.json()) as GitHubCommit[];

				logger.info(`Fetched ${commits.length} commits from ${repo}`);

				const detailedCommits = await Promise.all(
					commits.map(async (c, index) => {
						let files: ProcessedCommit["files"] = [];

						if (fetchFilesFor > 0 && index < fetchFilesFor) {
							try {
									const detailRes = await fetchImpl(
										`https://api.github.com/repos/${repo}/commits/${c.sha}`,
										{ headers }
									);

								if (detailRes.ok) {
									const detail = (await detailRes.json()) as { files?: GitHubCommitFile[] };
									files = (detail.files || []).map((f) => ({
										filename: f.filename,
										status: f.status,
										changes: f.changes,
										additions: f.additions,
										deletions: f.deletions,
									}));
								} else if (detailRes.status === 403 || detailRes.status === 429) {
									logger.warn(`Rate limit hit when fetching files for ${c.sha.slice(0, 7)}`);
								}
							} catch (e) {
								logger.warn(`Failed to fetch files for ${c.sha.slice(0, 7)}: ${e}`);
							}
						}

						return {
							sha: c.sha,
							shortSha: c.sha.slice(0, 7),
							message: c.commit?.message?.split("\n")[0]?.trim() ?? "",
							author: c.commit.author.name,
							date: new Date(c.commit.author.date),
							files,
						};
					})
				);

				await store.clear();

				for (const commit of detailedCommits) {
					const id = commit.shortSha;

					const digest = generateDigest({
						sha: commit.sha,
						message: commit.message,
						date: commit.date.toISOString(),
						filesLength: commit.files.length,
					});

					const parsed = await parseData({
						id,
						data: {
							...commit,
							date: commit.date.toISOString(),
						},
					});

					await store.set({
						id,
						data: parsed,
						digest,
					});
				}

				await writeCache(cacheKey, detailedCommits);

				logger.info(`Stored ${detailedCommits.length} commits`);
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "AbortError") {
					logger.error("GitHub request timeout");
				} else {
					logger.error(`Load failed: ${err instanceof Error ? err.message : err}`);
				}

				// Fallback to cache if available
				if (cached) {
					logger.info(`Falling back to cache for ${cached.data.length} commits`);
					for (const commit of cached.data) {
						const id = commit.shortSha;

						const digest = generateDigest({
							sha: commit.sha,
							message: commit.message,
							date: commit.date.toISOString(),
							filesLength: commit.files.length,
						});

						const parsed = await parseData({
							id,
							data: {
								...commit,
								date: commit.date.toISOString(),
							},
						});

						await store.set({
							id,
							data: parsed,
							digest,
						});
					}
					return;
				}

				throw err;
			}
		},
	};
}

function getHeaders(token?: string): Record<string, string> {
	const h: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "Astro-GitHub-Loader",
	};
	if (token) {
		h.Authorization = `Bearer ${token}`;
	}
	return h;
}
