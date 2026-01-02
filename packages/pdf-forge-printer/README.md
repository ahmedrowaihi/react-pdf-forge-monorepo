# @ahmedrowaihi/pdf-forge-printer

Playwright-based PDF and screenshot rendering service for React PDF Forge with browser pooling for 5-10x faster performance.

## Installation

```bash
pnpm add @ahmedrowaihi/pdf-forge-printer playwright
```

### Recommended: Install @sparticuz/chromium

The package uses `@sparticuz/chromium` as the default browser runtime. Install it for optimal performance:

```bash
pnpm add @sparticuz/chromium
```

**Note:** Check the [Puppeteer Chromium Support page](https://pptr.dev/chromium-support) to determine which version of `@sparticuz/chromium` matches your Playwright version.

If `@sparticuz/chromium` is not installed, the package will automatically fall back to Playwright's bundled Chromium.

## Usage

### Basic Usage

```typescript
import { PlaywrightPdfService } from "@ahmedrowaihi/pdf-forge-printer";

const pdfService = new PlaywrightPdfService();

// Generate PDF
const pdfBuffer = await pdfService.render({
  html: "<html>...</html>",
  outputType: "pdf",
  darkMode: false,
});

// Generate Screenshot
const screenshotBuffer = await pdfService.render({
  html: "<html>...</html>",
  outputType: "screenshot",
  darkMode: true,
});
```

### With Custom Logger and Pool Size

```typescript
import {
  PlaywrightPdfService,
  ConsoleLogger,
} from "@ahmedrowaihi/pdf-forge-printer";

const logger = new ConsoleLogger();
// Pool size: number of browser instances to keep alive (default: 3)
const pdfService = new PlaywrightPdfService(logger, 3);
```

### From URL

```typescript
const pdfBuffer = await pdfService.render({
  url: "https://example.com",
  outputType: "pdf",
});
```

## API

### `PlaywrightPdfService`

#### Constructor

```typescript
constructor(logger?: PdfLogger, poolSize?: number)
```

- `logger` (optional): Custom logger instance. Defaults to `ConsoleLogger`.
- `poolSize` (optional): Number of browser instances to keep in pool. Defaults to `3`.

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
  html: "<html><body>Hello World</body></html>",
  outputType: "pdf",
  darkMode: false,
});
```

## Features

- ✅ **Browser Pooling** - Reuses browser instances for 5-10x faster performance
- ✅ **A4 Format** - Simplified to A4 paper size
- ✅ **Dark Mode Support** - Native Playwright colorScheme emulation + class-based theming
- ✅ **Print Media Emulation** - Automatically applies `@media print` styles for PDFs
- ✅ **High-Quality Screenshots** - Full-page screenshots with disabled animations
- ✅ **CSS @page Support** - Respects `@page` CSS rules via `preferCSSPageSize: true`
- ✅ **Zero Margins** - Clean edge-to-edge rendering
- ✅ **Optimized Loading** - Uses `domcontentloaded` for faster page rendering

## Configuration

### Environment Variables

- `CHROMIUM_EXECUTABLE_PATH` - Path to custom Chromium executable (highest priority, overrides default)
- `SPARTICUZ_CHROMIUM_PATH` - Optional path or URL to Chromium pack (for `@sparticuz/chromium-min`)
- `SPARTICUZ_CHROMIUM_DISABLE_WEBGL` - Set to `"true"` to disable WebGL (may improve performance)

### Browser Selection Priority

1. **`CHROMIUM_EXECUTABLE_PATH`** - If set, uses this path (highest priority)
2. **`@sparticuz/chromium`** - Default browser if installed
3. **Playwright's bundled Chromium** - Fallback if `@sparticuz/chromium` is not available

### Using @sparticuz/chromium-min

If you're using the `-min` package (for smaller bundle sizes), provide the path to your Chromium pack:

```bash
export SPARTICUZ_CHROMIUM_PATH=/opt/chromium
# or
export SPARTICUZ_CHROMIUM_PATH=https://your-cdn.com/chromiumPack.tar
```

**Example setup:**

```typescript
import { PlaywrightPdfService } from "@ahmedrowaihi/pdf-forge-printer";

// Automatically uses @sparticuz/chromium if installed
// Falls back to Playwright's Chromium if not available
const pdfService = new PlaywrightPdfService();
```

### Default Settings

- **PDF Format:** A4 (210mm × 297mm)
- **Margins:** 0px on all sides
- **Print Background:** Enabled
- **Screenshot Scale:** CSS pixels (keeps file size small)
- **Animations:** Disabled for screenshots
- **Viewport:** 794px × 1123px (A4 at 96 DPI)

## How It Works

1. **Browser Pool** - Maintains a pool of 3 browser instances (reused across requests)
2. **Fast Acquisition** - Acquires browser from pool (0ms overhead vs 2-3s for new browser)
3. Creates a context with emulation options (colorScheme, locale, viewport)
4. Loads HTML content or navigates to URL (optimized with `domcontentloaded`)
5. Applies dark mode class if requested
6. Emulates print media for PDF generation
7. Captures PDF or screenshot using Playwright's native APIs
8. Returns browser to pool for reuse
9. Returns buffer as `Uint8Array`

## Performance

- **5-10x faster** than launching a new browser per request
- **Browser pooling** eliminates 2-3 second startup overhead
- **Optimized loading** uses `domcontentloaded` instead of `networkidle`
- **Performance flags** disable unnecessary Chrome features

## Integration with React PDF Forge

This package is used by `@ahmedrowaihi/pdf-forge-preview` for exporting templates. It works seamlessly with:

- Playwright handles page size via `format: 'A4'` and `emulateMedia({ media: 'print' })`
- `Theme` component - Class-based theming system
- `PrintStyles` component - Wraps `@media print` styles

## License

MIT
