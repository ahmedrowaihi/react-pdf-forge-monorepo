import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createJiti } from 'jiti';
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

export const getPreviewServerLocation = async () => {
  const usersProject = createJiti(process.cwd());
  let previewServerLocation!: string;

  // First try to find it in workspace
  const workspacePath = findWorkspacePreviewServer();
  if (workspacePath) {
    previewServerLocation = workspacePath;
  } else {
    // Try to resolve from node_modules
    try {
      previewServerLocation = path.dirname(
        url.fileURLToPath(
          usersProject.esmResolve('@ahmedrowaihi/pdf-forge-preview'),
        ),
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
      const { version } = await usersProject.import<{
        version: string;
      }>('@ahmedrowaihi/pdf-forge-preview');
      if (version !== packageJson.version) {
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
