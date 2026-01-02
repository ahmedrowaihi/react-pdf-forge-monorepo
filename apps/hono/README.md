# PDF Forge Hono Example

A showcase example demonstrating how to use PDF Forge with Hono to generate PDFs programmatically and serve a preview interface.

## Features

- ✅ **PDF Generation** - Generate PDFs from React components
- ✅ **Preview Server** - Browse and preview templates in the browser
- ✅ **Asset Bundling** - Automatically bundle fonts and static assets
- ✅ **Framework Agnostic** - Works with any framework that supports Web Request/Response

## Installation

```bash
pnpm install
```

**Note:** After installing, you need to install Playwright browsers:

```bash
npx playwright install chromium
```

## Development

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### PDF Generation

#### `GET /pdf`

Generate a simple PDF without any data.

**Example:**

```bash
curl http://localhost:3000/pdf -o simple.pdf
```

#### `POST /pdf`

Generate a PDF with custom data.

**Request Body:**

```json
{
  "title": "My Document",
  "content": "This is the content of my PDF document.",
  "name": "John Doe"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/pdf \
  -H "Content-Type: application/json" \
  -d '{"title": "Invoice", "content": "Invoice #12345", "name": "Customer Name"}' \
  -o invoice.pdf
```

**Note:** Make sure to use double quotes for the header and single quotes for the JSON body to avoid shell escaping issues.

### Preview Server

#### `GET /preview`

Browse all available templates in the browser.

**Example:**
Open `http://localhost:3000/preview` in your browser

#### `GET /preview/*`

Preview a specific template.

**Example:**

- `http://localhost:3000/preview/simple-pdf` - Preview the simple PDF template

### API Info

#### `GET /`

Get API information and available endpoints.

**Example:**

```bash
curl http://localhost:3000/
```

## Project Structure

```
src/
├── index.tsx              # Main application entry point
├── routes/
│   ├── pdf.ts            # PDF generation routes
│   └── preview.ts        # Preview server setup
├── templates/            # PDF templates (React components)
│   └── simple-pdf.tsx    # Example template
└── utils/
    └── preview-server.ts  # Preview server utility
```

## How It Works

### PDF Generation

1. **Create React Components** → Define PDF templates using React components
2. **Render to HTML** → Use `render()` from `@ahmedrowaihi/pdf-forge-core` to convert React to HTML
3. **HTML to PDF** → Use `PlaywrightPdfService` from `@ahmedrowaihi/pdf-forge-printer` to convert HTML to PDF (with browser pooling for 5-10x faster performance)

### Preview Server

The preview server is embedded programmatically using `createPreviewHandler()`. It:

- Starts a Next.js preview server on a random port
- Proxies requests to handle preview routes, static assets, and Next.js internals
- Automatically serves fonts and static assets from template directories

## Code Examples

### Simple PDF Generation

```typescript
import { render } from "@ahmedrowaihi/pdf-forge-core";
import { PlaywrightPdfService } from "@ahmedrowaihi/pdf-forge-printer";
import { SimplePdfTemplate } from "./templates/simple-pdf";

const pdfService = new PlaywrightPdfService();

// Render template to HTML
const html = await render(React.createElement(SimplePdfTemplate));

// Generate PDF
const pdfBuffer = await pdfService.render({
  html,
  outputType: "pdf",
});
```

### Custom PDF with Data

```typescript
const html = await render(
  React.createElement(CustomPdfTemplate, { title, content, name })
);

const pdfBuffer = await pdfService.render({
  html,
  outputType: "pdf",
  pdfOptions: {
    format: "A4",
    margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
  },
});
```

### Preview Server Setup

```typescript
import { createPreviewHandler } from "./utils/preview-server";

const previewHandler = await createPreviewHandler({
  templatesDir: "./templates",
  baseRoute: "/preview",
});

// Register with your framework
app.all("*", async (c) => previewHandler(c.req.raw));
```

## Dependencies

- `hono` - Fast web framework
- `@ahmedrowaihi/pdf-forge-components` - React components for PDFs
- `@ahmedrowaihi/pdf-forge-core` - Render React to HTML
- `@ahmedrowaihi/pdf-forge-preview` - Preview server
- `@ahmedrowaihi/pdf-forge-printer` - Convert HTML to PDF (uses Playwright)
- `react` & `react-dom` - React runtime

## Notes

- Make sure Playwright browsers are installed (`npx playwright install chromium`)
- The PDF service uses Playwright in headless mode
- All PDFs are generated in A4 format by default
- The preview server automatically handles static assets from template directories
