import { promises as fs } from "node:fs";
import path from "node:path";
import type { Loader, PluginBuild, ResolveOptions } from "esbuild";
import { escapeStringForRegex } from "./escape-string-for-regex.js";

/**
 * Made to export the `render` function out of the user's PDF template
 * so that issues like React version mismatches don't
 * happen.
 *
 * This also exports the `createElement` from the user's React version as well
 * to avoid mismatches.
 *
 * This avoids multiple versions of React being involved, i.e., the version
 * in the CLI vs. the version the user has on their templates.
 */
export const renderingUtilitiesExporter = (pdfTemplates: string[]) => ({
  name: "rendering-utilities-exporter",
  setup: async (b: PluginBuild) => {
    const filterOptions = await Promise.all(
      pdfTemplates.map(async (templatePath) =>
        escapeStringForRegex(await fs.realpath(templatePath))
      )
    );
    b.onLoad(
      {
        filter: new RegExp(filterOptions.join("|")),
      },
      async ({ path: pathToFile }) => {
        return {
          contents: `${await fs.readFile(pathToFile, "utf8")};
          export { render } from 'react-pdf-module-that-will-export-render'
          export { createElement as reactPDFCreateReactElement } from 'react';
        `,
          loader: path.extname(pathToFile).slice(1) as Loader,
        };
      }
    );

    b.onResolve(
      { filter: /^react-pdf-module-that-will-export-render$/ },
      async (args) => {
        const options: ResolveOptions = {
          kind: "import-statement",
          importer: args.importer,
          resolveDir: args.resolveDir,
          namespace: args.namespace,
        };
        let result = await b.resolve("@ahmedrowaihi/pdf-forge-core", options);
        if (result.errors.length === 0) {
          return result;
        }

        // If @ahmedrowaihi/pdf-forge-core does not exist, resolve to @ahmedrowaihi/pdf-forge-components
        result = await b.resolve("@ahmedrowaihi/pdf-forge-components", options);
        if (result.errors.length > 0 && result.errors[0]) {
          result.errors[0].text =
            "Failed trying to import `render` from either `@ahmedrowaihi/pdf-forge-core` or `@ahmedrowaihi/pdf-forge-components` to be able to render your PDF template.\n Maybe you don't have either of them installed?";
        }
        return result;
      }
    );
  },
});
