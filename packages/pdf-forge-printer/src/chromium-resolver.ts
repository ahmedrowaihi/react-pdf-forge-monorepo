import type Chromium from '@sparticuz/chromium';
import type { PdfLogger } from './logger';

export interface ChromiumLaunchOptions {
  executablePath?: string;
  args: string[];
}

/**
 * Resolves the Chromium executable path and arguments
 * Handles @sparticuz/chromium for serverless environments
 */
export class ChromiumResolver {
  constructor(private readonly logger: PdfLogger) {}

  /**
   * Resolves Chromium executable path and launch arguments
   */
  async resolve(): Promise<ChromiumLaunchOptions> {
    const defaultArgs = [
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
    ];

    // Explicit path override (highest priority)
    if (process.env.CHROMIUM_EXECUTABLE_PATH) {
      return {
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
        args: defaultArgs,
      };
    }

    // Try to use @sparticuz/chromium on Linux or when forced
    const isLinux = process.platform === 'linux';
    const forceSparticuz =
      process.env.USE_SPARTICUZ_CHROMIUM === 'true' ||
      process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isLinux || forceSparticuz) {
      const sparticuzResult = await this.tryResolveSparticuzChromium();
      if (sparticuzResult) {
        return sparticuzResult;
      }
    } else {
      this.logger.log(
        `Platform is ${process.platform}, using Playwright's default Chromium (use @sparticuz/chromium on Linux/serverless)`,
      );
    }

    // Fallback to Playwright's default Chromium
    return {
      args: defaultArgs,
    };
  }

  /**
   * Attempts to resolve @sparticuz/chromium
   */
  private async tryResolveSparticuzChromium(): Promise<ChromiumLaunchOptions | null> {
    try {
      const ChromiumClass = await this.loadSparticuzChromium();
      if (!ChromiumClass) {
        this.logger.log(
          "@sparticuz/chromium not available, using Playwright's default Chromium",
        );
        return null;
      }

      const chromiumPath = process.env.SPARTICUZ_CHROMIUM_PATH;
      const executablePath = chromiumPath
        ? await ChromiumClass.executablePath(chromiumPath)
        : await ChromiumClass.executablePath();

      const sparticuzArgs: string[] = Array.isArray(ChromiumClass.args)
        ? ChromiumClass.args
        : [];

      const defaultArgs = [
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
      ];

      // Disable WebGL if configured
      if (process.env.SPARTICUZ_CHROMIUM_DISABLE_WEBGL === 'true') {
        ChromiumClass.setGraphicsMode = false;
      }

      this.logger.log('Using @sparticuz/chromium as default browser');

      return {
        executablePath,
        args: [...sparticuzArgs, ...defaultArgs],
      };
    } catch (error) {
      this.logger.warn(
        "Failed to load @sparticuz/chromium, falling back to Playwright's default Chromium",
      );
      this.logger.debug(String(error));
      return null;
    }
  }

  /**
   * Dynamically load @sparticuz/chromium if available
   */
  private async loadSparticuzChromium(): Promise<typeof Chromium | null> {
    try {
      const sparticuzChromiumModule = await import('@sparticuz/chromium');
      const ChromiumClass =
        sparticuzChromiumModule.default || sparticuzChromiumModule;

      if (!ChromiumClass) {
        return null;
      }

      return ChromiumClass;
    } catch (_error) {
      return null;
    }
  }
}
