import type http from 'node:http';
import path from 'node:path';
import { watch } from 'chokidar';
import debounce from 'debounce';
import { type Socket, Server as SocketServer } from 'socket.io';
import type { HotReloadChange } from '../../types/hot-reload-change.js';
import { createDependencyGraph } from './create-dependency-graph.js';

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

  // used to keep track of all changes
  // and send them at once to the preview app through the web socket
  let changes = [] as HotReloadChange[];

  const reload = debounce(() => {
    // we detect these using the useHotreload hook on the Next app
    clients.forEach((client) => {
      client.emit(
        'reload',
        changes.filter((change) =>
          // Ensures only changes inside the templates directory are emitted
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
  // adds in to be watched separately all of the files that are outside of
  // the user's templates directory
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
    // updates the files outside of the user's templates directory by unwatching
    // the inexistent ones and watching the new ones
    //
    // Update watched files outside templates directory to handle dependency changes
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

    // These dependents are dependents resolved recursively, so even dependents of dependents
    // will be notified of this change so that we ensure that things are updated in the preview.
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
