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
const CACHE_VERSION = "v2"; // 🔥 建议升级（schema 有改动）

function getCacheKey(options: GitHubLoaderOptions): string {
  return `${CACHE_VERSION}_${options.repo}_${options.perPage ?? 15}`;
}

function getCacheFile(cacheKey: string): string {
  return `github-commits-${cacheKey}.json`;
}

/* ---------------- CACHE ---------------- */
async function readCache(cacheKey: string) {
  try {
    const filePath = path.join(CACHE_DIR, getCacheFile(cacheKey));
    const [fileContent, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ]);

    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed)) return null;

    const data: ProcessedCommit[] = parsed
      .map(safeParseCachedCommit)
      .filter((c): c is ProcessedCommit => c !== null);

    return {
      data,
      isFresh: Date.now() - stat.mtimeMs < 60 * 60 * 1000, // 1小时
    };
  } catch {
    return null;
  }
}

async function writeCache(cacheKey: string, data: ProcessedCommit[]) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const serializable = data.map((c) => ({
      ...c,
      date: c.date.toISOString(),
    }));

    await fs.writeFile(
      path.join(CACHE_DIR, getCacheFile(cacheKey)),
      JSON.stringify(serializable, null, 2),
    );
  } catch (e) {
    console.warn("⚠️ Failed to write GitHub cache (this is non-fatal):", e);
  }
}

/* ---------------- TYPE GUARDS & HELPERS ---------------- */
function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

function safeParseCachedCommit(input: unknown): ProcessedCommit | null {
  if (!input || typeof input !== "object") return null;
  const c = input as any;

  const date = new Date(c.date);
  if (!isValidDate(date)) return null;

  return {
    sha: String(c.sha),
    shortSha: String(c.shortSha),
    message: String(c.message || ""),
    author: String(c.author || "unknown"),
    date,
    files: Array.isArray(c.files) ? c.files : [],
  };
}

function cleanCommitMessage(msg: string): string {
  if (!msg) return "";
  msg = msg.replace(/[\u{1F300}-\u{1FAFF}]/gu, ""); // 移除 emoji
  if (/^merge\b/i.test(msg)) return "";
  return (msg.split("\n")[0] ?? "").trim();
}

function isValidCommit(c: ProcessedCommit): boolean {
  return !!(c.sha && c.message && isValidDate(c.date));
}

/* ---------------- STORE HELPERS ---------------- */
async function safeStoreBatch(
  commits: ProcessedCommit[],
  store: LoaderContext["store"],
  parseData: LoaderContext["parseData"],
  generateDigest: LoaderContext["generateDigest"],
  logger: LoaderContext["logger"],
) {
  for (const commit of commits) {
    if (!isValidCommit(commit)) continue;

    try {
      const parsed = await parseData({
        id: commit.shortSha,
        data: {
          ...commit,
          date: commit,
        },
      });

      await store.set({
        id: commit.shortSha,
        data: parsed,
        digest: generateDigest({
          sha: commit.sha,
          message: commit.message,
          date: commit,
          filesLength: commit.files.length,
        }),
      });
    } catch (e) {
      logger.warn(`Skipped bad commit ${commit.shortSha}: ${e}`);
    }
  }
}

/* ---------------- MAIN LOADER ---------------- */
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

    load: async (context: LoaderContext) => {
      const { store, logger, parseData, meta, generateDigest } = context;

      const cacheKey = getCacheKey(options);
      const cached = await readCache(cacheKey);

      // 优先使用新鲜缓存
      if (cached?.isFresh) {
        logger.info(`Using fresh cache (${cached.data.length} commits)`);
        await store.clear();
        await safeStoreBatch(
          cached.data,
          store,
          parseData,
          generateDigest,
          logger,
        );
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
          { headers, signal: controller.signal },
        );

        clearTimeout(timeoutId);

        if (res.status === 304) {
          logger.info("ETag hit → skip update");
          return;
        }

        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

        const etag = res.headers.get("ETag");
        if (etag) meta.set(etagKey, etag);

        const rawCommits = (await res.json()) as GitHubCommit[];
        const processed: ProcessedCommit[] = [];

        for (let i = 0; i < rawCommits.length; i++) {
          const c = rawCommits[i];
          if (!c?.commit?.author?.date) continue;

          const date = new Date(c.commit.author.date);
          if (!isValidDate(date)) continue;

          const message = cleanCommitMessage(c.commit.message || "");
          if (!message) continue;

          let files: ProcessedCommit["files"] = [];

          if (i < fetchFilesFor) {
            try {
              const detailRes = await fetchImpl(
                `https://api.github.com/repos/${repo}/commits/${c.sha}`,
                { headers },
              );
              if (detailRes.ok) {
                const detail = (await detailRes.json()) as {
                  files?: GitHubCommitFile[];
                };
                files = (detail.files || []).map((f) => ({
                  filename: f.filename,
                  status: f.status,
                  changes: f.changes,
                  additions: f.additions,
                  deletions: f.deletions,
                }));
              }
            } catch {
              logger.warn(`Failed to fetch files for ${c.sha.slice(0, 7)}`);
            }
          }

          const commit: ProcessedCommit = {
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            message,
            author: c.commit.author.name || "unknown",
            date,
            files,
          };

          if (isValidCommit(commit)) processed.push(commit);
        }

        await store.clear();
        await safeStoreBatch(
          processed,
          store,
          parseData,
          generateDigest,
          logger,
        );
        await writeCache(cacheKey, processed);

        logger.info(`Stored ${processed.length} commits`);
      } catch (err) {
        clearTimeout(timeoutId);
        logger.error(`GitHub loader failed: ${err}`);

        if (cached?.data.length) {
          logger.warn("Falling back to cache");
          await store.clear();
          await safeStoreBatch(
            cached.data,
            store,
            parseData,
            generateDigest,
            logger,
          );
          return;
        }

        throw err;
      }
    },
  };
}

/* ---------------- HEADERS ---------------- */
function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Astro-GitHub-Loader",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
