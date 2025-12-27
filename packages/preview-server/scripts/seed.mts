import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const filename = url.fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const previewServerRoot = path.resolve(dirname, '..');
const templatesDirectoryPath = path.join(previewServerRoot, 'templates');

const seedPath = path.join(dirname, './utils/default-seed/');

if (existsSync(templatesDirectoryPath)) {
  console.info(
    'Deleting all files inside the templates directory (except for .gitkeep)',
  );
  const files = await fs.readdir(templatesDirectoryPath);
  for (const file of files) {
    if (file === '.gitkeep') {
      continue;
    }
    await fs.rm(file, { recursive: true, force: true });
  }
}

// Templates seed templates will be created later
if (existsSync(seedPath)) {
  console.info('Copying over the default seed to the templates directory');
  await fs.cp(seedPath, templatesDirectoryPath, {
    recursive: true,
  });
} else {
  console.info(
    'No seed templates found. Templates seed templates will be created later.',
  );
}
