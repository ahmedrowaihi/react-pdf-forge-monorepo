import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Asset Registry - In-memory cache for template assets
 *
 * Strategy: Lazy-loading cache with template-level scoping
 * - First export: Scan static/ directory, cache all assets as base64
 * - Subsequent exports: Use cached data (zero file I/O)
 * - Cache key: templatePath → Map<url, base64>
 *
 * Benefits:
 * - Fast: O(1) lookups, no file I/O after first scan
 * - Memory efficient: Only caches assets for templates that are exported
 * - ISR-friendly: Cache persists across requests
 */

interface AssetCacheEntry {
  base64: string;
  mtime: number;
}

const templateAssetCache = new Map<string, Map<string, AssetCacheEntry>>();

/**
 * Recursively scan a directory and return all files with their relative paths
 */
async function scanDirectoryRecursive(
  dir: string,
  baseDir: string = dir,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        const subFiles = await scanDirectoryRecursive(fullPath, baseDir);
        for (const [relPath, absPath] of subFiles) {
          files.set(relPath, absPath);
        }
      } else {
        files.set(relativePath, fullPath);
      }
    }
  } catch {
    return files;
  }

  return files;
}

/**
 * Load a file and convert it to base64 data URI
 */
async function loadAssetAsBase64(
  filePath: string,
  url: string,
): Promise<{ base64: string; mtime: number }> {
  const stats = await fs.stat(filePath);
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString('base64');

  const ext = path.extname(url).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  const dataUri = `data:${mimeType};base64,${base64}`;

  return { base64: dataUri, mtime: stats.mtimeMs };
}

/**
 * Get or build asset registry for a template
 *
 * @param templatePath - Absolute path to the template file
 * @returns Map of asset URLs to base64 data URIs
 */
export async function getAssetRegistry(
  templatePath: string,
): Promise<Map<string, string>> {
  const cached = templateAssetCache.get(templatePath);
  if (cached) {
    const result = new Map<string, string>();
    for (const [url, entry] of cached) {
      result.set(url, entry.base64);
    }
    return result;
  }

  const templateDir = path.dirname(templatePath);
  const staticDir = path.join(templateDir, 'static');

  const assetMap = new Map<string, AssetCacheEntry>();

  try {
    await fs.access(staticDir);
  } catch {
    templateAssetCache.set(templatePath, assetMap);
    return new Map<string, string>();
  }

  const files = await scanDirectoryRecursive(staticDir, staticDir);

  for (const [relativePath, absolutePath] of files) {
    const url = `/${relativePath.replace(/\\/g, '/')}`;
    const { base64, mtime } = await loadAssetAsBase64(absolutePath, url);

    assetMap.set(url, { base64, mtime });
    if (url.startsWith('/')) {
      assetMap.set(url.slice(1), { base64, mtime });
    }
  }

  templateAssetCache.set(templatePath, assetMap);

  const result = new Map<string, string>();
  for (const [url, entry] of assetMap) {
    result.set(url, entry.base64);
  }
  return result;
}

/**
 * Clear cache for a specific template (useful for hot-reload scenarios)
 */
export function clearAssetCache(templatePath: string): void {
  templateAssetCache.delete(templatePath);
}

/**
 * Clear all asset caches
 */
export function clearAllAssetCaches(): void {
  templateAssetCache.clear();
}
