#!/usr/bin/env node
import { program } from 'commander';
import { build } from './commands/build.js';
import { dev } from './commands/dev.js';
import { exportTemplates } from './commands/export.js';
import { start } from './commands/start.js';
import { packageJson } from './utils/packageJson.js';

const PACKAGE_NAME = 'react-pdf';

program
  .name(PACKAGE_NAME)
  .description('A live preview of your PDF templates right in your browser')
  .version(packageJson.version);

program
  .command('dev')
  .description('Starts the preview PDF development app')
  .option(
    '-d, --dir <path>',
    'Directory with your PDF templates',
    './templates',
  )
  .option('-p --port <port>', 'Port to run dev server on', '3000')
  .action(dev);

program
  .command('build')
  .description('Copies the preview app for onto .react-pdf and builds it')
  .option(
    '-d, --dir <path>',
    'Directory with your PDF templates',
    './templates',
  )
  .option(
    '-p --packageManager <name>',
    'Package name to use on installation on `.react-pdf`',
    'npm',
  )
  .action(build);

program
  .command('start')
  .description('Runs the built preview app that is inside of ".react-pdf"')
  .action(start);

program
  .command('export')
  .description('Build the templates to the `out` directory')
  .option('--outDir <path>', 'Output directory', 'out')
  .option('-p, --pretty', 'Pretty print the output', false)
  .option('-t, --plainText', 'Set output format as plain text', false)
  .option(
    '-d, --dir <path>',
    'Directory with your PDF templates',
    './templates',
  )
  .option(
    '-s, --silent',
    'To, or not to show a spinner with process information',
    false,
  )
  .action(({ outDir, pretty, plainText, silent, dir: srcDir }) =>
    exportTemplates(outDir, srcDir, { silent, plainText, pretty }),
  );

program.parse();
