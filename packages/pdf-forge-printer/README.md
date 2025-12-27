# @ahmedrowaihi/pdf-forge-printer

Playwright-based PDF and screenshot rendering service for React PDF Forge.

## Installation

```bash
pnpm add @ahmedrowaihi/pdf-forge-printer playwright
```

## Usage

### Basic Usage

```typescript
import { PlaywrightPdfService } from '@ahmedrowaihi/pdf-forge-printer';

const pdfService = new PlaywrightPdfService();

// Generate PDF
const pdfBuffer = await pdfService.render({
  html: '<html>...</html>',
  outputType: 'pdf',
  darkMode: false,
});

// Generate Screenshot
const screenshotBuffer = await pdfService.render({
  html: '<html>...</html>',
  outputType: 'screenshot',
  darkMode: true,
});
```

### With Custom Logger

```typescript
import {
  PlaywrightPdfService,
  ConsoleLogger,
} from '@ahmedrowaihi/pdf-forge-printer';

const logger = new ConsoleLogger();
const pdfService = new PlaywrightPdfService(logger);
```

### From URL

```typescript
const pdfBuffer = await pdfService.render({
  url: 'https://example.com',
  outputType: 'pdf',
});
```

## API

### `PlaywrightPdfService`

#### Constructor

```typescript
constructor(logger?: PdfLogger)
```

- `logger` (optional): Custom logger instance. Defaults to `ConsoleLogger`.

#### `render(input)`

Renders HTML or URL to PDF or screenshot.

**Parameters:**

```typescript
{
  html?: string;           // HTML content to render
  url?: string;            // URL to render (must provide html OR url)
  outputType: 'pdf' | 'screenshot';
  darkMode?: boolean;      // Enable dark mode (default: false)
}
```

**Returns:** `Promise<Uint8Array>` - Buffer containing PDF or PNG image

**Example:**

```typescript
const buffer = await pdfService.render({
  html: '<html><body>Hello World</body></html>',
  outputType: 'pdf',
  darkMode: false,
});
```

## Features

- ✅ **A4 Format Only** - Simplified to A4 paper size
- ✅ **Dark Mode Support** - Native Playwright colorScheme emulation + class-based theming
- ✅ **Print Media Emulation** - Automatically applies `@media print` styles for PDFs
- ✅ **High-Quality Screenshots** - Full-page screenshots with disabled animations
- ✅ **CSS @page Support** - Respects `@page` CSS rules via `preferCSSPageSize: true`
- ✅ **Zero Margins** - Clean edge-to-edge rendering

## Configuration

### Environment Variables

- `CHROMIUM_EXECUTABLE_PATH` - Path to custom Chromium executable (optional)

### Default Settings

- **PDF Format:** A4 (210mm × 297mm)
- **Margins:** 0px on all sides
- **Print Background:** Enabled
- **Screenshot Scale:** CSS pixels (keeps file size small)
- **Animations:** Disabled for screenshots
- **Viewport:** 794px × 1123px (A4 at 96 DPI)

## How It Works

1. Launches headless Chromium browser
2. Creates a context with emulation options (colorScheme, locale, viewport)
3. Loads HTML content or navigates to URL
4. Applies dark mode class if requested
5. Emulates print media for PDF generation
6. Captures PDF or screenshot using Playwright's native APIs
7. Returns buffer as `Uint8Array`

## Integration with React PDF Forge

This package is used by `@ahmedrowaihi/pdf-forge-preview` for exporting templates. It works seamlessly with:

- Playwright handles page size via `format: 'A4'` and `emulateMedia({ media: 'print' })`
- `Theme` component - Class-based theming system
- `PrintStyles` component - Wraps `@media print` styles

## License

MIT
