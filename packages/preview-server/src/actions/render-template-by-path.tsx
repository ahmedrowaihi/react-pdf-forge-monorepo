'use server';

import fs from 'node:fs';
import path from 'node:path';
import {
  registerSpinnerAutostopping,
  styleText,
} from '@ahmedrowaihi/pdf-forge-dev-tools';
import logSymbols from 'log-symbols';
import ora, { type Ora } from 'ora';
import type React from 'react';
import { isBuilding, isPreviewDevelopment } from '../app/env';
import { convertStackWithSourceMap } from '../utils/convert-stack-with-sourcemap';
import {
  clearComponentCache,
  getTemplateComponent,
} from '../utils/get-template-component';
import type { ErrorObject } from '../utils/types/error-object';

export interface RenderedTemplateMetadata {
  prettyMarkup: string;
  markup: string;
  /**
   * HTML markup with `data-source-file` and `data-source-line` attributes pointing to the original
   * .jsx/.tsx files corresponding to the rendered tag
   */
  markupWithReferences?: string;
  plainText: string;
  reactMarkup: string;

  basename: string;
  extname: string;
}

export type TemplateRenderingResult =
  | RenderedTemplateMetadata
  | {
      error: ErrorObject;
    };

const cache = new Map<string, TemplateRenderingResult>();

const createLogBufferer = (
  originalLogger: (...args: any[]) => void,
  overwriteLogger: (logger: (...args: any[]) => void) => void,
) => {
  let logs: Array<any[]> = [];

  let timesCorked = 0;

  return {
    buffer: () => {
      timesCorked += 1;
      overwriteLogger((...args: any[]) => logs.push(args));
    },
    flush: () => {
      timesCorked = Math.max(timesCorked - 1, 0);
      // This ensures that, only once flushing has been called as many times as
      // buffering, that the logs are actually flushed.
      if (timesCorked === 0) {
        for (const logArgs of logs) {
          originalLogger(...logArgs);
        }
        logs = [];
        overwriteLogger(originalLogger);
      }
    },
  };
};

const logBufferer = createLogBufferer(
  console.log,
  (logger) => (console.log = logger),
);
const errorBufferer = createLogBufferer(
  console.error,
  (logger) => (console.error = logger),
);
const infoBufferer = createLogBufferer(
  console.info,
  (logger) => (console.info = logger),
);
const warnBufferer = createLogBufferer(
  console.warn,
  (logger) => (console.warn = logger),
);

export const renderTemplateByPath = async (
  templatePath: string,
  invalidatingCache = false,
): Promise<TemplateRenderingResult> => {
  if (invalidatingCache) {
    cache.delete(templatePath);
    clearComponentCache(templatePath);
  }

  if (cache.has(templatePath)) {
    return cache.get(templatePath)!;
  }

  logBufferer.buffer();
  errorBufferer.buffer();
  infoBufferer.buffer();
  warnBufferer.buffer();

  const templateFilename = path.basename(templatePath);
  let spinner: Ora | undefined;
  if (!isBuilding && !isPreviewDevelopment) {
    spinner = ora({
      text: `Rendering PDF template ${templateFilename}\n`,
      prefixText: ' ',
      stream: process.stderr,
    }).start();
    registerSpinnerAutostopping(spinner);
  }

  const timeBeforeTemplateLoaded = performance.now();
  const componentResult = await getTemplateComponent(templatePath);
  const millisecondsToLoaded = performance.now() - timeBeforeTemplateLoaded;

  if ('error' in componentResult) {
    spinner?.stopAndPersist({
      symbol: logSymbols.error,
      text: `Failed while rendering ${templateFilename}`,
    });
    logBufferer.flush();
    errorBufferer.flush();
    infoBufferer.flush();
    warnBufferer.flush();
    return { error: componentResult.error };
  }

  const {
    templateComponent: Template,
    createElement,
    render,
    renderWithReferences,
    sourceMapToOriginalFile,
  } = componentResult;

  const previewProps = Template.PreviewProps || {};
  const TemplateComponent = Template as React.FunctionComponent;
  try {
    const timeBeforeTemplateRendered = performance.now();
    const element = createElement(TemplateComponent, previewProps);
    const markupWithReferences = await renderWithReferences(element, {
      pretty: true,
    });
    const prettyMarkup = await render(element, {
      pretty: true,
    });
    const markup = await render(element, {
      pretty: false,
    });
    const plainText = await render(element, {
      plainText: true,
    });

    const reactMarkup = await fs.promises.readFile(templatePath, 'utf-8');

    const millisecondsToRendered =
      performance.now() - timeBeforeTemplateRendered;
    let timeForConsole = `${millisecondsToRendered.toFixed(0)}ms`;
    if (millisecondsToRendered <= 450) {
      timeForConsole = styleText('green', timeForConsole);
    } else if (millisecondsToRendered <= 1000) {
      timeForConsole = styleText('yellow', timeForConsole);
    } else {
      timeForConsole = styleText('red', timeForConsole);
    }
    spinner?.stopAndPersist({
      symbol: logSymbols.success,
      text: `Successfully rendered ${templateFilename} in ${timeForConsole} (loaded in ${millisecondsToLoaded.toFixed(0)}ms)`,
    });
    logBufferer.flush();
    errorBufferer.flush();
    infoBufferer.flush();
    warnBufferer.flush();

    const renderingResult: RenderedTemplateMetadata = {
      prettyMarkup,
      // This ensures that no null byte character ends up in the rendered
      // markup making users suspect of any issues. These null byte characters
      // only seem to happen with React 18, as it has no similar incident with React 19.
      markup: markup.replaceAll('\0', ''),
      markupWithReferences: markupWithReferences.replaceAll('\0', ''),
      plainText,
      reactMarkup,

      basename: path.basename(templatePath, path.extname(templatePath)),
      extname: path.extname(templatePath).slice(1),
    };

    cache.set(templatePath, renderingResult);

    return renderingResult;
  } catch (exception) {
    const error = exception as Error;

    spinner?.stopAndPersist({
      symbol: logSymbols.error,
      text: `Failed while rendering ${templateFilename}`,
    });
    logBufferer.flush();
    errorBufferer.flush();
    infoBufferer.flush();
    warnBufferer.flush();

    if (exception instanceof SyntaxError) {
      interface SpanPosition {
        file: {
          content: string;
        };
        offset: number;
        line: number;
        col: number;
      }
      // means the template's HTML was invalid and prettier threw this error
      // TODO: always throw when the HTML is invalid during `render`
      const cause = exception.cause as {
        msg: string;
        span: {
          start: SpanPosition;
          end: SpanPosition;
        };
      };

      const sourceFileAttributeMatches = cause.span.start.file.content.matchAll(
        /data-source-file="(?<file>[^"]*)"/g,
      );
      let closestSourceFileAttribute: RegExpExecArray | undefined;
      for (const sourceFileAttributeMatch of sourceFileAttributeMatches) {
        if (closestSourceFileAttribute === undefined) {
          closestSourceFileAttribute = sourceFileAttributeMatch;
        }
        if (
          Math.abs(sourceFileAttributeMatch.index - cause.span.start.offset) <
          Math.abs(closestSourceFileAttribute.index - cause.span.start.offset)
        ) {
          closestSourceFileAttribute = sourceFileAttributeMatch;
        }
      }

      const findClosestAttributeValue = (
        attributeName: string,
      ): string | undefined => {
        const attributeMatches = cause.span.start.file.content.matchAll(
          new RegExp(`${attributeName}="(?<value>[^"]*)"`, 'g'),
        );
        let closestAttribute: RegExpExecArray | undefined;
        for (const attributeMatch of attributeMatches) {
          if (closestAttribute === undefined) {
            closestAttribute = attributeMatch;
          }
          if (
            Math.abs(attributeMatch.index - cause.span.start.offset) <
            Math.abs(closestAttribute.index - cause.span.start.offset)
          ) {
            closestAttribute = attributeMatch;
          }
        }
        return closestAttribute?.groups?.value;
      };

      let stack = convertStackWithSourceMap(
        error.stack,
        templatePath,
        sourceMapToOriginalFile,
      );

      const sourceFile = findClosestAttributeValue('data-source-file');
      const sourceLine = findClosestAttributeValue('data-source-line');
      if (sourceFile && sourceLine) {
        stack = ` at ${sourceFile}:${sourceLine}\n${stack}`;
      }

      return {
        error: {
          name: exception.name,
          message: cause.msg,
          stack,
          cause: error.cause ? JSON.parse(JSON.stringify(cause)) : undefined,
        },
      };
    }

    return {
      error: {
        name: error.name,
        message: error.message,
        stack: convertStackWithSourceMap(
          error.stack,
          templatePath,
          sourceMapToOriginalFile,
        ),
        cause: error.cause
          ? JSON.parse(JSON.stringify(error.cause))
          : undefined,
      },
    };
  }
};
