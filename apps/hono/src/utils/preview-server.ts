/**
 * Embed the preview server programmatically
 *
 * This utility starts the preview server on a random port
 * and proxies requests to it - much simpler than trying to embed Next.js directly!
 *
 * @example
 * ```ts
 * import { createPreviewHandler } from "./utils/preview-server";
 *
 * const handler = await createPreviewHandler({
 *   templatesDir: "./templates",
 *   baseRoute: "/preview"
 * });
 *
 * app.all("*", async (c) => handler(c.req.raw));
 * ```
 */

import http from 'node:http';
import path from 'node:path';
import url, { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PreviewHandlerOptions {
  /**
   * Path to templates directory
   */
  templatesDir: string;
  /**
   * Base route where preview will be mounted (e.g., "/preview")
   * This is used to strip the prefix from URLs before passing to Next.js
   */
  baseRoute?: string;
}

async function getPreviewServerLocation(): Promise<string> {
  const possiblePaths = [
    path.resolve(process.cwd(), 'node_modules/@ahmedrowaihi/pdf-forge-preview'),
    path.resolve(
      __dirname,
      '../../node_modules/@ahmedrowaihi/pdf-forge-preview',
    ),
  ];

  const fs = await import('node:fs/promises');

  for (const possiblePath of possiblePaths) {
    try {
      const packageJsonPath = path.join(possiblePath, 'package.json');
      await fs.access(packageJsonPath);
      return possiblePath;
    } catch {}
  }

  throw new Error(
    'Could not find "@ahmedrowaihi/pdf-forge-preview" package. Make sure it is installed in node_modules.',
  );
}

function getEnvVariablesForPreviewApp(
  relativePathToTemplatesDirectory: string,
  previewServerLocation: string,
  cwd: string,
) {
  return {
    TEMPLATES_DIR_RELATIVE_PATH: relativePathToTemplatesDirectory,
    TEMPLATES_DIR_ABSOLUTE_PATH: path.resolve(
      cwd,
      relativePathToTemplatesDirectory,
    ),
    PREVIEW_SERVER_LOCATION: previewServerLocation,
    USER_PROJECT_LOCATION: cwd,
  } as const;
}

/**
 */
async function findStaticDirs(
  dir: string,
  fs: typeof import('node:fs/promises'),
): Promise<string[]> {
  const staticDirs: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        const staticDir = path.join(fullPath, 'static');
        try {
          const stats = await fs.stat(staticDir);
          if (stats.isDirectory()) {
            staticDirs.push(staticDir);
          }
        } catch {}
        const subStaticDirs = await findStaticDirs(fullPath, fs);
        staticDirs.push(...subStaticDirs);
      }
    }
  } catch {}
  return staticDirs;
}

/**
 *
 * @param assetPath - The requested asset path (e.g., "/fonts/myfont.woff2")
 * @param templatesDir - Root templates directory
 * @param templateContext - Optional template path context (e.g., "template-name/main")
 *                          If provided, will prioritize assets from this template's static directory
 */
async function serveStaticAsset(
  assetPath: string,
  templatesDir: string,
  templateContext?: string,
): Promise<Response | null> {
  const templatesDirAbsolute = path.resolve(templatesDir);
  const fs = await import('node:fs/promises');

  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;

  try {
    const staticDirs = await findStaticDirs(templatesDirAbsolute, fs);

    let prioritizedStaticDir: string | null = null;
    if (templateContext) {
      const templateDirPath = templateContext.split('/').slice(0, -1).join('/');
      const possibleStaticDir = path.join(
        templatesDirAbsolute,
        templateDirPath,
        'static',
      );
      try {
        const stats = await fs.stat(possibleStaticDir);
        if (stats.isDirectory()) {
          prioritizedStaticDir = possibleStaticDir;
        }
      } catch {}
    }

    const searchOrder = prioritizedStaticDir
      ? [
          prioritizedStaticDir,
          ...staticDirs.filter((d) => d !== prioritizedStaticDir),
        ]
      : staticDirs;

    for (const staticDir of searchOrder) {
      const assetFile = path.join(staticDir, cleanPath);
      try {
        await fs.access(assetFile);
        const stats = await fs.stat(assetFile);
        if (stats.isFile()) {
          const buffer = (await fs.readFile(assetFile)) as unknown as BodyInit;
          const ext = path.extname(assetFile).toLowerCase();

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
            '.css': 'text/css',
            '.js': 'application/javascript',
          };

          const contentType = mimeTypes[ext] || 'application/octet-stream';

          return new Response(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      } catch {}
    }
  } catch {}

  return null;
}

/**
 * Start the preview server on a random port and return a single handler
 * that routes internally based on the request path
 *
 * @example
 * ```ts
 * const handler = await createPreviewHandler({
 *   templatesDir: "./templates",
 *   baseRoute: "/preview"
 * });
 *
 * // Works with any framework - just register with app.all()
 * app.all("/*", async (c) => handler(c.req.raw));
 * ```
 */
export async function createPreviewHandler(
  options: PreviewHandlerOptions,
): Promise<(request: Request) => Promise<Response>> {
  const { templatesDir, baseRoute = '/preview' } = options;

  const previewServerLocation = await getPreviewServerLocation();

  const templatesDirRelativePath = path.relative(
    process.cwd(),
    path.resolve(templatesDir),
  );

  const envVars = getEnvVariablesForPreviewApp(
    templatesDirRelativePath,
    previewServerLocation,
    process.cwd(),
  );

  Object.assign(process.env, {
    ...process.env,
    NODE_ENV: 'development',
    ...envVars,
    NEXT_PUBLIC_IS_PREVIEW_DEVELOPMENT: 'true',
  });

  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const Module = require('node:module');
  const originalResolveFilename = (Module as any)._resolveFilename;

  if (originalResolveFilename) {
    (Module as any)._resolveFilename = function (
      request: string,
      parent: any,
      isMain: boolean,
      options: any,
    ) {
      const resolvedRequest = request;
      return originalResolveFilename.call(
        this,
        resolvedRequest,
        parent,
        isMain,
        options,
      );
    };
  }

  const next = (await import('next')).default;

  const app = next({
    dev: false,
    conf: {
      images: {
        unoptimized: true,
      },
    },
    hostname: 'localhost',
    port: 0,
    dir: previewServerLocation,
  });

  await app.prepare();
  const nextHandleRequest = app.getRequestHandler();

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(404);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url, true);

    res.setHeader(
      'Cache-Control',
      'no-cache, max-age=0, must-revalidate, no-store',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');

    try {
      nextHandleRequest(req, res, parsedUrl);
    } catch (e) {
      console.error('Preview server error:', e);
      res.writeHead(500);
      res.end();
    }
  });

  const port = await new Promise<number>((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve(address.port);
      } else {
        reject(new Error('Could not get server port'));
      }
    });
    server.on('error', reject);
  });

  const serverUrl = `http://localhost:${port}`;

  function getTemplateContext(request: Request): string | undefined {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.pathname.startsWith(`${baseRoute}/`)) {
          return refererUrl.pathname.slice(baseRoute.length + 1);
        }
      } catch {}
    }
    return undefined;
  }

  async function proxyToNext(
    request: Request,
    pathname: string,
  ): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = new URL(pathname + url.search, serverUrl);

    const headers = new Headers(request.headers);
    headers.delete('accept-encoding');

    const origin = url.origin;

    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
    headers.set('x-forwarded-for', url.hostname);
    headers.set('host', targetUrl.host);

    if (origin) {
      headers.set('origin', origin);
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body ? await request.arrayBuffer() : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const isPreviewPath =
      pathname.startsWith('/fonts/') ||
      pathname.startsWith('/static/') ||
      pathname.startsWith('/_next/') ||
      (baseRoute && pathname.startsWith(baseRoute));

    if (!isPreviewPath) {
      return new Response('Not Found', { status: 404 });
    }

    if (pathname.startsWith('/fonts/')) {
      const templateContext = getTemplateContext(request);
      const staticResponse = await serveStaticAsset(
        pathname,
        templatesDir,
        templateContext,
      );
      return staticResponse || new Response('Not Found', { status: 404 });
    }

    if (pathname.startsWith('/static/')) {
      const templateContext = getTemplateContext(request);
      const staticResponse = await serveStaticAsset(
        pathname,
        templatesDir,
        templateContext,
      );
      return staticResponse || new Response('Not Found', { status: 404 });
    }

    if (pathname.startsWith('/_next/')) {
      return proxyToNext(request, pathname);
    }

    let adjustedPathname = pathname;
    if (baseRoute && pathname.startsWith(baseRoute)) {
      if (pathname === baseRoute || pathname === `${baseRoute}/`) {
        adjustedPathname = '/';
      } else {
        adjustedPathname = pathname;
      }
    }

    return proxyToNext(request, adjustedPathname);
  };
}
