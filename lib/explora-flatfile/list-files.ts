/**
 * GET /ota/file/operations/system/ — list the flatfile tree.
 *
 * The session token from authenticate() is consumed by this call. The
 * response is a tree of folders / children where leaf entries carry the
 * s3SignedUrl (60s expiry).
 *
 * This module flattens the tree into a list of leaves so the rest of the
 * pipeline doesn't have to walk it.
 */

import { getExploraConfig } from './env';

export interface RawTreeNode {
  data: {
    folderId: number | null;
    folderName: string | null;
    fileName: string | null;
    fileNameWithKeyPrefix: string | null;
    s3SignedUrl: string | null;
    lastModified: string | null;
    size: string | null;
  };
  children: RawTreeNode[];
}

export interface RawListResponse {
  data: RawTreeNode[];
  status: boolean;
  message: string | null;
  totalRecords: number;
  totalPages: number;
}

export interface FlatFile {
  /** Slash-joined folder path, e.g. "Pricing files/EUR". */
  folderPath: string;
  fileName: string;
  fileNameWithKeyPrefix: string;
  s3SignedUrl: string;
  lastModified: Date | null;
  size: string | null;
}

export class ExploraListError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ExploraListError';
    this.status = status;
  }
}

export async function listFiles(sessionToken: string): Promise<FlatFile[]> {
  const cfg = getExploraConfig();
  let res: Response;
  try {
    res = await fetch(cfg.filesUrl, {
      method: 'GET',
      headers: {
        Authorization: sessionToken,
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new ExploraListError(
      `Network error contacting ${cfg.filesUrl}: ${String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ExploraListError(
      `list-files failed (${res.status}). Body: ${truncate(body, 240)}`,
      res.status,
    );
  }

  const payload = (await res.json().catch(() => null)) as RawListResponse | null;
  if (!payload || payload.status !== true || !Array.isArray(payload.data)) {
    throw new ExploraListError(
      `list-files returned an unexpected payload shape: status=${payload?.status}`,
    );
  }

  return flattenTree(payload.data, []);
}

function flattenTree(nodes: RawTreeNode[], path: string[]): FlatFile[] {
  const out: FlatFile[] = [];
  for (const node of nodes) {
    const isFile = !!node.data.fileName && !!node.data.s3SignedUrl;
    if (isFile) {
      out.push({
        folderPath: path.join('/'),
        fileName: node.data.fileName!,
        fileNameWithKeyPrefix: node.data.fileNameWithKeyPrefix ?? '',
        s3SignedUrl: node.data.s3SignedUrl!,
        lastModified: node.data.lastModified ? new Date(node.data.lastModified) : null,
        size: node.data.size,
      });
    }
    if (node.children?.length) {
      const childPath = node.data.folderName
        ? [...path, node.data.folderName]
        : path;
      out.push(...flattenTree(node.children, childPath));
    }
  }
  return out;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
