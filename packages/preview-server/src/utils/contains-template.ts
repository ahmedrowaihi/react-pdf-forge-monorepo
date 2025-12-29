import type { TemplatesDirectory } from '@ahmedrowaihi/pdf-forge-toolbox';

export const removeFilenameExtension = (filename: string): string => {
  const parts = filename.split('.');

  if (parts.length > 1) {
    return parts.slice(0, -1).join('.');
  }

  return filename;
};

export const containsTemplate = (
  relativeTemplatePath: string,
  directory: TemplatesDirectory,
) => {
  const templatePathSegments = relativeTemplatePath
    .replace(directory.relativePath, '')
    .split('/')
    .filter(Boolean);

  return containsTemplatePathSegments(templatePathSegments, directory);
};

const containsTemplatePathSegments = (
  relativeTemplateSegments: string[],
  directory: TemplatesDirectory,
) => {
  if (relativeTemplateSegments.length === 1) {
    const templateFilename = removeFilenameExtension(
      relativeTemplateSegments[0]!,
    );
    return directory.templateFilenames.includes(templateFilename);
  }

  const remainingPath = relativeTemplateSegments.join('/');

  for (const subDirectory of directory.subDirectories) {
    if (remainingPath.startsWith(subDirectory.directoryName)) {
      const matchedSegments = subDirectory.directoryName
        .split('/')
        .filter(Boolean).length;

      return containsTemplatePathSegments(
        relativeTemplateSegments.slice(matchedSegments),
        subDirectory,
      );
    }
  }

  return false;
};
