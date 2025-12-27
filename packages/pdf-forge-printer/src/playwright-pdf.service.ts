import { access } from 'node:fs/promises';
import { type Browser, chromium } from 'playwright';
import type { PdfLogger } from './logger';
import { ConsoleLogger } from './logger';

// A4 dimensions in pixels at 96 DPI (standard web resolution)
// A4 = 210mm × 297mm = 8.27" × 11.69" = 794px × 1123px at 96 DPI
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

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
  }): Promise<Uint8Array> {
    let browser: Browser | null = null;

    try {
      browser = await this.launchBrowser();

      const context = await browser.newContext({
        colorScheme: input.darkMode ? 'dark' : 'light',
        locale: 'en-US',
        reducedMotion: 'reduce',
        viewport: { width: A4_WIDTH, height: A4_HEIGHT },
        // Mobile and touch settings
        isMobile: false,
        hasTouch: false,
        // Best quality with device scale factor
        deviceScaleFactor: 2, // High DPI for crisp rendering
        // Bypass CSP
        bypassCSP: true,
      });

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
        // Wait for network to be idle to ensure all resources are loaded
        await page.waitForLoadState('networkidle', { timeout: 60000 });
      } else if (input.html) {
        await page.setContent(input.html, {
          waitUntil: 'load',
          timeout: 60000,
        });
        // Wait for network to be idle (for any resources in the HTML)
        await page.waitForLoadState('networkidle', { timeout: 60000 });
      }

      // Apply dark mode class for Theme component system
      // (Playwright's colorScheme already handles @media (prefers-color-scheme: dark))
      if (input.darkMode) {
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        });
      }

      // For PDF generation, emulate print media to apply @media print styles
      if (input.outputType === 'pdf') {
        await page.emulateMedia({ media: 'print' });
      }

      this.logger.log(`Page content loaded, generating ${input.outputType}...`);

      if (input.outputType === 'screenshot') {
        const screenshotBuffer = await page.screenshot({
          fullPage: true,
          type: 'png',
          scale: 'css',
          animations: 'disabled',
          caret: 'hide',
          omitBackground: true, // Transparent background
        });
        return new Uint8Array(screenshotBuffer);
      }
      const pdfBuffer = await page.pdf({
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
      });
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
