import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Asset Registry - Embeds static assets (fonts, images) as base64 data URIs
 */

interface AssetCacheEntry {
  base64: string;
  mtime: number;
}

// Separate caches for template-specific and shared assets
const templateAssetCache = new Map<string, Map<string, AssetCacheEntry>>();
const sharedAssetCache = new Map<string, Map<string, AssetCacheEntry>>();

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
 * Get or build asset registry for a shared/fallback static directory
 * This is cached separately and reused across all templates
 */
async function getSharedAssetRegistry(
  fallbackStaticDir: string,
): Promise<Map<string, AssetCacheEntry>> {
  const cached = sharedAssetCache.get(fallbackStaticDir);
  if (cached) {
    return cached;
  }

  const assetMap = new Map<string, AssetCacheEntry>();

  try {
    await fs.access(fallbackStaticDir);
    const files = await scanDirectoryRecursive(
      fallbackStaticDir,
      fallbackStaticDir,
    );

    for (const [relativePath, absolutePath] of files) {
      const url = `/${relativePath.replace(/\\/g, '/')}`;
      const { base64, mtime } = await loadAssetAsBase64(absolutePath, url);

      assetMap.set(url, { base64, mtime });
      if (url.startsWith('/')) {
        assetMap.set(url.slice(1), { base64, mtime });
      }
    }
  } catch {}

  sharedAssetCache.set(fallbackStaticDir, assetMap);
  return assetMap;
}

/**
 * Get or build asset registry for a static directory
 *
 * @param staticDir - Absolute path to the static directory
 * @param fallbackStaticDir - Optional fallback static directory (lower priority)
 * @returns Map of asset URLs to base64 data URIs
 */
export async function getAssetRegistry(
  staticDir: string,
  fallbackStaticDir?: string,
): Promise<Map<string, string>> {
  const templateCached = templateAssetCache.get(staticDir);
  let templateAssetMap: Map<string, AssetCacheEntry>;

  if (templateCached) {
    templateAssetMap = templateCached;
  } else {
    templateAssetMap = new Map<string, AssetCacheEntry>();

    try {
      await fs.access(staticDir);
      const files = await scanDirectoryRecursive(staticDir, staticDir);

      for (const [relativePath, absolutePath] of files) {
        const url = `/${relativePath.replace(/\\/g, '/')}`;
        const { base64, mtime } = await loadAssetAsBase64(absolutePath, url);

        templateAssetMap.set(url, { base64, mtime });
        if (url.startsWith('/')) {
          templateAssetMap.set(url.slice(1), { base64, mtime });
        }
      }
    } catch {}

    templateAssetCache.set(staticDir, templateAssetMap);
  }

  const result = new Map<string, string>();

  for (const [url, entry] of templateAssetMap) {
    result.set(url, entry.base64);
  }

  if (fallbackStaticDir) {
    const sharedAssetMap = await getSharedAssetRegistry(fallbackStaticDir);
    for (const [url, entry] of sharedAssetMap) {
      if (!result.has(url)) {
        result.set(url, entry.base64);
      }
    }
  }

  return result;
}

/**
 * Process HTML to replace relative asset URLs with base64 data URIs
 */
export function embedAssetsInHtml(
  html: string,
  assetRegistry: Map<string, string>,
): string {
  const getBase64 = (url: string): string | undefined => {
    return (
      assetRegistry.get(url) ||
      assetRegistry.get(`/${url}`) ||
      assetRegistry.get(url.slice(1))
    );
  };

  const shouldSkip = (url: string): boolean => {
    return (
      url.startsWith('data:') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('#') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:')
    );
  };

  let processedHtml = html;

  // Pattern 1: CSS url() - matches url('/fonts/...') or url("/fonts/...")
  processedHtml = processedHtml.replace(
    /url\((['"]?)([^'")]+)\1\)/gi,
    (match: string, quote: string, url: string) => {
      if (shouldSkip(url)) return match;
      const base64 = getBase64(url);
      return base64 ? `url(${quote}${base64}${quote})` : match;
    },
  );

  // Pattern 2: src attribute - matches src="/fonts/..." or src='/fonts/...'
  processedHtml = processedHtml.replace(
    /src\s*=\s*(['"])([^'"]+)\1/gi,
    (match: string, quote: string, url: string) => {
      if (shouldSkip(url)) return match;
      const base64 = getBase64(url);
      return base64 ? `src=${quote}${base64}${quote}` : match;
    },
  );

  // Pattern 3: href attribute - matches href="/fonts/..." or href='/fonts/...'
  processedHtml = processedHtml.replace(
    /href\s*=\s*(['"])([^'"]+)\1/gi,
    (match: string, quote: string, url: string) => {
      if (shouldSkip(url)) return match;
      const base64 = getBase64(url);
      return base64 ? `href=${quote}${base64}${quote}` : match;
    },
  );

  return processedHtml;
}
