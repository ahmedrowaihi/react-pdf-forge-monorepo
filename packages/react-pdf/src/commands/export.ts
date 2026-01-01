import fs, { promises as fsPromises, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Options } from '@ahmedrowaihi/pdf-forge-core';
import { registerSpinnerAutostopping } from '@ahmedrowaihi/pdf-forge-dev-tools';
import {
  getTemplatesDirectoryMetadata,
  type TemplatesDirectory,
} from '@ahmedrowaihi/pdf-forge-templates';
import { glob } from 'glob';
import logSymbols from 'log-symbols';
import normalize from 'normalize-path';
import ora, { type Ora } from 'ora';
import { renderingUtilitiesExporter } from '../utils/bun/rendering-utilities-exporter.js';
import { tree } from '../utils/index.js';

const getTemplatesFromDirectory = (templateDirectory: TemplatesDirectory) => {
  const templatePaths = [] as string[];
  for (const filename of templateDirectory.templateFilenames) {
    templatePaths.push(path.join(templateDirectory.absolutePath, filename));
  }
  for (const directory of templateDirectory.subDirectories) {
    templatePaths.push(...getTemplatesFromDirectory(directory));
  }

  return templatePaths;
};

type ExportTemplatesOptions = Options & {
  silent?: boolean;
  pretty?: boolean;
};

/*
  This first builds all the templates using Bun.build() and then puts the output in the `.js`
  files. Then these `.js` files are imported dynamically and rendered to `.html` files
  using the `render` function.
 */
export const exportTemplates = async (
  pathToWhereTemplateMarkupShouldBeDumped: string,
  templatesDirectoryPath: string,
  options: ExportTemplatesOptions,
) => {
  /* Delete the out directory if it already exists */
  if (fs.existsSync(pathToWhereTemplateMarkupShouldBeDumped)) {
    fs.rmSync(pathToWhereTemplateMarkupShouldBeDumped, { recursive: true });
  }

  let spinner: Ora | undefined;
  if (!options.silent) {
    spinner = ora('Preparing files...\n').start();
    registerSpinnerAutostopping(spinner);
  }

  const templatesDirectoryMetadata = await getTemplatesDirectoryMetadata(
    path.resolve(process.cwd(), templatesDirectoryPath),
    true,
  );

  if (typeof templatesDirectoryMetadata === 'undefined') {
    if (spinner) {
      spinner.stopAndPersist({
        symbol: logSymbols.error,
        text: `Could not find the directory at ${templatesDirectoryPath}`,
      });
    }
    return;
  }

  const allTemplates = getTemplatesFromDirectory(templatesDirectoryMetadata);

  // Get the template directory to determine which files to transform
  const templateBaseDir = path.resolve(process.cwd(), templatesDirectoryPath);

  // Create asset transformation plugin to embed fonts/images as base64
  const assetTransformPlugin: Bun.BunPlugin = {
    name: 'asset-to-import-transform',
    setup(builder) {
      builder.onLoad(
        {
          filter: /\.(tsx?|jsx?)$/,
        },
        async (args) => {
          const filePath = args.path;
          // Only transform files within the template directory
          const isInTemplateDir = filePath.startsWith(templateBaseDir);

          if (!isInTemplateDir) {
            return undefined;
          }

          const code = await Bun.file(filePath).text();
          const { transformAssetsToImports } = await import(
            '@ahmedrowaihi/pdf-forge-assets'
          );
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

  try {
    const buildResult = await Bun.build({
      entrypoints: allTemplates,
      outdir: pathToWhereTemplateMarkupShouldBeDumped,
      target: 'node',
      format: 'cjs',
      plugins: [assetTransformPlugin, renderingUtilitiesExporter(allTemplates)],
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

    // Rename .js files to .cjs for CommonJS compatibility
    const builtFiles = buildResult.outputs.filter((output) =>
      output.path.endsWith('.js'),
    );
    for (const file of builtFiles) {
      const newPath = file.path.replace(/\.js$/, '.cjs');
      await fsPromises.rename(file.path, newPath);
    }
  } catch (exception) {
    if (spinner) {
      spinner.stopAndPersist({
        symbol: logSymbols.error,
        text: 'Failed to build PDF templates',
      });
    }

    const error = exception as Error;
    console.error(`\n${error.message}`);

    process.exit(1);
  }

  if (spinner) {
    spinner.succeed();
  }

  const allBuiltTemplates = glob.sync(
    normalize(`${pathToWhereTemplateMarkupShouldBeDumped}/**/*.cjs`),
    {
      absolute: true,
    },
  );

  for await (const template of allBuiltTemplates) {
    try {
      if (spinner) {
        spinner.text = `rendering ${template.split('/').pop()}`;
        spinner.render();
      }

      const dynamicImport = new Function('path', 'return import(path)');
      const templateModule = await dynamicImport(`file://${template}`);

      const TemplateComponent = templateModule.default;
      const previewProps =
        TemplateComponent && 'PreviewProps' in TemplateComponent
          ? TemplateComponent.PreviewProps
          : {};

      const rendered = await templateModule.render(
        templateModule.reactPDFCreateReactElement(
          TemplateComponent,
          previewProps,
        ),
        options,
      );
      const htmlPath = template.replace(
        '.cjs',
        options.plainText ? '.txt' : '.html',
      );
      writeFileSync(htmlPath, rendered);
      unlinkSync(template);
    } catch (exception) {
      if (spinner) {
        spinner.stopAndPersist({
          symbol: logSymbols.error,
          text: `failed when rendering ${template.split('/').pop()}`,
        });
      }
      console.error(exception);
      process.exit(1);
    }
  }
  if (spinner) {
    spinner.succeed('Rendered all files');
    spinner.text = 'Copying static files';
    spinner.render();
  }

  // ex: templates/static
  const staticDirectoryPath = path.join(templatesDirectoryPath, 'static');

  if (fs.existsSync(staticDirectoryPath)) {
    const pathToDumpStaticFilesInto = path.join(
      pathToWhereTemplateMarkupShouldBeDumped,
      'static',
    );
    // cp('-r', ...) will copy *inside* of the static directory if it exists
    // causing a duplication of static files, so we need to delete ir first
    if (fs.existsSync(pathToDumpStaticFilesInto))
      await fs.promises.rm(pathToDumpStaticFilesInto, { recursive: true });

    try {
      await fs.promises.cp(staticDirectoryPath, pathToDumpStaticFilesInto, {
        recursive: true,
      });
    } catch (exception) {
      console.error(exception);
      if (spinner) {
        spinner.stopAndPersist({
          symbol: logSymbols.error,
          text: 'Failed to copy static files',
        });
      }
      console.error(
        `Something went wrong while copying the file to ${pathToWhereTemplateMarkupShouldBeDumped}/static, ${exception}`,
      );
      process.exit(1);
    }
  }

  if (spinner && !options.silent) {
    spinner.succeed();

    const fileTree = await tree(pathToWhereTemplateMarkupShouldBeDumped, 4);

    console.log(fileTree);

    spinner.stopAndPersist({
      symbol: logSymbols.success,
      text: 'Successfully exported PDF templates',
    });
  }
};
