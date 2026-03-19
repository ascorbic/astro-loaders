// packages/github/src/schema.ts
export interface GitHubCommit {
	sha: string;
	commit: {
		message: string;
		author: {
			name: string;
			date: string;
		};
	};
	author?: { avatar_url?: string };
}

export interface GitHubCommitFile {
	sha: string;
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	changes: number;
}

export interface ProcessedCommit {
	sha: string;
	shortSha: string;
	message: string;
	author: string;
	date: Date;
	files: Pick<GitHubCommitFile, "filename" | "status" | "changes" | "additions" | "deletions">[];
}

export interface GitHubLoaderOptions {
	/** GitHub repository in the format "owner/repo" */
	repo: string;
	/** GitHub personal access token for higher rate limits */
	token?: string;
	/** Number of commits to fetch per page */
	perPage?: number;
	/** Request timeout in milliseconds */
	timeoutMs?: number;
	/** Number of recent commits to fetch files for (0 = none) */
	fetchFilesFor?: number;
}
