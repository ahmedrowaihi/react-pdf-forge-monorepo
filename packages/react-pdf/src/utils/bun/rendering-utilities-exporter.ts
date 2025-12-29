import { promises as fs } from 'node:fs';
import path from 'node:path';
import { escapeStringForRegex } from '@ahmedrowaihi/pdf-forge-toolbox';

/**
 * Bun plugin to export the `render` function out of the user's PDF template
 * so that React version mismatches don't happen.
 *
 * This also exports the `createElement` from the user's React version as well
 * to avoid mismatches.
 *
 * This avoids multiple versions of React being involved, i.e., the version
 * in the CLI vs. the version the user has on their templates.
 */
export const renderingUtilitiesExporter = (
  pdfTemplates: string[],
): Bun.BunPlugin => ({
  name: 'rendering-utilities-exporter',
  setup(builder) {
    const templateRegex = new RegExp(
      pdfTemplates
        .map((templatePath) => escapeStringForRegex(templatePath))
        .join('|'),
    );

    builder.onLoad(
      {
        filter: templateRegex,
      },
      async (args) => {
        const code = await fs.readFile(args.path, 'utf8');
        const ext = path.extname(args.path).slice(1);

        // Inject exports for render and createElement
        const transformedCode = `${code}
export { render } from 'react-pdf-module-that-will-export-render';
export { createElement as reactPDFCreateReactElement } from 'react';
`;

        return {
          contents: transformedCode,
          loader: ext === 'tsx' || ext === 'jsx' ? 'tsx' : (ext as Bun.Loader),
        };
      },
    );

    builder.onResolve(
      { filter: /^react-pdf-module-that-will-export-render$/ },
      async (args) => {
        // Try to resolve @ahmedrowaihi/pdf-forge-core first
        try {
          const corePath = await Bun.resolve(
            '@ahmedrowaihi/pdf-forge-core',
            args.importer,
          );
          return {
            path: corePath,
            namespace: 'file',
          };
        } catch {
          // Fallback to @ahmedrowaihi/pdf-forge-components
          try {
            const componentsPath = await Bun.resolve(
              '@ahmedrowaihi/pdf-forge-components',
              args.importer,
            );
            return {
              path: componentsPath,
              namespace: 'file',
            };
          } catch (_error) {
            throw new Error(
              "Failed trying to import `render` from either `@ahmedrowaihi/pdf-forge-core` or `@ahmedrowaihi/pdf-forge-components` to be able to render your PDF template.\n Maybe you don't have either of them installed?",
            );
          }
        }
      },
    );
  },
});
