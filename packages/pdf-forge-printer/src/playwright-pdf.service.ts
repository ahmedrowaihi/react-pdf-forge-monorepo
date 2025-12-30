import type { ResizeOptions } from "sharp";
import type { PdfLogger } from "./logger";
import { ConsoleLogger } from "./logger";
import { BrowserManager } from "./browser-manager";
import { Renderer, type RenderInput } from "./renderer";

export interface RenderContextOptions {
  viewport?: {
    width: number;
    height: number;
  };
  colorScheme?: "light" | "dark";
  locale?: string;
  reducedMotion?: "reduce" | "no-preference";
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
  bypassCSP?: boolean;
}

export interface RenderPdfOptions {
  format?: "A4" | "Letter";
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
  type?: "png" | "jpeg";
  quality?: number;
  scale?: "css" | "device";
  animations?: "disabled" | "allow";
  caret?: "hide" | "show";
  omitBackground?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Playwright PDF service with browser pooling
 * Reuses browser instances for 5-10x faster performance
 *
 * Responsibilities:
 * - Orchestrates browser management and rendering
 * - Provides high-level API for PDF/screenshot generation
 */
export class PlaywrightPdfService {
  private readonly logger: PdfLogger;
  private readonly browserManager: BrowserManager;
  private readonly renderer: Renderer;

  constructor(logger: PdfLogger = new ConsoleLogger(), poolSize = 3) {
    this.logger = logger;
    this.browserManager = new BrowserManager(poolSize, logger);
    this.renderer = new Renderer(logger);
  }

  async render(input: {
    html?: string;
    url?: string;
    outputType: "pdf" | "screenshot";
    darkMode?: boolean;
    contextOptions?: Partial<RenderContextOptions>;
    screenshotOptions?: Partial<RenderScreenshotOptions>;
    pdfOptions?: Partial<RenderPdfOptions>;
    sharpResizeOptions?: ResizeOptions;
  }): Promise<Uint8Array> {
    const browser = await this.browserManager.acquire();

    try {
      return await this.renderer.render(browser, input);
    } finally {
      this.browserManager.release(browser);
    }
  }

  /**
   * Clean up all browsers (call on shutdown)
   */
  async close(): Promise<void> {
    await this.browserManager.closeAll();
  }
}
