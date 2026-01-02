'use client';
import type { TemplatesDirectory } from '@ahmedrowaihi/pdf-forge-templates';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as React from 'react';
import { cn } from '../../utils';
import { Heading } from '../heading';
import { IconArrowDown } from '../icons/icon-arrow-down';
import { IconFolder } from '../icons/icon-folder';
import { IconFolderOpen } from '../icons/icon-folder-open';
import { FileTreeDirectoryChildren } from './file-tree-directory-children';

interface SidebarDirectoryProps {
  templatesDirectoryMetadata: TemplatesDirectory;
  className?: string;
  currentTemplateOpenSlug?: string;
}

const persistedOpenDirectories = new Set<string>();

export const FileTreeDirectory = ({
  templatesDirectoryMetadata: directoryMetadata,
  className,
  currentTemplateOpenSlug,
}: SidebarDirectoryProps) => {
  const doesDirectoryContainCurrentTemplateOpen = currentTemplateOpenSlug
    ? currentTemplateOpenSlug.includes(directoryMetadata.relativePath)
    : false;

  const isEmpty =
    directoryMetadata.templateFilenames.length === 0 &&
    directoryMetadata.subDirectories.length === 0;

  const [open, setOpen] = React.useState(
    persistedOpenDirectories.has(directoryMetadata.absolutePath) ||
      doesDirectoryContainCurrentTemplateOpen,
  );

  return (
    <Collapsible.Root
      className={cn('group', className)}
      onOpenChange={(isOpening) => {
        if (isOpening) {
          persistedOpenDirectories.add(directoryMetadata.absolutePath);
        } else {
          persistedOpenDirectories.delete(directoryMetadata.absolutePath);
        }

        setOpen(isOpening);
      }}
      open={open}
    >
      <Collapsible.Trigger
        className={cn(
          'mt-1 mb-1.5 flex w-full items-center text-start justify-between gap-2 font-medium text-[14px]',
          {
            'cursor-pointer': !isEmpty,
          },
        )}
      >
        {open ? (
          <IconFolderOpen className="w-[20px]" height="20" width="20" />
        ) : (
          <IconFolder height="20" width="20" />
        )}
        <Heading
          as="h3"
          className="transition grow w-[calc(100%-40px)] truncate duration-200 ease-in-out hover:text-slate-12"
          color="gray"
          size="2"
          weight="medium"
        >
          {directoryMetadata.directoryName}
        </Heading>
        {!isEmpty ? (
          <IconArrowDown
            width="20"
            height="20"
            className="ml-auto opacity-60 transition-transform data-[open=true]:rotate-180"
            data-open={open}
          />
        ) : null}
      </Collapsible.Trigger>
      {!isEmpty ? (
        <FileTreeDirectoryChildren
          currentTemplateOpenSlug={currentTemplateOpenSlug}
          templatesDirectoryMetadata={directoryMetadata}
          open={open}
        />
      ) : null}
    </Collapsible.Root>
  );
};
