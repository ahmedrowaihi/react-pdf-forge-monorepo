import fs from 'node:fs';
import path from 'node:path';
import { addDevDependency } from 'nypm';
import prompts from 'prompts';
import { packageJson } from './packageJson.js';

const ensurePreviewServerInstalled = async (
  message: string,
): Promise<never> => {
  const response = await prompts({
    type: 'confirm',
    name: 'installPreviewServer',
    message,
    initial: true,
  });
  if (response.installPreviewServer) {
    console.log('Installing "@ahmedrowaihi/pdf-forge-preview"');
    await addDevDependency(
      `@ahmedrowaihi/pdf-forge-preview@${packageJson.version}`,
    );
    process.exit(0);
  } else {
    process.exit(0);
  }
};

const findWorkspacePreviewServer = (): string | null => {
  const cwd = process.cwd();

  let workspaceRoot: string | null = null;
  let currentPath = cwd;
  while (currentPath !== path.dirname(currentPath)) {
    const pnpmWorkspace = path.join(currentPath, 'pnpm-workspace.yaml');
    if (fs.existsSync(pnpmWorkspace)) {
      workspaceRoot = currentPath;
      break;
    }
    currentPath = path.dirname(currentPath);
  }

  if (workspaceRoot) {
    const previewServerPath = path.resolve(
      workspaceRoot,
      'packages/preview-server',
    );
    const packageJsonPath = path.join(previewServerPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
          name: string;
        };
        if (pkg.name === '@ahmedrowaihi/pdf-forge-preview') {
          return previewServerPath;
        }
      } catch {
        // Invalid package.json, continue
      }
    }
  }
  return null;
};

/**
 * Finds the location of the preview server
 * 1. Checks if the preview server is installed in the workspace
 * 2. If not, checks if the preview server is installed in the cwd
 * 3. If not, prompts the user to install it
 * 4. If the user installs it, it will return the location of the preview server
 * 5. If the user does not install it, it will exit the process
 * @returns The location of the preview server
 */
export const getPreviewServerLocation = async () => {
  let previewServerLocation!: string;

  const workspacePath = findWorkspacePreviewServer();
  if (workspacePath) {
    previewServerLocation = workspacePath;
  } else {
    try {
      previewServerLocation = path.dirname(
        Bun.resolveSync('@ahmedrowaihi/pdf-forge-preview', process.cwd()),
      );
    } catch {
      await ensurePreviewServerInstalled(
        'To run the preview server, the package "@ahmedrowaihi/pdf-forge-preview" must be installed. Would you like to install it?',
      );
    }
  }

  // If we found it in workspace, skip version check (workspace packages are always in sync)
  if (!workspacePath) {
    // Verify version if we can import it (only for non-workspace installations)
    try {
      const packagePath = Bun.resolveSync(
        '@ahmedrowaihi/pdf-forge-preview/package.json',
        process.cwd(),
      );
      const pkg = JSON.parse(await Bun.file(packagePath).text()) as {
        version: string;
      };
      if (pkg.version !== packageJson.version) {
        await ensurePreviewServerInstalled(
          `To run the preview server, the version of "@ahmedrowaihi/pdf-forge-preview" must match the version of "@ahmedrowaihi/pdf-forge-cli" (${packageJson.version}). Would you like to install it?`,
        );
      }
    } catch {
      await ensurePreviewServerInstalled(
        'To run the preview server, the package "@ahmedrowaihi/pdf-forge-preview" must be installed. Would you like to install it?',
      );
    }
  }

  return previewServerLocation;
};
