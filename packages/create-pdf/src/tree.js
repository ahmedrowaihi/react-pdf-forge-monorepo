/* biome-ignore lint: JavaScript file, TypeScript strict checks not needed */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SYMBOLS = {
  BRANCH: '├── ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '└── ',
  VERTICAL: '│   ',
};

const getTreeLines = async (
  dirPath,
  depth,
  currentDepth = 0,
  filter = null,
) => {
  const dirFullpath = path.resolve(dirPath);
  const dirname = path.basename(dirFullpath);
  let lines = [dirname];

  const dirStat = await fs.stat(dirFullpath);
  if (dirStat.isDirectory() && currentDepth < depth) {
    const childDirents = await fs.readdir(dirFullpath, { withFileTypes: true });

    // Apply filter if provided
    const filteredDirents = filter
      ? childDirents.filter((dirent) => {
          return filter({
            ...dirent,
            parentPath: dirFullpath,
            name: dirent.name,
          });
        })
      : childDirents;

    filteredDirents.sort((a, b) => {
      // orders directories before files
      if (a.isDirectory() && b.isFile()) {
        return -1;
      }

      if (a.isFile() && b.isDirectory()) {
        return 1;
      }

      // orders by name because they are the same type
      // either directory & directory
      // or file & file
      return b.name > a.name ? -1 : 1;
    });

    for (let i = 0; i < filteredDirents.length; i++) {
      const dirent = filteredDirents[i];
      const isLast = i === filteredDirents.length - 1;

      const branchingSymbol = isLast ? SYMBOLS.LAST_BRANCH : SYMBOLS.BRANCH;
      const verticalSymbol = isLast ? SYMBOLS.INDENT : SYMBOLS.VERTICAL;

      if (dirent.isFile()) {
        lines.push(`${branchingSymbol}${dirent.name}`);
      } else {
        const pathToDirectory = path.join(dirFullpath, dirent.name);
        const treeLinesForSubDirectory = await getTreeLines(
          pathToDirectory,
          depth,
          currentDepth + 1,
          filter,
        );
        lines = lines.concat(
          treeLinesForSubDirectory.map((line, index) =>
            index === 0
              ? `${branchingSymbol}${line}`
              : `${verticalSymbol}${line}`,
          ),
        );
      }
    }
  }

  return lines;
};

export const tree = async (dirPath, depth, filter = null) => {
  const lines = await getTreeLines(dirPath, depth, 0, filter);
  return lines.join(os.EOL);
};
