'use server';

import { PlaywrightPdfService } from '@ahmedrowaihi/pdf-forge-printer';
import { z } from 'zod';
import { getAssetRegistry } from '../utils/asset-registry';
import { getTemplatePathFromSlug } from './get-template-path-from-slug';
import { renderTemplateByPath } from './render-template-by-path';
import { baseActionClient } from './safe-action';

const pdfService = new PlaywrightPdfService();

/**
 * Process HTML to replace relative asset URLs with base64 data URIs using asset registry
 *
 * Performance: Uses in-memory cache (zero file I/O after first scan)
 * Strategy: Multiple simple regex passes (faster than complex combined pattern)
 *
 * Why regex over AST?
 * - Regex: ~1-5ms for 200KB HTML (simple string ops)
 * - AST: ~25-80ms (parse + traverse + serialize overhead)
 * - HTML is well-formed from React, so regex is safe and faster
 */
function embedAssetsInHtml(
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

/**
 * Export a single template as a PDF or HTML file.
 * Renders the template on the server and bundles assets automatically.
 */
export const exportSingleTemplate = baseActionClient
  .metadata({
    actionName: 'exportSingleTemplate',
  })
  .inputSchema(
    z.object({
      templateSlug: z.string(),
      format: z.enum(['html', 'pdf', 'screenshot']).default('html'),
      darkMode: z.boolean().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const templatePath = await getTemplatePathFromSlug(
        parsedInput.templateSlug,
      );

      const renderingResult = await renderTemplateByPath(templatePath);
      if ('error' in renderingResult) {
        throw new Error(
          `Failed to render template: ${renderingResult.error.message}`,
        );
      }

      let html = renderingResult.markup;

      if (parsedInput.format !== 'html') {
        const assetRegistry = await getAssetRegistry(templatePath);
        html = embedAssetsInHtml(html, assetRegistry);
      }

      if (parsedInput.format === 'html') {
        return {
          name: renderingResult.basename,
          html,
          format: 'html' as const,
          status: 'succeeded' as const,
        };
      }

      let buffer: Uint8Array;
      let mimeType: string;

      if (parsedInput.format === 'pdf') {
        buffer = await pdfService.render({
          html,
          outputType: 'pdf',
          darkMode: parsedInput.darkMode,
        });
        mimeType = 'application/pdf';
      } else {
        buffer = await pdfService.render({
          html,
          outputType: 'screenshot',
          darkMode: parsedInput.darkMode,
          sharpResizeOptions: {
            width: 2480,
            height: 3508,
            fit: 'cover',
            position: 'center',
            kernel: 'lanczos3' as const,
            withoutEnlargement: false,
          },
        });
        mimeType = 'image/png';
      }

      const base64 = Buffer.from(buffer).toString('base64');

      return {
        name: renderingResult.basename,
        data: base64,
        format: parsedInput.format,
        mimeType,
        status: 'succeeded' as const,
      };
    } catch (error) {
      console.error('Template export error:', error);
      throw new Error(
        `Failed to export template. ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });
