export interface PdfLogger {
  debug(message: string): void;
  log(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export class ConsoleLogger implements PdfLogger {
  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[PDF Printer] ${message}`);
    }
  }

  log(message: string): void {
    console.log(`[PDF Printer] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[PDF Printer] ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`[PDF Printer] ${message}`, error);
  }
}
