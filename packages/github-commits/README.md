# Astro GitHub Commits Loader

This package provides a GitHub commits loader for Astro. It allows you to load commits from any GitHub repository and use them as content in your Astro project.

## Installation

```sh
npm install @ascorbic/github-commits
```

## Usage

This package requires Astro 5.0.0 or later.

You can use the GitHub loader in your content collection configuration:

```typescript
// src/content/config.ts
import { defineCollection } from "astro:content";
import { githubLoader } from "@ascorbic/github-commits";

const commits = defineCollection({
  loader: githubLoader({
    repo: "owner/repo",
    token: import.meta.env.GITHUB_TOKEN,
    perPage: 15,
    fetchFilesFor: 5,
  }),
});

export const collections = { commits };
```

You can then use these like any other content collection in Astro:

```astro
---
import { getCollection } from "astro:content";
const commits = await getCollection("commits");
---

<ul>
  {commits.map((commit) => (
    <li>
      <strong>{commit.data.shortSha}</strong> - {commit.data.message}
      <br />
      <small>by {commit.data.author} on {commit.data.date.toDateString()}</small>
    </li>
  ))}
</ul>
```

## Options

The `githubLoader` function takes an object with the following options:

- `repo` (required): GitHub repository in the format "owner/repo"
- `token` (optional): GitHub personal access token for higher API rate limits
- `perPage` (optional): Number of commits to fetch per page (default: 15)
- `timeoutMs` (optional): Request timeout in milliseconds (default: 8000)
- `fetchFilesFor` (optional): Number of recent commits to fetch files for (default: 0)

## Data Structure

Each commit item contains:

- `sha`: Full commit SHA
- `shortSha`: Shortened 7-character SHA
- `message`: Commit message (first line)
- `author`: Author name
- `date`: Commit date
- `files`: Array of changed files (if fetchFilesFor > 0)

Each file contains:

- `filename`: File path
- `status`: File status (added, modified, deleted)
- `changes`: Total changes
- `additions`: Number of additions
- `deletions`: Number of deletions
