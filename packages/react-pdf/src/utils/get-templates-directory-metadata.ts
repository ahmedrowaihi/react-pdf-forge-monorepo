import fs from 'node:fs';
import path from 'node:path';

const isFileATemplate = async (fullPath: string): Promise<boolean> => {
  let fileHandle: fs.promises.FileHandle;
  try {
    fileHandle = await fs.promises.open(fullPath, 'r');
  } catch (exception) {
    console.warn(exception);
    return false;
  }
  const stat = await fileHandle.stat();

  if (stat.isDirectory()) {
    await fileHandle.close();
    return false;
  }

  const { ext } = path.parse(fullPath);

  if (!['.js', '.tsx', '.jsx'].includes(ext)) {
    await fileHandle.close();
    return false;
  }

  // check with a heuristic to see if the file has at least
  // a default export (ES6) or module.exports (CommonJS) or named exports (MDX)
  const fileContents = await fileHandle.readFile('utf8');

  await fileHandle.close();

  // Check for ES6 export default syntax
  const hasES6DefaultExport = /\bexport\s+default\b/gm.test(fileContents);

  // Check for CommonJS module.exports syntax
  const hasCommonJSExport = /\bmodule\.exports\s*=/gm.test(fileContents);

  // Check for named exports (used in MDX files) and ensure at least one is marked as default
  const hasNamedExport = /\bexport\s+\{[^}]*\bdefault\b[^}]*\}/gm.test(
    fileContents,
  );

  return hasES6DefaultExport || hasCommonJSExport || hasNamedExport;
};

export interface TemplatesDirectory {
  absolutePath: string;
  relativePath: string;
  directoryName: string;
  templateFilenames: string[];
  subDirectories: TemplatesDirectory[];
}

const mergeDirectoriesWithSubDirectories = (
  templatesDirectoryMetadata: TemplatesDirectory,
): TemplatesDirectory => {
  let currentResultingMergedDirectory: TemplatesDirectory =
    templatesDirectoryMetadata;

  while (
    currentResultingMergedDirectory.templateFilenames.length === 0 &&
    currentResultingMergedDirectory.subDirectories.length === 1
  ) {
    const onlySubDirectory = currentResultingMergedDirectory.subDirectories[0]!;
    currentResultingMergedDirectory = {
      ...onlySubDirectory,
      directoryName: path.join(
        currentResultingMergedDirectory.directoryName,
        onlySubDirectory.directoryName,
      ),
    };
  }

  return currentResultingMergedDirectory;
};

export const getTemplatesDirectoryMetadata = async (
  absolutePathToTemplatesDirectory: string,
  keepFileExtensions = false,
  isSubDirectory = false,
  baseDirectoryPath = absolutePathToTemplatesDirectory,
): Promise<TemplatesDirectory | undefined> => {
  if (!fs.existsSync(absolutePathToTemplatesDirectory)) return;

  const dirents = await fs.promises.readdir(absolutePathToTemplatesDirectory, {
    withFileTypes: true,
  });

  const isTemplatePredicates = await Promise.all(
    dirents.map((dirent) =>
      isFileATemplate(path.join(absolutePathToTemplatesDirectory, dirent.name)),
    ),
  );
  const templateFilenames = dirents
    .filter((_, i) => isTemplatePredicates[i])
    .map((dirent) =>
      keepFileExtensions
        ? dirent.name
        : dirent.name.replace(path.extname(dirent.name), ''),
    );

  const subDirectories = await Promise.all(
    dirents
      .filter(
        (dirent) =>
          dirent.isDirectory() &&
          !dirent.name.startsWith('_') &&
          dirent.name !== 'static',
      )
      .map((dirent) => {
        const direntAbsolutePath = path.join(
          absolutePathToTemplatesDirectory,
          dirent.name,
        );

        return getTemplatesDirectoryMetadata(
          direntAbsolutePath,
          keepFileExtensions,
          true,
          baseDirectoryPath,
        ) as Promise<TemplatesDirectory>;
      }),
  );

  const templatesMetadata = {
    absolutePath: absolutePathToTemplatesDirectory,
    relativePath: path.relative(
      baseDirectoryPath,
      absolutePathToTemplatesDirectory,
    ),
    directoryName: absolutePathToTemplatesDirectory.split(path.sep).pop()!,
    templateFilenames,
    subDirectories,
  } satisfies TemplatesDirectory;

  return isSubDirectory
    ? mergeDirectoriesWithSubDirectories(templatesMetadata)
    : templatesMetadata;
};
