#!/usr/bin/env bun

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import logSymbols from 'log-symbols';
import ora from 'ora';
import { tree } from './tree.js';

const dirname = import.meta.dir;

const packageJson = await Bun.file(
  path.resolve(dirname, '../package.json'),
).json();

const getLatestVersionOfTag = async (packageName, tag) => {
  const registry =
    process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org';
  const registryUrl = registry.replace(/\/$/, '');
  const response = await fetch(`${registryUrl}/${packageName}/${tag}`);
  const data = await response.json();

  if (typeof data === 'string' && data.startsWith('version not found')) {
    console.error(`Tag ${tag} does not exist for ${packageName}.`);
    process.exit(1);
  }

  const { version } = data;

  if (!/^\d+\.\d+\.\d+.*$/.test(version)) {
    console.error('Invalid version received, something has gone very wrong.');
  }

  return version;
};

const copyDirectory = async (src, dest) => {
  await fs.cp(src, dest, { recursive: true });
};

const init = async (name, { tag }) => {
  let projectPath = name;

  if (!projectPath) {
    projectPath = path.join(process.cwd(), 'react-pdf-starter');
  }

  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim();
  }

  const templatePath = path.resolve(dirname, '../template');
  const resolvedProjectPath = path.resolve(projectPath);

  try {
    await Bun.stat(resolvedProjectPath);
    console.error(`Project called ${projectPath} already exists!`);
    process.exit(1);
  } catch {
    // Directory doesn't exist, proceed
  }

  const spinner = ora({
    text: 'Preparing files...\n',
  }).start();

  await fs.mkdir(resolvedProjectPath, { recursive: true });
  await copyDirectory(templatePath, resolvedProjectPath);
  const templatePackageJsonPath = path.resolve(
    resolvedProjectPath,
    './package.json',
  );
  const templatePackageJson = await Bun.file(templatePackageJsonPath).text();

  const [componentsVersion, cliVersion, previewVersion] = await Promise.all([
    getLatestVersionOfTag('@ahmedrowaihi/pdf-forge-components', tag),
    getLatestVersionOfTag('@ahmedrowaihi/pdf-forge-cli', tag),
    getLatestVersionOfTag('@ahmedrowaihi/pdf-forge-preview', tag),
  ]);

  await Bun.write(
    templatePackageJsonPath,
    templatePackageJson
      .replace('INSERT_COMPONENTS_VERSION', componentsVersion)
      .replace('INSERT_CLI_VERSION', cliVersion)
      .replace('INSERT_PREVIEW_VERSION', previewVersion),
  );

  spinner.stopAndPersist({
    symbol: logSymbols.success,
    text: 'React PDF Starter files ready',
  });

  console.info(
    await tree(resolvedProjectPath, 4, (dirent) => {
      return !path
        .join(dirent.parentPath, dirent.name)
        .includes('node_modules');
    }),
  );
};

new Command()
  .name(packageJson.name)
  .version(packageJson.version)
  .description('The easiest way to get started with React PDF')
  .arguments('[dir]', 'Path to initialize the project')
  .option('-t, --tag <tag>', 'Tag of React PDF versions to use', 'latest')
  .action(init)
  .parse(process.argv);
