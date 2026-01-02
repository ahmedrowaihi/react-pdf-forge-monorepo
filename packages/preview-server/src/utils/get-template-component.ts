import path from "node:path";
import type { render } from "@ahmedrowaihi/pdf-forge-components";
import { type BuildFailure, build, type OutputFile } from "esbuild";
import type React from "react";
import type { RawSourceMap } from "source-map-js";
import { z } from "zod";
import { convertStackWithSourceMap } from "@ahmedrowaihi/pdf-forge-dev-tools";
import { isErr } from "./result";
import { createContext, runBundledCode } from "./run-bundled-code";
import type { ErrorObject } from "./types/error-object";
import type { Template as TemplateComponent } from "./types/template";

// Component cache for hot-reload scenarios
const componentCache = new Map<string, unknown>();

/**
 * Clear the component cache for a specific template path
 * Used during hot-reload to invalidate cached components
 */
export function clearComponentCache(templatePath: string): void {
  componentCache.delete(templatePath);
}

const TemplateComponentModule = z.object({
  default: z.any(),
  render: z.function(),
  reactPDFCreateReactElement: z.function(),
});

export const getTemplateComponent = async (
  templatePath: string,
  jsxRuntimePath: string
): Promise<
  | {
      templateComponent: TemplateComponent;

      createElement: typeof React.createElement;

      /**
       * Renders the HTML with `data-source-file`/`data-source-line` attributes that should only be
       * used internally in the preview server and never shown to the user.
       */
      renderWithReferences: typeof render;
      render: typeof render;

      sourceMapToOriginalFile: RawSourceMap;
    }
  | { error: ErrorObject }
> => {
  let outputFiles: OutputFile[];
  try {
    const buildData = await build({
      bundle: true,
      entryPoints: [templatePath],
      platform: "node",
      write: false,
      jsxDev: true,
      jsxImportSource: jsxRuntimePath,

      format: "cjs",
      jsx: "automatic",
      logLevel: "silent",
      // allows for using jsx on a .js file
      loader: {
        ".js": "jsx",
      },
      outdir: "stdout", // just a stub for esbuild, it won't actually write to this folder
      sourcemap: "external",
    });
    outputFiles = buildData.outputFiles;
  } catch (exception) {
    const buildFailure = exception as BuildFailure;
    return {
      error: {
        message: buildFailure.message,
        stack: buildFailure.stack,
        name: buildFailure.name,
        cause: buildFailure.cause,
      },
    };
  }

  const sourceMapFile = outputFiles[0]!;
  const bundledTemplateFile = outputFiles[1]!;
  const builtTemplateCode = bundledTemplateFile.text;

  const sourceMapToTemplate = JSON.parse(sourceMapFile.text) as RawSourceMap;
  // because it will have a path like <tsconfigLocation>/stdout/template.js.map
  sourceMapToTemplate.sourceRoot = path.resolve(sourceMapFile.path, "../..");
  sourceMapToTemplate.sources = sourceMapToTemplate.sources.map((source) =>
    path.resolve(sourceMapFile.path, "..", source)
  );

  const context = createContext(templatePath);
  context.shouldIncludeSourceReference = false;
  const runningResult = runBundledCode(
    builtTemplateCode,
    templatePath,
    context
  );

  if (isErr(runningResult)) {
    const { error } = runningResult;
    if (error instanceof Error) {
      error.stack &&= error.stack.split("at Script.runInContext (node:vm")[0];

      return {
        error: {
          name: error.name,
          message: error.message,
          stack: convertStackWithSourceMap(
            error.stack,
            templatePath,
            sourceMapToTemplate
          ),
          cause: error.cause,
        },
      };
    }

    throw error;
  }

  const parseResult = TemplateComponentModule.safeParse(runningResult.value);

  if (parseResult.error) {
    return {
      error: {
        name: "Error",
        message: `The template component at ${templatePath} does not contain the expected exports`,
        stack: new Error().stack,
        cause: parseResult.error,
      },
    };
  }

  if (typeof parseResult.data.default !== "function") {
    return {
      error: {
        name: "Error",
        message: `The template component at ${templatePath} does not contain a default exported function`,
        stack: new Error().stack,
        cause: parseResult.error,
      },
    };
  }

  const { data: componentModule } = parseResult;

  const typedRender = componentModule.render as typeof render;

  return {
    templateComponent: componentModule.default as TemplateComponent,
    renderWithReferences: (async (...args: Parameters<typeof render>) => {
      context.shouldIncludeSourceReference = true;
      const renderingResult = await typedRender(...args);
      context.shouldIncludeSourceReference = false;
      return renderingResult;
    }) as typeof render,
    render: typedRender,
    createElement:
      componentModule.reactPDFCreateReactElement as typeof React.createElement,

    sourceMapToOriginalFile: sourceMapToTemplate,
  };
};
