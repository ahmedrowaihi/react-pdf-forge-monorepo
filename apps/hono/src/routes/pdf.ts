/**
 * PDF Generation Routes
 *
 * Showcases how to generate PDFs programmatically using PDF Forge
 */

import { render } from '@ahmedrowaihi/pdf-forge-core';
import { PlaywrightPdfService } from '@ahmedrowaihi/pdf-forge-printer';
import type { Hono } from 'hono';
import React from 'react';
import { CustomPdfTemplate, SimplePdfTemplate } from '../templates/simple-pdf';

const pdfService = new PlaywrightPdfService();

/**
 * Simple PDF endpoint - generates a basic PDF without any data
 *
 * GET /pdf
 *
 * @example
 * curl http://localhost:3000/pdf -o simple.pdf
 */
export function setupPdfRoutes(app: Hono) {
  app.get('/pdf', async (c) => {
    try {
      // Render the template to HTML
      const html = await render(React.createElement(SimplePdfTemplate));

      // Generate PDF from HTML
      const pdfBuffer = await pdfService.render({
        html,
        outputType: 'pdf',
        darkMode: false,
      });

      return c.body(Buffer.from(pdfBuffer), 200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="simple.pdf"',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      return c.json(
        {
          error: 'Failed to generate PDF',
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  /**
   * Custom PDF endpoint - generates PDF with custom data
   *
   * POST /pdf
   * Body: { title: string, content: string, name?: string }
   *
   * @example
   * curl -X POST http://localhost:3000/pdf \
   *   -H 'Content-Type: application/json' \
   *   -d '{"title":"My Document","content":"Hello World","name":"John"}' \
   *   -o custom.pdf
   */
  app.post('/pdf', async (c) => {
    try {
      let body: Record<string, unknown>;
      const contentType = c.req.header('content-type') || '';

      // Handle both JSON and form data
      if (contentType.includes('application/json')) {
        try {
          body = await c.req.json();
        } catch (parseError) {
          return c.json(
            {
              error: 'Invalid JSON in request body',
              details:
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError),
            },
            400,
          );
        }
      } else {
        // Handle form data
        const formData = await c.req.formData();
        body = {
          title: formData.get('title') || '',
          content: formData.get('content') || '',
          name: formData.get('name') || undefined,
        };
      }

      const title = typeof body.title === 'string' ? body.title : undefined;
      const content =
        typeof body.content === 'string' ? body.content : undefined;
      const name = typeof body.name === 'string' ? body.name : undefined;

      // Render template with custom props
      const html = await render(
        React.createElement(CustomPdfTemplate, { title, content, name }),
      );

      // Generate PDF with custom options
      const pdfBuffer = await pdfService.render({
        html,
        outputType: 'pdf',
        pdfOptions: {
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        },
      });

      const filename = (title || 'document').replace(/\s+/g, '-').toLowerCase();

      return c.body(Buffer.from(pdfBuffer), 200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      return c.json(
        {
          error: 'Failed to generate PDF',
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });
}
