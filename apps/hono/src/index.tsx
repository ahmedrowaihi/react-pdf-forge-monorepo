/**
 * PDF Forge Hono Example
 *
 * A showcase example demonstrating how to use PDF Forge with Hono
 * to generate PDFs programmatically and serve a preview interface.
 *
 * Features:
 * - PDF generation endpoints
 * - Programmatic preview server
 * - Asset bundling support
 */

import { render } from '@ahmedrowaihi/pdf-forge-core';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import React from 'react';
import { HomePage } from './components/home-page';
import { setupPdfRoutes } from './routes/pdf';
import { setupPreviewRoutes } from './routes/preview';

const app = new Hono();

app.get('/', async (c) => {
  const html = await render(React.createElement(HomePage));
  return c.html(html);
});

setupPdfRoutes(app);

await setupPreviewRoutes(app);

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(
      `🚀 PDF Forge Hono Example running on http://localhost:${info.port}`,
    );
    console.log('📄 PDF Endpoints:');
    console.log(`   GET  http://localhost:${info.port}/pdf`);
    console.log(`   POST http://localhost:${info.port}/pdf`);
    console.log('\n👀 Preview Server:');
    console.log(`   http://localhost:${info.port}/preview`);
    console.log('\n📚 API Info:');
    console.log(`   http://localhost:${info.port}/`);
  },
);
