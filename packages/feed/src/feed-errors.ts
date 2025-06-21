/**
 * Base class for all feed-related errors
 */
export abstract class FeedError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    options?: { cause?: unknown },
  ) {
    // Construct the full message with URL context
    const fullMessage = `${message} (URL: ${url})${
      options?.cause instanceof Error ? ` - ${options.cause.message}` : ""
    }`;

    super(fullMessage, options);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when feed loading fails due to network or fetch issues
 */
export class FeedLoadError extends FeedError {
  constructor(
    message: string,
    url: string,
    public readonly code: string,
    public readonly statusCode?: number,
    options?: { cause?: unknown },
  ) {
    super(message, url, options);
  }
}

/**
 * Error thrown when feed data is invalid or malformed
 */
export class FeedValidationError extends FeedError {
  constructor(
    message: string,
    url: string,
    public readonly details?: string,
    options?: { cause?: unknown },
  ) {
    super(message, url, options);
  }
}

/**
 * Union type of all concrete feed error types
 */
export type FeedErrorTypes = FeedLoadError | FeedValidationError;
