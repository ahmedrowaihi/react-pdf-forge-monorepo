import fs, { unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import type { Options } from '@ahmedrowaihi/pdf-forge-core';
import {
  registerSpinnerAutostopping,
  renderingUtilitiesExporter,
} from '@ahmedrowaihi/pdf-forge-dev-tools';
import {
  getTemplatesDirectoryMetadata,
  type TemplatesDirectory,
} from '@ahmedrowaihi/pdf-forge-templates';
import { type BuildFailure, build } from 'esbuild';
import { glob } from 'glob';
import logSymbols from 'log-symbols';
import normalize from 'normalize-path';
import ora, { type Ora } from 'ora';
import type React from 'react';
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

const filename = url.fileURLToPath(import.meta.url);

const require = createRequire(filename);

/*
  This first builds all the templates using esbuild and then puts the output in the `.js`
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

  try {
    await build({
      bundle: true,
      entryPoints: allTemplates,
      format: 'cjs',
      jsx: 'automatic',
      loader: { '.js': 'jsx' },
      logLevel: 'silent',
      outExtension: { '.js': '.cjs' },
      outdir: pathToWhereTemplateMarkupShouldBeDumped,
      platform: 'node',
      plugins: [renderingUtilitiesExporter(allTemplates)],
      write: true,
    });
  } catch (exception) {
    if (spinner) {
      spinner.stopAndPersist({
        symbol: logSymbols.error,
        text: 'Failed to build PDF templates',
      });
    }

    const buildFailure = exception as BuildFailure;
    console.error(`\n${buildFailure.message}`);

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
      delete require.cache[template];
      const templateModule = require(template) as {
        default: React.FC;
        render: (
          element: React.ReactElement,
          options: Record<string, unknown>,
        ) => Promise<string>;
        reactPDFCreateReactElement: typeof React.createElement;
      };
      const rendered = await templateModule.render(
        templateModule.reactPDFCreateReactElement(templateModule.default, {}),
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
