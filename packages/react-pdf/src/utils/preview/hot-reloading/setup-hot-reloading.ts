import type http from 'node:http';
import path from 'node:path';
import { createDependencyGraph } from '@ahmedrowaihi/pdf-forge-assets';
import type { HotReloadChange } from '@ahmedrowaihi/pdf-forge-dev-tools';
import { watch } from 'chokidar';
import debounce from 'debounce';
import { type Socket, Server as SocketServer } from 'socket.io';

export const setupHotreloading = async (
  devServer: http.Server,
  templatesDirRelativePath: string,
) => {
  let clients: Socket[] = [];
  const io = new SocketServer(devServer);

  io.on('connection', (client) => {
    clients.push(client);

    client.on('disconnect', () => {
      clients = clients.filter((item) => item !== client);
    });
  });

  let changes = [] as HotReloadChange[];

  const reload = debounce(() => {
    clients.forEach((client) => {
      client.emit(
        'reload',
        changes.filter((change) =>
          path
            .resolve(absolutePathToTemplatesDirectory, change.filename)
            .startsWith(absolutePathToTemplatesDirectory),
        ),
      );
    });

    changes = [];
  }, 150);

  const absolutePathToTemplatesDirectory = path.resolve(
    process.cwd(),
    templatesDirRelativePath,
  );

  const [dependencyGraph, updateDependencyGraph, { resolveDependentsOf }] =
    await createDependencyGraph(absolutePathToTemplatesDirectory);

  const watcher = watch('', {
    ignoreInitial: true,
    cwd: absolutePathToTemplatesDirectory,
  });

  const getFilesOutsideTemplatesDirectory = () =>
    Object.keys(dependencyGraph).filter((p) =>
      path.relative(absolutePathToTemplatesDirectory, p).startsWith('..'),
    );
  let filesOutsideTemplatesDirectory = getFilesOutsideTemplatesDirectory();
  for (const p of filesOutsideTemplatesDirectory) {
    watcher.add(p);
  }

  const exit = async () => {
    await watcher.close();
  };
  process.on('SIGINT', exit);
  process.on('uncaughtException', exit);

  watcher.on('all', async (event, relativePathToChangeTarget) => {
    const file = relativePathToChangeTarget.split(path.sep);
    if (file.length === 0) {
      return;
    }
    const pathToChangeTarget = path.resolve(
      absolutePathToTemplatesDirectory,
      relativePathToChangeTarget,
    );

    await updateDependencyGraph(event, pathToChangeTarget);

    const newFilesOutsideTemplatesDirectory =
      getFilesOutsideTemplatesDirectory();
    for (const p of filesOutsideTemplatesDirectory) {
      if (!newFilesOutsideTemplatesDirectory.includes(p)) {
        watcher.unwatch(p);
      }
    }
    for (const p of newFilesOutsideTemplatesDirectory) {
      if (!filesOutsideTemplatesDirectory.includes(p)) {
        watcher.add(p);
      }
    }
    filesOutsideTemplatesDirectory = newFilesOutsideTemplatesDirectory;

    changes.push({
      event,
      filename: relativePathToChangeTarget,
    });

    for (const dependentPath of resolveDependentsOf(pathToChangeTarget)) {
      changes.push({
        event: 'change' as const,
        filename: path.relative(
          absolutePathToTemplatesDirectory,
          dependentPath,
        ),
      });
    }
    reload();
  });

  return watcher;
};
