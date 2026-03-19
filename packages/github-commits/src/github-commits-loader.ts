// packages/github/src/github-commits-loader.ts
import type { Loader, LoaderContext } from "astro/loaders";
import type { GitHubCommit, GitHubCommitFile, ProcessedCommit, GitHubLoaderOptions } from "./schema.js";

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
			const etagKey = ETAG_KEY(repo, perPage);

			try {
				// Test if repo is accessible
				const testRes = await fetch(`https://api.github.com/repos/${repo}`, {
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

				const res = await fetch(url, { headers, signal: controller.signal });
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
								const detailRes = await fetch(
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
						data: commit,
					});

					await store.set({
						id,
						data: parsed,
						digest,
					});
				}

				logger.info(`Stored ${detailedCommits.length} commits`);
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "AbortError") {
					logger.error("GitHub request timeout");
				} else {
					logger.error(`Load failed: ${err instanceof Error ? err.message : err}`);
				}
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
