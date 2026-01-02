import type {
  Browser,
  BrowserContextOptions,
  Page,
  PageScreenshotOptions,
} from 'playwright';
import sharp, { type ResizeOptions } from 'sharp';
import type { PdfLogger } from './logger';
import type {
  RenderContextOptions,
  RenderPdfOptions,
  RenderScreenshotOptions,
} from './playwright-pdf.service';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

type PDFOptions = Parameters<Page['pdf']>[0];

export interface RenderInput {
  html?: string;
  url?: string;
  outputType: 'pdf' | 'screenshot';
  darkMode?: boolean;
  contextOptions?: Partial<RenderContextOptions>;
  screenshotOptions?: Partial<RenderScreenshotOptions>;
  pdfOptions?: Partial<RenderPdfOptions>;
  sharpResizeOptions?: ResizeOptions;
}

/**
 * Handles the actual rendering logic (PDF and screenshots)
 * Separated from browser management for better testability
 */
export class Renderer {
  constructor(private readonly logger: PdfLogger) {}

  /**
   * Renders content to PDF or screenshot
   */
  async render(browser: Browser, input: RenderInput): Promise<Uint8Array> {
    let context: Awaited<ReturnType<Browser['newContext']>> | null = null;
    let page: Page | null = null;

    try {
      const contextOptions = this.buildContextOptions(input);
      context = await browser.newContext(contextOptions);
      page = await context.newPage();

      await this.loadContent(page, input);
      await this.applyDarkMode(page, input.darkMode);

      if (input.outputType === 'pdf') {
        await page.emulateMedia({ media: 'print' });
        return await this.renderPdf(page, input.pdfOptions);
      }
      return await this.renderScreenshot(
        page,
        input.screenshotOptions,
        input.sharpResizeOptions,
      );
    } catch (error) {
      this.logger.error('PDF generation error:', error);
      throw error;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  /**
   * Builds browser context options from input
   */
  private buildContextOptions(input: RenderInput): BrowserContextOptions {
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

    const mergedOptions: RenderContextOptions = {
      ...defaultContextOptions,
      ...input.contextOptions,
      viewport:
        input.contextOptions?.viewport ?? defaultContextOptions.viewport,
    };

    return {
      colorScheme: mergedOptions.colorScheme,
      locale: mergedOptions.locale,
      reducedMotion: mergedOptions.reducedMotion,
      viewport: mergedOptions.viewport,
      isMobile: mergedOptions.isMobile,
      hasTouch: mergedOptions.hasTouch,
      deviceScaleFactor: mergedOptions.deviceScaleFactor,
      bypassCSP: mergedOptions.bypassCSP,
    };
  }

  /**
   * Loads content into the page (from URL or HTML)
   */
  private async loadContent(page: Page, input: RenderInput): Promise<void> {
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
  }

  /**
   * Applies dark mode styling if requested
   */
  private async applyDarkMode(page: Page, darkMode?: boolean): Promise<void> {
    if (darkMode) {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      });
    }
  }

  /**
   * Renders the page as a PDF
   */
  private async renderPdf(
    page: Page,
    pdfOptions?: Partial<RenderPdfOptions>,
  ): Promise<Uint8Array> {
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

    const mergedOptions: RenderPdfOptions = {
      ...defaultPdfOptions,
      ...pdfOptions,
      margin: pdfOptions?.margin ?? defaultPdfOptions.margin,
    };

    const playwrightOptions: PDFOptions = {
      format: mergedOptions.format,
      width: mergedOptions.width,
      height: mergedOptions.height,
      printBackground: mergedOptions.printBackground,
      preferCSSPageSize: mergedOptions.preferCSSPageSize,
      displayHeaderFooter: mergedOptions.displayHeaderFooter,
      headerTemplate: mergedOptions.headerTemplate,
      footerTemplate: mergedOptions.footerTemplate,
      outline: mergedOptions.outline,
      scale: mergedOptions.scale,
      margin: mergedOptions.margin,
    };

    const pdfBuffer = await page.pdf(playwrightOptions);
    return new Uint8Array(pdfBuffer);
  }

  /**
   * Renders the page as a screenshot
   */
  private async renderScreenshot(
    page: Page,
    screenshotOptions?: Partial<RenderScreenshotOptions>,
    sharpResizeOptions?: ResizeOptions,
  ): Promise<Uint8Array> {
    const defaultScreenshotOptions: RenderScreenshotOptions = {
      fullPage: true,
      type: 'png',
      scale: 'css',
      animations: 'disabled',
      caret: 'hide',
      omitBackground: true,
    };

    const mergedOptions: RenderScreenshotOptions = {
      ...defaultScreenshotOptions,
      ...screenshotOptions,
    };

    const playwrightOptions: PageScreenshotOptions = {
      fullPage: mergedOptions.fullPage,
      type: mergedOptions.type,
      quality: mergedOptions.quality,
      scale: mergedOptions.scale,
      animations: mergedOptions.animations,
      caret: mergedOptions.caret as 'hide' | 'initial',
      omitBackground: mergedOptions.omitBackground,
      clip: mergedOptions.clip,
    };

    const screenshotBuffer = await page.screenshot(playwrightOptions);

    if (sharpResizeOptions) {
      const upscaledBuffer = await sharp(Buffer.from(screenshotBuffer))
        .resize(sharpResizeOptions)
        .toBuffer();
      return new Uint8Array(upscaledBuffer);
    }

    return new Uint8Array(screenshotBuffer);
  }
}
