/**
 * Preview Server Routes
 *
 * Showcases how to embed the PDF Forge preview server programmatically
 * This allows you to browse and preview templates in the browser
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Hono } from 'hono';
import { createPreviewHandler } from '../utils/preview-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup preview server routes
 *
 * This creates a preview server that allows browsing templates at:
 * - GET /preview - List all available templates
 * - GET /preview/* - Preview a specific template
 *
 * The preview server also handles:
 * - /fonts/* - Font assets from template static directories
 * - /static/* - Static assets from template static directories
 * - /_next/* - Next.js internal assets
 *
 * @example
 * Visit http://localhost:3000/preview to browse templates
 * Visit http://localhost:3000/preview/simple-pdf to preview a template
 */
export async function setupPreviewRoutes(app: Hono) {
  const previewHandler = await createPreviewHandler({
    templatesDir: path.join(__dirname, '../templates'),
    baseRoute: '/preview',
  });

  // Single handler that routes internally based on path
  // Handles: /preview, /preview/*, /fonts/*, /static/*, /_next/*
  app.all('*', async (c) => previewHandler(c.req.raw));
}
