import { existsSync, promises as fs } from 'node:fs';
import type http from 'node:http';
import path from 'node:path';
import type url from 'node:url';
import { lookup } from 'mime-types';

/**
 * Extracts the template directory path from the referer URL.
 * @param referer - The referer header value
 * @returns The template directory path, or null if not found
 */
const extractTemplatePathFromReferer = (referer: string): string | null => {
  try {
    const refererUrl = new URL(referer);
    const previewMatch = refererUrl.pathname.match(/\/preview\/(.+)$/);
    if (!previewMatch?.[1]) {
      return null;
    }

    const templateSlug = previewMatch[1];
    return templateSlug.replace(/\.(tsx|jsx|ts|js)$/, '');
  } catch {
    return null;
  }
};

/**
 * Recursively searches for a static file starting from the template directory
 * and traversing up to the templates root directory.
 * @param templateFullPath - Full path to the template directory
 * @param templatesDirResolved - Resolved path to the templates root directory
 * @param relativeFilePath - Relative path to the file within the static folder
 * @returns Absolute path to the found file, or null if not found
 */
const findStaticFileRecursively = (
  templateFullPath: string,
  templatesDirResolved: string,
  relativeFilePath: string,
): string | null => {
  let currentDir = templateFullPath;

  while (currentDir.startsWith(templatesDirResolved)) {
    const staticPath = path.join(currentDir, 'static', relativeFilePath);
    if (existsSync(staticPath)) {
      return staticPath;
    }

    // Move up one directory level
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  return null;
};

export const serveStaticFile = async (
  res: http.ServerResponse,
  parsedUrl: url.UrlWithParsedQuery,
  staticDirRelativePath: string,
  templatesDirRelativePath?: string,
  req?: http.IncomingMessage,
) => {
  const originalPath = parsedUrl.pathname!;
  const pathname = originalPath.startsWith('/static')
    ? originalPath.replace('/static', './static')
    : `./static${originalPath}`;
  const ext = path.parse(pathname).ext;

  const staticBaseDir = path.resolve(process.cwd(), staticDirRelativePath);
  let fileAbsolutePath: string | null = null;

  if (templatesDirRelativePath && req?.headers.referer) {
    const templateDirPath = extractTemplatePathFromReferer(req.headers.referer);

    if (templateDirPath) {
      const templatesDir = path.resolve(
        process.cwd(),
        templatesDirRelativePath,
      );
      const templateFullPath = path.join(templatesDir, templateDirPath);
      const relativeFilePath = pathname.replace('./static/', '');
      const templatesDirResolved = path.resolve(templatesDir);

      fileAbsolutePath = findStaticFileRecursively(
        templateFullPath,
        templatesDirResolved,
        relativeFilePath,
      );
    }
  }

  // Fallback to root static directory
  if (!fileAbsolutePath) {
    fileAbsolutePath = path.resolve(staticBaseDir, pathname);
    if (!fileAbsolutePath.startsWith(staticBaseDir)) {
      res.statusCode = 403;
      res.end();
      return;
    }
  }

  try {
    const fileHandle = await fs.open(fileAbsolutePath, 'r');

    const fileData = await fs.readFile(fileHandle);

    // if the file is found, set Content-type and send data
    res.setHeader('Content-type', lookup(ext) || 'text/plain');
    res.end(fileData);

    void fileHandle.close();
  } catch (exception) {
    if (!existsSync(fileAbsolutePath)) {
      res.statusCode = 404;
      res.end();
    } else {
      const sanitizedFilePath = fileAbsolutePath.replace(/\n|\r/g, '');
      console.error(
        `Could not read file at %s to be served, here's the exception:`,
        sanitizedFilePath,
        exception,
      );

      res.statusCode = 500;
      res.end(
        'Could not read file to be served! Check your terminal for more information.',
      );
    }
  }
};
