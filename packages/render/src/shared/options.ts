import type { HtmlToTextOptions } from 'html-to-text';
import type { pretty } from './utils/pretty';
import type { toPlainText } from './utils/to-plain-text';

export type Options = {
  /**
   * @see {@link pretty}
   */
  pretty?: boolean;
  /**
   * Bundle static assets (fonts, images) as base64 data URIs in the HTML.
   * When enabled, scans the specified static directory and embeds assets.
   * Only available in Node.js environment.
   */
  bundleAssets?:
    | boolean
    | {
        /**
         * Path to the static directory containing assets (fonts, images, etc.)
         * Can be absolute or relative to process.cwd()
         */
        staticDir: string;
        /**
         * Optional fallback static directory for shared assets.
         * If an asset is not found in staticDir, it will be looked up in fallbackStaticDir.
         * Useful when multiple templates share common assets (fonts, logos, etc.)
         * Can be absolute or relative to process.cwd()
         */
        fallbackStaticDir?: string;
      };
} & (
  | {
      /**
       * @see {@link toPlainText}
       */
      plainText?: false;
    }
  | {
      /**
       * @see {@link toPlainText}
       */
      plainText?: true;
      /**
       * These are options you can pass down directly to the library we use for
       * converting the rendered template's HTML into plain text.
       *
       * @see https://github.com/html-to-text/node-html-to-text
       */
      htmlToTextOptions?: HtmlToTextOptions;
    }
);
