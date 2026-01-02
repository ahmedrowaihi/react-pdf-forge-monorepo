import type { TemplatesDirectory } from '@ahmedrowaihi/pdf-forge-templates';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as React from 'react';
import { FileTreeDirectoryChildren } from './file-tree-directory-children';

interface FileTreeProps {
  currentTemplateOpenSlug: string | undefined;
  templatesDirectoryMetadata: TemplatesDirectory;
}

export const FileTree = ({
  currentTemplateOpenSlug,
  templatesDirectoryMetadata,
}: FileTreeProps) => {
  return (
    <div className="flex w-full h-full flex-col lg:w-full lg:min-w-58">
      <nav className="flex grow flex-col p-4 pr-0 pl-0">
        <Collapsible.Root open>
          <React.Suspense>
            <FileTreeDirectoryChildren
              currentTemplateOpenSlug={currentTemplateOpenSlug}
              templatesDirectoryMetadata={templatesDirectoryMetadata}
              isRoot
              open
            />
          </React.Suspense>
        </Collapsible.Root>
      </nav>
    </div>
  );
};
