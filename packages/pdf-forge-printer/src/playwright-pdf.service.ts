import type { PageScreenshotOptions } from 'playwright';
import {
  type Browser,
  type BrowserContextOptions,
  chromium,
  type Page,
} from 'playwright';
import sharp, { type ResizeOptions } from 'sharp';
import type { PdfLogger } from './logger';
import { ConsoleLogger } from './logger';

type PDFOptions = Parameters<Page['pdf']>[0];

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export interface RenderContextOptions {
  viewport?: {
    width: number;
    height: number;
  };
  colorScheme?: 'light' | 'dark';
  locale?: string;
  reducedMotion?: 'reduce' | 'no-preference';
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
  bypassCSP?: boolean;
}

export interface RenderPdfOptions {
  format?: 'A4' | 'Letter';
  width?: string;
  height?: string;
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

export interface RenderScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
  scale?: 'css' | 'device';
  animations?: 'disabled' | 'allow';
  caret?: 'hide' | 'show';
  omitBackground?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Browser pool for reusing browser instances
 * This dramatically improves performance by avoiding browser launch overhead
 */
class BrowserPool {
  private browsers: Browser[] = [];
  private readonly maxSize: number;
  private readonly logger: PdfLogger;

  constructor(maxSize = 3, logger: PdfLogger = new ConsoleLogger()) {
    this.maxSize = maxSize;
    this.logger = logger;
  }

  async acquire(): Promise<Browser> {
    if (this.browsers.length > 0) {
      const browser = this.browsers.pop()!;

      if (browser.isConnected()) {
        return browser;
      }
    }

    if (this.browsers.length < this.maxSize) {
      return await this.createBrowser();
    }

    this.logger.warn('Browser pool exhausted, creating temporary browser');
    return await this.createBrowser();
  }

  release(browser: Browser): void {
    if (this.browsers.length < this.maxSize && browser.isConnected()) {
      this.browsers.push(browser);
    } else {
      browser.close().catch((err) => {
        this.logger.error('Error closing browser:', err);
      });
    }
  }

  private async createBrowser(): Promise<Browser> {
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    };

    if (process.env.CHROMIUM_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
    }

    return chromium.launch(launchOptions);
  }

  async closeAll(): Promise<void> {
    await Promise.all(
      this.browsers.map((browser) => browser.close().catch(() => {})),
    );
    this.browsers = [];
  }
}

/**
 * Playwright PDF service with browser pooling
 * Reuses browser instances for 5-10x faster performance
 */
export class PlaywrightPdfService {
  private readonly logger: PdfLogger;
  private readonly browserPool: BrowserPool;

  constructor(logger: PdfLogger = new ConsoleLogger(), poolSize = 3) {
    this.logger = logger;
    this.browserPool = new BrowserPool(poolSize, logger);
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
    const browser = await this.browserPool.acquire();
    let context: Awaited<ReturnType<Browser['newContext']>> | null = null;
    let page: Page | null = null;

    try {
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

      context = await browser.newContext(playwrightContextOptions);
      page = await context.newPage();

      if (input.url) {
        await page.goto(input.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        await page.evaluate(() => {
          return new Promise<void>((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', () => resolve(), { once: true });
            }
          });
        });
      } else if (input.html) {
        await page.setContent(input.html, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
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
          caret: mergedScreenshotOptions.caret as 'hide' | 'initial',
          omitBackground: mergedScreenshotOptions.omitBackground,
          clip: mergedScreenshotOptions.clip,
        };

        const screenshotBuffer = await page.screenshot(
          playwrightScreenshotOptions,
        );

        if (input.sharpResizeOptions) {
          const upscaledBuffer = await sharp(Buffer.from(screenshotBuffer))
            .resize(input.sharpResizeOptions)
            .toBuffer();
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
      this.logger.error('PDF generation error:', error);
      throw error;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});

      this.browserPool.release(browser);
    }
  }

  /**
   * Clean up all browsers (call on shutdown)
   */
  async close(): Promise<void> {
    await this.browserPool.closeAll();
  }
}
