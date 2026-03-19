// packages/s3/src/schema.ts
export interface MediaItem extends Record<string, unknown> {
	id: string;
	name: string;
	ext: string;
	url: string;
	size?: number;
	lastModified?: Date;
}

export interface S3LoaderOptions {
	/** S3 endpoint URL */
	endpoint: string;
	/** S3 bucket name */
	bucket: string;
	/** AWS access key ID */
	accessKeyId: string;
	/** AWS secret access key */
	secretAccessKey: string;
	/** AWS region (default: "auto" for Cloudflare R2) */
	region?: string;
	/** Prefix to filter objects */
	prefix?: string;
	/** Force path-style URLs */
	forcePathStyle?: boolean;
	/** Public base URL for media files */
	publicBaseUrl: string;
	/** Allowed file extensions */
	extensions?: string[];
	/** Max keys per request */
	maxKeys?: number;
}
