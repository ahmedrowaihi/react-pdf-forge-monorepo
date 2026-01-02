'use server';

import {
  getTemplatesDirectoryMetadata,
  type TemplatesDirectory,
} from '@ahmedrowaihi/pdf-forge-templates';

export const getTemplatesDirectoryMetadataAction = async (
  absolutePathToTemplatesDirectory: string,
  keepFileExtensions = false,
  isSubDirectory = false,

  baseDirectoryPath = absolutePathToTemplatesDirectory,
): Promise<TemplatesDirectory | undefined> => {
  return getTemplatesDirectoryMetadata(
    absolutePathToTemplatesDirectory,
    keepFileExtensions,
    isSubDirectory,
    baseDirectoryPath,
  );
};
