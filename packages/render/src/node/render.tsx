import path from 'node:path';
import { Suspense } from 'react';
import type { Options } from '../shared/options';
import {
  embedAssetsInHtml,
  getAssetRegistry,
} from '../shared/utils/asset-registry';
import { pretty } from '../shared/utils/pretty';
import { toPlainText } from '../shared/utils/to-plain-text';
import { readStream } from './read-stream';

export const render = async (node: React.ReactNode, options?: Options) => {
  const suspendedElement = <Suspense>{node}</Suspense>;
  const reactDOMServer = await import('react-dom/server').then((m) => {
    if ('default' in m) {
      return m.default;
    }
    return m;
  });

  let html!: string;
  if (
    Object.hasOwn(reactDOMServer, 'renderToReadableStream') &&
    typeof WritableStream !== 'undefined'
  ) {
    html = await readStream(
      await reactDOMServer.renderToReadableStream(suspendedElement, {
        progressiveChunkSize: Number.POSITIVE_INFINITY,
      }),
    );
  } else {
    await new Promise<void>((resolve, reject) => {
      const stream = reactDOMServer.renderToPipeableStream(suspendedElement, {
        onAllReady() {
          void readStream(stream).then((dom) => {
            html = dom;
            resolve();
          });
        },
        onError(error) {
          reject(error as Error);
        },
        progressiveChunkSize: Number.POSITIVE_INFINITY,
      });
    });
  }

  if (options?.plainText) {
    return toPlainText(html, options.htmlToTextOptions);
  }

  if (options?.bundleAssets) {
    let staticDir: string;
    let fallbackStaticDir: string | undefined;

    if (typeof options.bundleAssets === 'object') {
      staticDir = options.bundleAssets.staticDir;
      fallbackStaticDir = options.bundleAssets.fallbackStaticDir;
    } else {
      staticDir = path.join(process.cwd(), 'static');
    }

    const absoluteStaticDir = path.isAbsolute(staticDir)
      ? staticDir
      : path.join(process.cwd(), staticDir);

    const absoluteFallbackStaticDir = fallbackStaticDir
      ? path.isAbsolute(fallbackStaticDir)
        ? fallbackStaticDir
        : path.join(process.cwd(), fallbackStaticDir)
      : undefined;

    const assetRegistry = await getAssetRegistry(
      absoluteStaticDir,
      absoluteFallbackStaticDir,
    );
    html = embedAssetsInHtml(html, assetRegistry);
  }

  const doctype = '<!DOCTYPE html>';

  const document = `${doctype}${html.replace(/<!DOCTYPE.*?>/, '')}`;

  if (options?.pretty) {
    return pretty(document);
  }

  return document;
};
