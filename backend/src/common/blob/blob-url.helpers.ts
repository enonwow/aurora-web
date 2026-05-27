export interface BlobObjectUrlSettings {
  endpoint: string;
  bucket: string;
  forcePathStyle: boolean;
}

export function buildS3ObjectUrl(bucket: string, objectKey: string): string {
  const normalizedObjectKey = objectKey.replace(/^\/+/u, "");
  return `s3://${bucket}/${normalizedObjectKey}`;
}

export function buildBlobObjectHttpUrl(
  settings: BlobObjectUrlSettings,
  objectKey: string
): string {
  const endpoint = settings.endpoint.replace(/\/+$/u, "");
  const encodedSegments = objectKey
    .replace(/^\/+|\/+$/gu, "")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (settings.forcePathStyle) {
    return `${endpoint}/${encodeURIComponent(settings.bucket)}/${encodedSegments}`;
  }

  return `${endpoint}/${encodedSegments}`;
}
