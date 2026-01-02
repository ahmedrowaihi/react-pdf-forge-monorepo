'use server';

import type { PlaywrightPdfService as PlaywrightPdfServiceType } from '@ahmedrowaihi/pdf-forge-printer';
import { z } from 'zod';
import { getTemplatePathFromSlug } from './get-template-path-from-slug';
import { renderTemplateByPath } from './render-template-by-path';
import { baseActionClient } from './safe-action';

let pdfService: PlaywrightPdfServiceType | null = null;

async function getPdfService() {
  if (!pdfService) {
    const { PlaywrightPdfService } = await import(
      '@ahmedrowaihi/pdf-forge-printer'
    );
    pdfService = new PlaywrightPdfService(undefined, 3);
  }
  return pdfService;
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

      const html = renderingResult.markup;

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
        const service = await getPdfService();
        buffer = await service.render({
          html,
          outputType: 'pdf',
          darkMode: parsedInput.darkMode,
        });
        mimeType = 'application/pdf';
      } else {
        const service = await getPdfService();
        buffer = await service.render({
          html,
          outputType: 'screenshot',
          darkMode: parsedInput.darkMode,
          sharpResizeOptions: {
            width: 2480,
            height: 3508,
            fit: 'inside',
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
