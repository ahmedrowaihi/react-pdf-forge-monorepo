import { type Browser, chromium } from 'playwright';
import {
  type ChromiumLaunchOptions,
  ChromiumResolver,
} from './chromium-resolver';
import type { PdfLogger } from './logger';

/**
 * Manages browser instances with pooling for performance
 * Reuses browser instances to avoid 2-3s launch overhead
 */
export class BrowserManager {
  private browsers: Browser[] = [];
  private readonly maxSize: number;
  private readonly logger: PdfLogger;
  private readonly chromiumResolver: ChromiumResolver;
  private launchOptions: ChromiumLaunchOptions | null = null;

  constructor(maxSize, logger: PdfLogger) {
    this.maxSize = maxSize;
    this.logger = logger;
    this.chromiumResolver = new ChromiumResolver(logger);
  }

  /**
   * Acquires a browser instance from the pool or creates a new one
   */
  async acquire(): Promise<Browser> {
    // Try to reuse an existing browser
    if (this.browsers.length > 0) {
      const browser = this.browsers.pop()!;
      if (browser.isConnected()) {
        return browser;
      }
    }

    // Create new browser if pool has space
    if (this.browsers.length < this.maxSize) {
      return await this.createBrowser();
    }

    // Pool exhausted, create temporary browser
    this.logger.warn('Browser pool exhausted, creating temporary browser');
    return await this.createBrowser();
  }

  /**
   * Releases a browser back to the pool or closes it
   */
  release(browser: Browser): void {
    if (this.browsers.length < this.maxSize && browser.isConnected()) {
      this.browsers.push(browser);
    } else {
      browser.close().catch((err) => {
        this.logger.error('Error closing browser:', err);
      });
    }
  }

  /**
   * Creates a new browser instance with resolved Chromium options
   */
  private async createBrowser(): Promise<Browser> {
    // Resolve Chromium options (cached after first resolution)
    if (!this.launchOptions) {
      this.launchOptions = await this.chromiumResolver.resolve();
    }

    const launchConfig: Parameters<typeof chromium.launch>[0] = {
      headless: true,
      args: this.launchOptions.args,
    };

    if (this.launchOptions.executablePath) {
      launchConfig.executablePath = this.launchOptions.executablePath;
    }

    return chromium.launch(launchConfig);
  }

  /**
   * Closes all browsers in the pool
   */
  async closeAll(): Promise<void> {
    await Promise.all(
      this.browsers.map((browser) => browser.close().catch(() => {})),
    );
    this.browsers = [];
  }
}
