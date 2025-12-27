import * as React from 'react';

type FallbackFont =
  | 'Arial'
  | 'Helvetica'
  | 'Verdana'
  | 'Georgia'
  | 'Times New Roman'
  | 'serif'
  | 'sans-serif'
  | 'monospace'
  | 'cursive'
  | 'fantasy';

type FontFormat =
  | 'woff'
  | 'woff2'
  | 'truetype'
  | 'opentype'
  | 'embedded-opentype'
  | 'svg';

type FontWeight = React.CSSProperties['fontWeight'];
type FontStyle = React.CSSProperties['fontStyle'];

export interface FontProps {
  /** The font you want to use. NOTE: Do not insert multiple fonts here, use fallbackFontFamily for that */
  fontFamily: string;
  /** An array is possible, but the order of the array is the priority order */
  fallbackFontFamily: FallbackFont | FallbackFont[];
  /**
   * Font source - must be a URL:
   * - Absolute URL path (e.g., "/fonts/sans/Thmanyahsans12-Regular.otf")
   * - Relative URL path (e.g., "fonts/sans/Thmanyahsans12-Regular.otf")
   * - HTTP/HTTPS URL (e.g., "https://example.com/font.woff2")
   * - Base64 data URI (e.g., "data:font/woff2;base64,ABC123...")
   *
   * The URL is used as-is - no automatic path conversion.
   * Templates are responsible for providing the correct path.
   */
  src?: string;
  /**
   * Web font URL or base64 data URI (legacy prop, use src instead).
   * Format examples:
   * - URL: "https://example.com/font.woff2" or "/fonts/font.woff2"
   * - Base64: "data:font/woff2;base64,ABC123..."
   */
  webFont?: {
    url: string;
    format: FontFormat;
  };
  /** Font format - auto-detected from file extension if not provided */
  format?: FontFormat;
  /** Default: 'normal' */
  fontStyle?: FontStyle;
  /** Default: 400 */
  fontWeight?: FontWeight;
}

/**
 * Detect font format from file extension or URL
 */
function detectFontFormat(
  src: string,
  format?: FontFormat,
): {
  format: FontFormat;
  mimeType: string;
} {
  if (format) {
    const mimeMap: Record<FontFormat, string> = {
      woff: 'font/woff',
      woff2: 'font/woff2',
      truetype: 'font/ttf',
      opentype: 'font/otf',
      'embedded-opentype': 'font/eot',
      svg: 'image/svg+xml',
    };
    return { format, mimeType: mimeMap[format] };
  }

  // Auto-detect from extension
  const lastDot = src.lastIndexOf('.');
  const ext = lastDot !== -1 ? src.slice(lastDot + 1).toLowerCase() : '';
  const formatMap: Record<string, { format: FontFormat; mimeType: string }> = {
    woff2: { format: 'woff2', mimeType: 'font/woff2' },
    woff: { format: 'woff', mimeType: 'font/woff' },
    otf: { format: 'opentype', mimeType: 'font/otf' },
    ttf: { format: 'truetype', mimeType: 'font/ttf' },
    eot: { format: 'embedded-opentype', mimeType: 'font/eot' },
    svg: { format: 'svg', mimeType: 'image/svg+xml' },
  };

  return formatMap[ext] || { format: 'woff2', mimeType: 'font/woff2' };
}

/**
 * Font Component
 *
 * Uses fonts from URLs (public paths, HTTP/HTTPS, or data URIs).
 * No filesystem loading or base64 conversion - fonts must be served as static files.
 *
 * Usage:
 * ```tsx
 * // Absolute public URL
 * <Font
 *   fontFamily="Thmanyah sans 1.2"
 *   src="/fonts/sans/Thmanyahsans12-Regular.otf"
 *   fontWeight={400}
 * />
 *
 * // Relative URL (relative to current page)
 * <Font
 *   fontFamily="Thmanyah sans 1.2"
 *   src="fonts/sans/Thmanyahsans12-Regular.otf"
 *   fontWeight={400}
 * />
 *
 * // HTTP/HTTPS URL
 * <Font
 *   fontFamily="Thmanyah sans 1.2"
 *   src="https://example.com/font.otf"
 *   fontWeight={400}
 * />
 *
 * // Base64 data URI
 * <Font
 *   fontFamily="Thmanyah sans 1.2"
 *   src="data:font/otf;base64,ABC123..."
 *   fontWeight={400}
 * />
 * ```
 *
 * The component MUST be placed inside the <head> tag.
 */
export function Font({
  fontFamily,
  fallbackFontFamily,
  src,
  webFont,
  format,
  fontStyle = 'normal',
  fontWeight = 400,
}: FontProps): React.JSX.Element {
  let fontSrc = '';
  let detectedFormat: FontFormat | undefined = format;
  let mimeType: string | undefined;

  if (src) {
    if (src.startsWith('data:')) {
      const match = src.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        const mimeToFormat: Record<string, FontFormat> = {
          'font/woff2': 'woff2',
          'font/woff': 'woff',
          'font/otf': 'opentype',
          'font/ttf': 'truetype',
          'font/eot': 'embedded-opentype',
          'image/svg+xml': 'svg',
        };
        detectedFormat = mimeToFormat[mimeType] || 'woff2';
        fontSrc = `src: url(${src});`;
      } else {
        fontSrc = `src: url(${src});`;
      }
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      const detected = detectFontFormat(src, format);
      detectedFormat = detected.format;
      fontSrc = `src: url(${src})${format ? ` format('${detectedFormat}')` : ''};`;
    } else {
      const detected = detectFontFormat(src, format);
      detectedFormat = detected.format;
      fontSrc = `src: url(${src})${format ? ` format('${detectedFormat}')` : ''};`;
    }
  } else if (webFont) {
    fontSrc = webFont.url.startsWith('data:')
      ? `src: url(${webFont.url});`
      : `src: url(${webFont.url}) format('${webFont.format}');`;
  }

  const style = `
    @font-face {
      font-family: '${fontFamily}';
      font-style: ${fontStyle};
      font-weight: ${fontWeight};
      ${fontSrc}
    }

    * {
      font-family: '${fontFamily}', ${
        Array.isArray(fallbackFontFamily)
          ? fallbackFontFamily.join(', ')
          : fallbackFontFamily
      };
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: style }} />;
}
