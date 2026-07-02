/**
 * Download an S3-presigned URL from the flatfile API.
 *
 * The signed URL expires in ~60 seconds — call this immediately after
 * listFiles() returns. Do NOT add an Authorization header; the signing is
 * baked into the URL's query string.
 */

import { Buffer } from 'node:buffer';

export class ExploraDownloadError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ExploraDownloadError';
    this.status = status;
  }
}

export async function downloadFile(s3SignedUrl: string): Promise<Buffer> {
  let res: Response;
  try {
    res = await fetch(s3SignedUrl, { method: 'GET' });
  } catch (err) {
    throw new ExploraDownloadError(
      `Network error fetching presigned URL: ${String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ExploraDownloadError(
      `S3 download failed (${res.status}). The presigned URL may have expired (60s TTL) — re-list and try again. Body: ${truncate(body, 240)}`,
      res.status,
    );
  }

  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
