import path from 'node:path';

export const getEnvVariablesForPreviewApp = (
  relativePathToTemplatesDirectory: string,
  previewServerLocation: string,
  cwd: string,
) => {
  return {
    TEMPLATES_DIR_RELATIVE_PATH: relativePathToTemplatesDirectory,
    TEMPLATES_DIR_ABSOLUTE_PATH: path.resolve(
      cwd,
      relativePathToTemplatesDirectory,
    ),
    PREVIEW_SERVER_LOCATION: previewServerLocation,
    USER_PROJECT_LOCATION: cwd,
  } as const;
};
