// packages/github/src/schema.ts

/** GitHub API 返回的原始 Commit 数据结构（精简版） */
export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string; // ISO 字符串
    };
  };
  author?: {
    login?: string;
    avatar_url?: string;
  };
  files?: GitHubCommitFile[]; // 仅在获取单个 commit 详情时返回
}

/** GitHub Commit 文件变更信息 */
export interface GitHubCommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  // 可选字段
  sha?: string;
  blob_url?: string;
  raw_url?: string;
  patch?: string;
}

/** 处理后用于 Astro Content Collection 的 Commit 数据 */
export interface ProcessedCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: Date;
  files: Array<{
    filename: string;
    status: string;
    changes: number;
    additions: number;
    deletions: number;
  }>;
}

/** GitHub Loader 配置选项 */
export interface GitHubLoaderOptions {
  /** GitHub 仓库，格式 "owner/repo" */
  repo: string;

  /** GitHub Personal Access Token（推荐用于提高请求限额） */
  token?: string;

  /** 每次请求获取的 commit 数量 */
  perPage?: number;

  /** 请求超时时间（毫秒） */
  timeoutMs?: number;

  /** 为最近 N 条 commit 额外获取文件变更详情（0 = 不获取） */
  fetchFilesFor?: number;
}