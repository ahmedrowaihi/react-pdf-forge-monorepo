import fs from 'node:fs';
import path from 'node:path';
import {
  getTemplatesDirectoryMetadata,
  registerSpinnerAutostopping,
  type TemplatesDirectory,
} from '@ahmedrowaihi/pdf-forge-toolbox';
import logSymbols from 'log-symbols';
import { installDependencies, type PackageManagerName, runScript } from 'nypm';
import ora from 'ora';
import { getPreviewServerLocation } from '../utils/get-preview-server-location.js';

interface Args {
  dir: string;
  packageManager: PackageManagerName;
}

const setNextEnvironmentVariablesForBuild = async (
  templatesDirRelativePath: string,
  builtPreviewAppPath: string,
) => {
  const nextConfigContents = `
import path from 'path';
const templatesDirRelativePath = path.normalize('${templatesDirRelativePath}');
const userProjectLocation = '${process.cwd().replace(/\\/g, '/')}';
const previewServerLocation = '${builtPreviewAppPath.replace(/\\/g, '/')}';
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_IS_BUILDING: 'true',
    TEMPLATES_DIR_RELATIVE_PATH: templatesDirRelativePath,
    TEMPLATES_DIR_ABSOLUTE_PATH: path.resolve(userProjectLocation, templatesDirRelativePath),
    PREVIEW_SERVER_LOCATION: previewServerLocation,
    USER_PROJECT_LOCATION: userProjectLocation
  },
  outputFileTracingRoot: previewServerLocation,
  serverExternalPackages: ["playwright", "playwright-core", "sharp"],
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    webpackBuildWorker: true
  },
}

export default nextConfig`;

  await fs.promises.writeFile(
    path.resolve(builtPreviewAppPath, './next.config.mjs'),
    nextConfigContents,
    'utf8',
  );
};

const getTemplateSlugsFromTemplateDirectory = (
  templateDirectory: TemplatesDirectory,
  templatesDirectoryAbsolutePath: string,
) => {
  const directoryPathRelativeToTemplatesDirectory =
    templateDirectory.absolutePath
      .replace(templatesDirectoryAbsolutePath, '')
      .trim();

  const slugs = [] as Array<string>[];
  for (const filename of templateDirectory.templateFilenames) {
    slugs.push(
      path
        .join(directoryPathRelativeToTemplatesDirectory, filename)
        .split(path.sep)
        .filter((segment) => segment.length > 0),
    );
  }
  for (const directory of templateDirectory.subDirectories) {
    slugs.push(
      ...getTemplateSlugsFromTemplateDirectory(
        directory,
        templatesDirectoryAbsolutePath,
      ),
    );
  }

  return slugs;
};

// we do this because otherwise it won't be able to find the templates
// after build
const forceSSGForPDFPreviews = async (
  templatesDirPath: string,
  builtPreviewAppPath: string,
) => {
  const templatesDirectoryMetadata = (await getTemplatesDirectoryMetadata(
    templatesDirPath,
  ))!;

  const parameters = getTemplateSlugsFromTemplateDirectory(
    templatesDirectoryMetadata,
    templatesDirPath,
  ).map((slug) => ({ slug }));

  const removeForceDynamic = async (filePath: string) => {
    const contents = await fs.promises.readFile(filePath, 'utf8');

    await fs.promises.writeFile(
      filePath,
      contents.replace("export const dynamic = 'force-dynamic';", ''),
      'utf8',
    );
  };
  await removeForceDynamic(
    path.resolve(builtPreviewAppPath, './src/app/layout.tsx'),
  );
  await removeForceDynamic(
    path.resolve(builtPreviewAppPath, './src/app/preview/[...slug]/page.tsx'),
  );

  await fs.promises.appendFile(
    path.resolve(builtPreviewAppPath, './src/app/preview/[...slug]/page.tsx'),
    `

export function generateStaticParams() { 
  return Promise.resolve(
    ${JSON.stringify(parameters)}
  );
}`,
    'utf8',
  );
};

const findWorkspaceRoot = (startPath: string): string | null => {
  let currentPath = startPath;
  while (currentPath !== path.dirname(currentPath)) {
    const pnpmWorkspace = path.join(currentPath, 'pnpm-workspace.yaml');
    if (fs.existsSync(pnpmWorkspace)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
};

const findWorkspacePackage = (
  packageName: string,
  workspaceRoot: string,
): string | null => {
  const searchDirs = [
    path.join(workspaceRoot, 'packages'),
    path.join(workspaceRoot, 'apps'),
  ];

  for (const baseDir of searchDirs) {
    if (!fs.existsSync(baseDir)) {
      continue;
    }

    const packageDirs = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const dirent of packageDirs) {
      if (dirent.isDirectory()) {
        const packagePath = path.join(baseDir, dirent.name);
        const packageJsonPath = path.join(packagePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          try {
            const pkg = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf8'),
            ) as {
              name: string;
              main?: string;
              repository?: { directory?: string };
            };
            if (pkg.name === packageName) {
              if (pkg.main?.includes('dist')) {
                const distPath = path.join(packagePath, 'dist');
                if (!fs.existsSync(distPath)) {
                  console.warn(
                    `Warning: Package ${packageName} has not been built (dist/ missing). It may need to be built first.`,
                  );
                }
              }
              return packagePath;
            }
          } catch {
            // Invalid package.json, continue
          }
        }
      }
    }
  }
  return null;
};

const updatePackageJson = async (builtPreviewAppPath: string) => {
  const packageJsonPath = path.resolve(builtPreviewAppPath, './package.json');
  const packageJson = JSON.parse(
    await fs.promises.readFile(packageJsonPath, 'utf8'),
  ) as {
    name: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  packageJson.scripts.build = 'next build';
  packageJson.scripts.start = 'next start';
  delete packageJson.scripts.postbuild;

  packageJson.name = 'preview-server';

  const workspaceRoot = findWorkspaceRoot(process.cwd());

  if (packageJson.dependencies && workspaceRoot) {
    for (const [dependency, version] of Object.entries(
      packageJson.dependencies,
    )) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        const packagePath = findWorkspacePackage(dependency, workspaceRoot);
        if (packagePath) {
          const packageJsonPath = path.join(packagePath, 'package.json');
          try {
            const pkg = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf8'),
            ) as { main?: string };
            if (pkg.main?.includes('dist')) {
              const distPath = path.join(packagePath, 'dist');
              if (!fs.existsSync(distPath)) {
                throw new Error(
                  `Package ${dependency} has not been built. Please run 'pnpm build:packages' first.`,
                );
              }
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('built')) {
              throw error;
            }
            // Continue if package.json read fails
          }

          const normalizedPath = path.resolve(packagePath).replace(/\\/g, '/');
          packageJson.dependencies[dependency] = `file:${normalizedPath}`;
        } else {
          console.warn(
            `Warning: Could not find workspace package ${dependency}, removing from dependencies.`,
          );
          delete packageJson.dependencies[dependency];
        }
      }
    }
  } else if (packageJson.dependencies && !workspaceRoot) {
    console.warn(
      'Warning: Could not find workspace root. Workspace dependencies will be removed.',
    );
    // Remove all workspace dependencies if we can't find the workspace
    for (const [dependency, version] of Object.entries(
      packageJson.dependencies,
    )) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        delete packageJson.dependencies[dependency];
      }
    }
  }

  for (const [dependency, version] of Object.entries(
    packageJson.devDependencies || {},
  )) {
    packageJson.devDependencies[dependency] = version.replace('workspace:', '');
  }

  // Dependencies will be resolved from the user's project
  delete packageJson.devDependencies['@ahmedrowaihi/pdf-forge-components'];
  delete packageJson.devDependencies['@ahmedrowaihi/pdf-forge-core'];
  delete packageJson.scripts.prepare;

  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson),
    'utf8',
  );
};

export const build = async ({
  dir: templatesDirRelativePath,
  packageManager,
}: Args) => {
  try {
    const previewServerLocation = await getPreviewServerLocation();

    const spinner = ora({
      text: 'Starting build process...',
      prefixText: '  ',
    }).start();
    registerSpinnerAutostopping(spinner);

    spinner.text = `Checking if ${templatesDirRelativePath} folder exists`;
    if (!fs.existsSync(templatesDirRelativePath)) {
      process.exit(1);
    }

    const templatesDirPath = path.join(process.cwd(), templatesDirRelativePath);
    const staticPath = path.join(templatesDirPath, 'static');

    const builtPreviewAppPath = path.join(process.cwd(), '.react-pdf');

    if (fs.existsSync(builtPreviewAppPath)) {
      spinner.text = 'Deleting pre-existing `.react-pdf` folder';
      await fs.promises.rm(builtPreviewAppPath, { recursive: true });
    }

    spinner.text = 'Copying preview app from CLI to `.react-pdf`';
    await fs.promises.cp(previewServerLocation, builtPreviewAppPath, {
      recursive: true,
      filter: (source: string) => {
        // do not copy the CLI files
        return (
          !/(\/|\\)cli(\/|\\)?/.test(source) &&
          !/(\/|\\)\.next(\/|\\)?/.test(source) &&
          !/(\/|\\)\.turbo(\/|\\)?/.test(source) &&
          !/(\/|\\)node_modules(\/|\\)?$/.test(source)
        );
      },
    });

    if (fs.existsSync(staticPath)) {
      spinner.text = 'Copying `static` folder into `.react-pdf/public/static`';
      const builtStaticDirectory = path.resolve(
        builtPreviewAppPath,
        './public/static',
      );
      await fs.promises.cp(staticPath, builtStaticDirectory, {
        recursive: true,
      });
    }

    spinner.text =
      'Setting Next environment variables for preview app to work properly';
    await setNextEnvironmentVariablesForBuild(
      templatesDirRelativePath,
      builtPreviewAppPath,
    );

    spinner.text = 'Setting server side generation for the PDF preview pages';
    await forceSSGForPDFPreviews(templatesDirPath, builtPreviewAppPath);

    spinner.text = "Updating package.json's build and start scripts";
    await updatePackageJson(builtPreviewAppPath);

    spinner.text = 'Installing dependencies on `.react-pdf`';
    await installDependencies({
      cwd: builtPreviewAppPath,
      silent: true,
      packageManager,
    });

    spinner.stopAndPersist({
      text: 'Successfully prepared `.react-pdf` for `next build`',
      symbol: logSymbols.success,
    });

    await runScript('build', {
      packageManager,
      cwd: builtPreviewAppPath,
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
