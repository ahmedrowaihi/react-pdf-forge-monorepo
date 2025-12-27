'use server';

import type { TemplatesDirectory } from '../utils/get-templates-directory-metadata';
import { getTemplatesDirectoryMetadata } from '../utils/get-templates-directory-metadata';

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
