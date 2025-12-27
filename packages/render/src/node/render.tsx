import { Suspense } from 'react';
import type { Options } from '../shared/options';
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

  const doctype = '<!DOCTYPE html>';

  const document = `${doctype}${html.replace(/<!DOCTYPE.*?>/, '')}`;

  if (options?.pretty) {
    return pretty(document);
  }

  return document;
};
