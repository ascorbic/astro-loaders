# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo for Astro loaders using pnpm workspaces. The main packages are:

- `packages/` - Individual loader packages (`@ascorbic/*`)
- `packages/utils/` - Shared utilities (`@ascorbic/loader-utils`)
- `demos/` - Demo applications using the loaders

Each loader package follows the same structure:

- `src/` - TypeScript source code with main loader implementation
- `dist/` - Built output (generated)
- `test/` - Vitest test files

## Common Commands

All commands should be run from the repository root.

### Development

- `pnpm build` - Build all packages
- `pnpm test` - Run tests for all packages
- `pnpm check` - Run type checking and linting for all packages

### Package-specific commands

- `pnpm run --filter @ascorbic/csv-loader build` - Build specific package
- `pnpm run --filter @ascorbic/csv-loader test` - Test specific package
- `pnpm run --filter @ascorbic/csv-loader check` - Check specific package

### Demo development (from demos/loaders/)

- `pnpm run dev` - Start Astro dev server
- `pnpm run build` - Build demo site

## Architecture

### Loader Pattern

All loaders implement the Astro `Loader` interface:

- `name` - Identifier for the loader
- `load(options: LoaderContext)` - Main loading function that syncs data to Astro's store

### Shared Utilities

`@ascorbic/loader-utils` provides common functionality:

- `getConditionalHeaders()` - HTTP conditional request headers
- `storeConditionalHeaders()` - Store HTTP cache headers in meta

### Build System

- Uses `tsup` for TypeScript compilation to ESM
- `publint` and `@arethetypeswrong/cli` for package validation
- Workspace dependencies use `workspace:^` protocol

### Testing

- Vitest for unit testing
- Tests in `test/` directories within each package
