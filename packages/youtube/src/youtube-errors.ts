/**
 * Base class for all YouTube-related errors
 */
export class YouTubeError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
    options?: { cause?: unknown },
  ) {
    // Construct the full message with URL context
    const fullMessage = url 
      ? `${message} (URL: ${url})${options?.cause instanceof Error ? ` - ${options.cause.message}` : ""}`
      : message;

    super(fullMessage, options);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when YouTube API request fails due to network or API issues
 */
export class YouTubeAPIError extends YouTubeError {
  constructor(
    message: string,
    url: string,
    public readonly statusCode: number,
    public readonly apiError?: string,
    public readonly apiErrorData?: any,
    options?: { cause?: unknown },
  ) {
    super(message, url, options);
  }

  /**
   * Check if this is a quota exceeded error
   */
  get isQuotaExceeded(): boolean {
    return this.statusCode === 403 && 
           (this.apiError?.includes("quota") || 
            this.apiErrorData?.error?.errors?.some((e: any) => e.reason === "quotaExceeded"));
  }

  /**
   * Check if this is an invalid API key error
   */
  get isInvalidAPIKey(): boolean {
    return this.statusCode === 403 && 
           (this.apiError?.includes("API key") || 
            this.apiErrorData?.error?.errors?.some((e: any) => e.reason === "keyInvalid"));
  }

  /**
   * Check if this is a video not found error
   */
  get isVideoNotFound(): boolean {
    return this.statusCode === 404 || 
           this.apiErrorData?.error?.errors?.some((e: any) => e.reason === "videoNotFound");
  }
}

/**
 * Error thrown when YouTube data is invalid or malformed
 */
export class YouTubeValidationError extends YouTubeError {
  constructor(
    message: string,
    url?: string,
    public readonly details?: string,
    options?: { cause?: unknown },
  ) {
    super(message, url, options);
  }
}

/**
 * Error thrown when YouTube API configuration is invalid
 */
export class YouTubeConfigurationError extends YouTubeError {
  constructor(
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, undefined, options);
  }
}

/**
 * Union type of all concrete YouTube error types
 */
export type YouTubeErrorTypes = YouTubeAPIError | YouTubeValidationError | YouTubeConfigurationError;