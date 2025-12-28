import { access } from 'node:fs/promises';
import {
  type Browser,
  type BrowserContextOptions,
  type Page,
  chromium,
} from 'playwright';
import type { PageScreenshotOptions } from 'playwright';
import sharp, { type ResizeOptions } from 'sharp';
import type { PdfLogger } from './logger';
import { ConsoleLogger } from './logger';

type PDFOptions = Parameters<Page['pdf']>[0];

export interface RenderContextOptions {
  viewport?: {
    width: number;
    height: number;
  };
  deviceScaleFactor?: number;
  locale?: string;
  colorScheme?: 'light' | 'dark';
  isMobile?: boolean;
  hasTouch?: boolean;
  reducedMotion?: 'reduce' | 'no-preference';
  bypassCSP?: boolean;
}

export interface RenderScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
  scale?: 'css' | 'device';
  animations?: 'disabled' | 'allow';
  caret?: 'hide' | 'initial';
  omitBackground?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RenderPdfOptions {
  format?: 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
  width?: number;
  height?: number;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  outline?: boolean;
  scale?: number;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

// A4 dimensions in pixels at 96 DPI (standard web resolution)
// A4 = 210mm × 297mm = 8.27" × 11.69" = 794px × 1123px at 96 DPI
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

async function upscaleImage(
  inputBuffer: Buffer,
  resizeOptions?: ResizeOptions,
): Promise<Buffer> {
  const defaultOptions: ResizeOptions = {
    width: 1920,
    kernel: 'lanczos3' as const,
    fastShrinkOnLoad: false,
  };

  return await sharp(inputBuffer)
    .resize(resizeOptions ?? defaultOptions)
    .toBuffer();
}

export class PlaywrightPdfService {
  private readonly logger: PdfLogger;

  constructor(logger: PdfLogger = new ConsoleLogger()) {
    this.logger = logger;
  }

  private async launchBrowser(): Promise<Browser> {
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        // Bypass CSP (Content Security Policy)
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    };

    if (process.env.CHROMIUM_EXECUTABLE_PATH) {
      try {
        await access(process.env.CHROMIUM_EXECUTABLE_PATH);
        launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
        this.logger.debug(
          `Using system Chromium at: ${process.env.CHROMIUM_EXECUTABLE_PATH}`,
        );
      } catch {
        this.logger.warn(
          `Chromium path specified but not found: ${process.env.CHROMIUM_EXECUTABLE_PATH}, using Playwright's bundled browser`,
        );
      }
    }

    return chromium.launch(launchOptions);
  }

  async render(input: {
    html?: string;
    url?: string;
    outputType: 'pdf' | 'screenshot';
    darkMode?: boolean;
    contextOptions?: Partial<RenderContextOptions>;
    screenshotOptions?: Partial<RenderScreenshotOptions>;
    pdfOptions?: Partial<RenderPdfOptions>;
    sharpResizeOptions?: ResizeOptions;
  }): Promise<Uint8Array> {
    let browser: Browser | null = null;

    try {
      browser = await this.launchBrowser();

      const defaultContextOptions: RenderContextOptions = {
        colorScheme: input.darkMode ? 'dark' : 'light',
        locale: 'en-US',
        reducedMotion: 'reduce',
        viewport: { width: A4_WIDTH, height: A4_HEIGHT },
        isMobile: false,
        hasTouch: false,
        deviceScaleFactor: 2,
        bypassCSP: true,
      };

      const mergedContextOptions: RenderContextOptions = {
        ...defaultContextOptions,
        ...input.contextOptions,
        viewport:
          input.contextOptions?.viewport ?? defaultContextOptions.viewport,
      };

      const playwrightContextOptions: BrowserContextOptions = {
        colorScheme: mergedContextOptions.colorScheme,
        locale: mergedContextOptions.locale,
        reducedMotion: mergedContextOptions.reducedMotion,
        viewport: mergedContextOptions.viewport,
        isMobile: mergedContextOptions.isMobile,
        hasTouch: mergedContextOptions.hasTouch,
        deviceScaleFactor: mergedContextOptions.deviceScaleFactor,
        bypassCSP: mergedContextOptions.bypassCSP,
      };

      const context = await browser.newContext(playwrightContextOptions);

      const page = await context.newPage();

      page.on('console', (msg) =>
        this.logger.debug(`[Browser Log] ${msg.text()}`),
      );
      page.on('requestfailed', (request) => {
        this.logger.error(
          `[Browser Error] Failed to load resource: ${request.url()} - ${request.failure()?.errorText}`,
        );
      });

      if (input.url) {
        await page.goto(input.url, {
          waitUntil: 'load',
          timeout: 60000,
        });
        await page.waitForLoadState('networkidle', { timeout: 60000 });
      } else if (input.html) {
        await page.setContent(input.html, {
          waitUntil: 'load',
          timeout: 60000,
        });
        await page.waitForLoadState('networkidle', { timeout: 60000 });
      }

      if (input.darkMode) {
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        });
      }

      if (input.outputType === 'pdf') {
        await page.emulateMedia({ media: 'print' });
      }

      this.logger.log(`Page content loaded, generating ${input.outputType}...`);

      if (input.outputType === 'screenshot') {
        const defaultScreenshotOptions: RenderScreenshotOptions = {
          fullPage: true,
          type: 'png',
          scale: 'css',
          animations: 'disabled',
          caret: 'hide',
          omitBackground: true,
        };

        const mergedScreenshotOptions: RenderScreenshotOptions = {
          ...defaultScreenshotOptions,
          ...input.screenshotOptions,
        };

        const playwrightScreenshotOptions: PageScreenshotOptions = {
          fullPage: mergedScreenshotOptions.fullPage,
          type: mergedScreenshotOptions.type,
          quality: mergedScreenshotOptions.quality,
          scale: mergedScreenshotOptions.scale,
          animations: mergedScreenshotOptions.animations,
          caret: mergedScreenshotOptions.caret,
          omitBackground: mergedScreenshotOptions.omitBackground,
          clip: mergedScreenshotOptions.clip,
        };

        const screenshotBuffer = await page.screenshot(
          playwrightScreenshotOptions,
        );

        if (input.sharpResizeOptions) {
          const upscaledBuffer = await upscaleImage(
            Buffer.from(screenshotBuffer),
            input.sharpResizeOptions,
          );
          return new Uint8Array(upscaledBuffer);
        }

        return new Uint8Array(screenshotBuffer);
      }

      const defaultPdfOptions: RenderPdfOptions = {
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        outline: false,
        scale: 1,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
      };

      const mergedPdfOptions: RenderPdfOptions = {
        ...defaultPdfOptions,
        ...input.pdfOptions,
        margin: input.pdfOptions?.margin ?? defaultPdfOptions.margin,
      };

      const playwrightPdfOptions: PDFOptions = {
        format: mergedPdfOptions.format,
        width: mergedPdfOptions.width,
        height: mergedPdfOptions.height,
        printBackground: mergedPdfOptions.printBackground,
        preferCSSPageSize: mergedPdfOptions.preferCSSPageSize,
        displayHeaderFooter: mergedPdfOptions.displayHeaderFooter,
        headerTemplate: mergedPdfOptions.headerTemplate,
        footerTemplate: mergedPdfOptions.footerTemplate,
        outline: mergedPdfOptions.outline,
        scale: mergedPdfOptions.scale,
        margin: mergedPdfOptions.margin,
      };

      const pdfBuffer = await page.pdf(playwrightPdfOptions);
      return new Uint8Array(pdfBuffer);
    } catch (error) {
      this.logger.error('Playwright error:', error);
      if (error instanceof Error && error.message.includes('browser')) {
        this.logger.error('\n💡 Troubleshooting tips:');
        this.logger.error('   1. Make sure Chromium is installed');
        this.logger.error(
          '   2. Try running: bunx playwright install chromium',
        );
        this.logger.error('   3. Check system permissions');
      }
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }
}
