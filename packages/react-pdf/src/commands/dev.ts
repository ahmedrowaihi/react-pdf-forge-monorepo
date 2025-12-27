import fs from 'node:fs';
import { setupHotreloading, startDevServer } from '../utils/index.js';

interface Args {
  dir: string;
  port: string;
}

export const dev = async ({ dir: templatesDirRelativePath, port }: Args) => {
  try {
    if (!fs.existsSync(templatesDirRelativePath)) {
      console.error(`Missing ${templatesDirRelativePath} folder`);
      process.exit(1);
    }

    const devServer = await startDevServer(
      templatesDirRelativePath,
      templatesDirRelativePath, // defaults to ./templates/static for the static files that are served to the preview
      Number.parseInt(port, 10),
    );

    await setupHotreloading(devServer, templatesDirRelativePath);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
