import path from 'node:path';
import {
  clearTransformCaches,
  transformAssetsToImports,
} from '@ahmedrowaihi/pdf-forge-assets';
import type { render } from '@ahmedrowaihi/pdf-forge-components';
import type React from 'react';
import type { RawSourceMap } from 'source-map-js';
import { convertStackWithSourceMap } from './convert-stack-with-sourcemap';
import type { ErrorObject } from './types/error-object';
import type { Template as TemplateComponent } from './types/template';

const componentCache = new Map<
  string,
  | {
      templateComponent: TemplateComponent;
      createElement: typeof React.createElement;
      renderWithReferences: typeof render;
      render: typeof render;
      sourceMapToOriginalFile: RawSourceMap | null;
    }
  | { error: ErrorObject }
>();

const bundleCache = new Map<string, string>();

export const getTemplateComponent = async (
  templatePath: string,
): Promise<
  | {
      templateComponent: TemplateComponent;
      createElement: typeof React.createElement;
      renderWithReferences: typeof render;
      render: typeof render;
      sourceMapToOriginalFile: RawSourceMap | null;
    }
  | { error: ErrorObject }
> => {
  const absoluteTemplatePath = path.isAbsolute(templatePath)
    ? templatePath
    : path.resolve(process.cwd(), templatePath);

  if (componentCache.has(absoluteTemplatePath)) {
    return componentCache.get(absoluteTemplatePath)!;
  }

  try {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');

    let bundlePath: string | undefined = bundleCache.get(absoluteTemplatePath);

    if (!bundlePath) {
      const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'pdf-forge-template-'),
      );

      const templateDir = path.dirname(absoluteTemplatePath);
      const assetTransformPlugin: Bun.BunPlugin = {
        name: 'asset-to-import-transform',
        setup(builder) {
          builder.onLoad(
            {
              filter: /\.(tsx?|jsx?)$/,
            },
            async (args) => {
              const filePath = args.path;
              const isInTemplateDir = filePath.startsWith(templateDir);

              if (!isInTemplateDir) {
                return undefined;
              }

              const code = await Bun.file(filePath).text();
              const { code: transformedCode } = await transformAssetsToImports(
                code,
                filePath,
              );

              if (transformedCode !== code) {
                return {
                  contents: transformedCode,
                  loader: 'tsx',
                };
              }
              return undefined;
            },
          );
        },
      };

      const buildResult = await Bun.build({
        entrypoints: [absoluteTemplatePath],
        plugins: [assetTransformPlugin],
        outdir: tempDir,
        target: 'node',
        format: 'esm',
        external: [
          '@ahmedrowaihi/pdf-forge-components',
          '@ahmedrowaihi/pdf-forge-core',
        ],
        jsx: {
          runtime: 'automatic',
          importSource: 'react',
        },
        minify: false,
        sourcemap: 'external',
        splitting: false,
      });

      if (!buildResult.success) {
        const errorMessages = buildResult.logs
          .map((log) => log.message)
          .join('\n');
        throw new Error(`Bun build failed: ${errorMessages}`);
      }

      const outputFile = buildResult.outputs.find((output) =>
        output.path.endsWith('.js'),
      );
      if (!outputFile) {
        throw new Error('Bun build did not produce an output file');
      }

      const newBundlePath = outputFile.path;
      bundlePath = newBundlePath;
      bundleCache.set(absoluteTemplatePath, newBundlePath);
    }

    if (!bundlePath) {
      throw new Error('Bundle path is undefined');
    }
    const finalBundlePath = bundlePath;

    const dynamicImport = new Function('path', 'return import(path)');
    const templateModule = (await dynamicImport(
      `file://${finalBundlePath}`,
    )) as { default?: TemplateComponent };

    const templateComponent =
      templateModule?.default ?? (templateModule as TemplateComponent);

    const { render: renderFn } = await import('@ahmedrowaihi/pdf-forge-core');
    const React = await import('react');
    const { createElement } = React;

    if (typeof templateComponent !== 'function') {
      return {
        error: {
          name: 'Error',
          message: `The template component at ${templatePath} does not contain a default exported function`,
          stack: new Error().stack,
        },
      };
    }

    const result = {
      templateComponent: templateComponent,
      createElement,
      renderWithReferences: renderFn,
      render: renderFn,
      sourceMapToOriginalFile: null,
    };

    componentCache.set(absoluteTemplatePath, result);
    return result;
  } catch (exception) {
    const error = exception as Error;
    let stack = error.stack;

    if (stack) {
      stack = stack.split('at Script.runInContext (node:vm')[0];
    }

    const errorResult = {
      error: {
        name: error.name,
        message: error.message,
        stack: convertStackWithSourceMap(stack, templatePath, null),
        cause: error.cause,
      },
    };

    componentCache.set(absoluteTemplatePath, errorResult);
    return errorResult;
  }
};

export const clearComponentCache = (templatePath?: string) => {
  if (templatePath) {
    const absolutePath = path.isAbsolute(templatePath)
      ? templatePath
      : path.resolve(process.cwd(), templatePath);
    componentCache.delete(absolutePath);
    bundleCache.delete(absolutePath);
    clearTransformCaches();
  } else {
    componentCache.clear();
    bundleCache.clear();
    clearTransformCaches();
  }
};
