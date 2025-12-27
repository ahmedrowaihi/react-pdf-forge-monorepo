'use server';

import { PlaywrightPdfService } from '@ahmedrowaihi/pdf-forge-printer';
import { z } from 'zod';
import { baseActionClient } from './safe-action';

const pdfService = new PlaywrightPdfService();

/**
 * Export a single template as a PDF or HTML file.
 * Uses Playwright directly for PDF/screenshot generation.
 */
export const exportSingleTemplate = baseActionClient
  .metadata({
    actionName: 'exportSingleTemplate',
  })
  .inputSchema(
    z.object({
      name: z.string(),
      html: z.string(),
      format: z.enum(['html', 'pdf', 'screenshot']).default('html'),
      darkMode: z.boolean().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    if (parsedInput.format === 'html') {
      // Return HTML content for client-side download
      return Promise.resolve({
        name: parsedInput.name,
        html: parsedInput.html,
        format: 'html' as const,
        status: 'succeeded' as const,
      });
    }

    // Use Playwright service directly for PDF or screenshot generation
    try {
      let buffer: Uint8Array;
      let mimeType: string;

      if (parsedInput.format === 'pdf') {
        buffer = await pdfService.render({
          html: parsedInput.html,
          outputType: 'pdf',
          darkMode: parsedInput.darkMode,
        });
        mimeType = 'application/pdf';
      } else {
        // screenshot
        buffer = await pdfService.render({
          html: parsedInput.html,
          outputType: 'screenshot',
          darkMode: parsedInput.darkMode,
        });
        mimeType = 'image/png';
      }

      // Convert Uint8Array to base64 for transmission
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        name: parsedInput.name,
        data: base64,
        format: parsedInput.format,
        mimeType,
        status: 'succeeded' as const,
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(
        `Failed to generate ${parsedInput.format}. ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });
