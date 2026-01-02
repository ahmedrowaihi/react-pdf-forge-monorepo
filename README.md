<div align="center"><strong>React PDF Render</strong></div>
<div align="center">The next generation of writing PDF templates.<br />High-quality components for creating PDFs with React.</div>
<br />
<div align="center">
<a href="https://react-pdf-forge.com">Website</a>
<span> · </span>
<a href="https://github.com/ahmedrowaihi/react-pdf-forge-monorepo">GitHub</a>
</div>

## Introduction

A collection of high-quality components for creating beautiful PDF templates using React and TypeScript.
It simplifies PDF generation with proper page settings, print styles, and page break controls.

## Why

PDF template development is fragmented and painful. Teams use different templating engines (Handlebars, EJS), write manual HTML, or struggle with low-level PDF APIs—reinventing the wheel on every project.

**PDF Forge changes that.** Just like [React Email](https://github.com/resend/react-email) revolutionized email templates, PDF Forge brings modern React development to PDF generation:

**Zero boilerplate** - Focus on content, not formatting
**Component-based** - Build reusable templates like React components
**Live preview** - See changes instantly with `pdf dev`
**Framework agnostic** - Works with any Node.js backend
**Portable** - Version, test, and reuse templates across projects

Stop wrestling with HTML/CSS quirks and PDF rendering edge cases. Write React components the way you already know, and let PDF Forge handle the complexity.

## Install

Install the components package from your command line.

#### With yarn

```sh
yarn add @ahmedrowaihi/pdf-forge-components -E
```

#### With npm

```sh
npm install @ahmedrowaihi/pdf-forge-components -E
```

#### With pnpm

```sh
pnpm install @ahmedrowaihi/pdf-forge-components -E
```

## Getting started

### Basic Usage

Create a PDF template using React components:

```jsx
import {
  Document,
  PrintStyles,
  Body,
} from "@ahmedrowaihi/pdf-forge-components";
import { render } from "@ahmedrowaihi/pdf-forge-core";

const PDFTemplate = () => {
  return (
    <Document>
      <PrintStyles>
        {`
          body { font-family: Arial, sans-serif; }
        `}
      </PrintStyles>
      <Body>
        <h1>Hello World</h1>
        <p>Your PDF content here</p>
      </Body>
    </Document>
  );
};

const html = await render(<PDFTemplate />);
```

### Programmatic PDF Generation

Generate PDFs programmatically in your backend (Node.js, NestJS, Hono, etc.):

```tsx
import { render } from "@ahmedrowaihi/pdf-forge-core";
import { PlaywrightPdfService } from "@ahmedrowaihi/pdf-forge-printer";
import React from "react";

// Your PDF template component
const InvoiceTemplate = ({ invoice }) => (
  <Document>
    <Body>
      <h1>Invoice #{invoice.id}</h1>
      <p>Amount: ${invoice.amount}</p>
    </Body>
  </Document>
);

// Generate PDF
const pdfService = new PlaywrightPdfService();
const html = await render(React.createElement(InvoiceTemplate, { invoice }));
const pdfBuffer = await pdfService.render({
  html,
  outputType: "pdf",
  pdfOptions: {
    format: "A4",
    margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
  },
});
```

### Asset Bundling

Automatically bundle fonts and static assets into your PDFs:

```tsx
import { render } from "@ahmedrowaihi/pdf-forge-core";

const html = await render(React.createElement(MyTemplate), {
  bundleAssets: {
    staticDir: "./templates/my-template/static", // Template-specific assets
    fallbackStaticDir: "./templates/shared/static", // Shared assets
  },
});
```

Assets are automatically:

- Scanned from template and shared directories
- Converted to base64 data URIs
- Embedded directly in the HTML
- Cached for performance

### Preview Server Integration

Embed the preview server into any framework that supports Web Request/Response. The preview handler utility starts a Next.js preview server and proxies requests to it:

```tsx
// See apps/hono/src/utils/preview-server.ts for the implementation
import { createPreviewHandler } from "./utils/preview-server";
import { Hono } from "hono";

const app = new Hono();

// Create preview handler
const previewHandler = await createPreviewHandler({
  templatesDir: "./templates",
  baseRoute: "/preview",
});

// Register with your framework
app.all("*", async (c) => previewHandler(c.req.raw));

// Now visit http://localhost:3000/preview to browse templates
```

See the [Hono example](./apps/hono) for a complete implementation with the preview handler utility.

## Components

A set of standard components to help you build PDF templates:

- **Document** - Wrapper component for PDF documents
- **PrintStyles** - Define print-specific CSS styles (Playwright handles page size via `format: 'A4'`)
- **PageBreak** - Control page breaks in your document
- **Html, Head, Body** - Document structure primitives
- **Font** - Load custom fonts for your PDFs

## CLI

Use the `pdf-dev` CLI to preview and build your PDF templates:

```sh
# Install the CLI
npm install -D @ahmedrowaihi/pdf-forge-cli

# Start development server
npx pdf-dev dev

# Build templates
npx pdf-dev export
```

## Development workflow

1. Create PDF templates in your `templates/` directory
2. Use `pdf-dev dev` to preview templates in the browser
3. Export templates with `pdf-dev export`
4. Use the rendered HTML with a PDF generation library (e.g., Playwright, Puppeteer)

## Examples

### Hono Example

A complete example showing PDF generation and preview server integration with Hono:

```bash
cd apps/hono
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to see:

- PDF generation endpoints (`GET /pdf`, `POST /pdf`)
- Preview server at `/preview` to browse templates
- Custom PDF generation with form data

See [apps/hono/README.md](./apps/hono/README.md) for full documentation.

## Contributing

Contributions are welcome! Please see our contributing guidelines.

## License

MIT License
