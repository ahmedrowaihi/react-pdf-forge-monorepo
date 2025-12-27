'use client';

import { createContext, useContext, useState } from 'react';
import { getTemplatesDirectoryMetadataAction } from '../actions/get-templates-directory-metadata-action';
import { isBuilding, isPreviewDevelopment } from '../app/env';
import { useHotreload } from '../hooks/use-hot-reload';
import type { TemplatesDirectory } from '../utils/get-templates-directory-metadata';

const TemplatesContext = createContext<
  | {
      templatesDirectoryMetadata: TemplatesDirectory;
    }
  | undefined
>(undefined);

export const useTemplates = () => {
  const providerValue = useContext(TemplatesContext);

  if (typeof providerValue === 'undefined') {
    throw new Error(
      'Cannot call `useTemplates` outside of a `TemplatesContext` provider.',
    );
  }

  return providerValue;
};

export const TemplatesProvider = (props: {
  initialTemplatesDirectoryMetadata: TemplatesDirectory;
  children: React.ReactNode;
}) => {
  const [templatesDirectoryMetadata, setTemplatesDirectoryMetadata] =
    useState<TemplatesDirectory>(props.initialTemplatesDirectoryMetadata);

  if (!isBuilding && !isPreviewDevelopment) {
    // biome-ignore lint/correctness/useHookAtTopLevel: this will not change on runtime so it doesn't violate the rules of hooks
    useHotreload(() => {
      void getTemplatesDirectoryMetadataAction(
        props.initialTemplatesDirectoryMetadata.absolutePath,
      ).then((metadata) => {
        if (metadata) {
          setTemplatesDirectoryMetadata(metadata);
        } else {
          throw new Error(
            'Hot reloading: unable to find the templates directory to update the sidebar',
          );
        }
      });
    });
  }

  return (
    <TemplatesContext.Provider value={{ templatesDirectoryMetadata }}>
      {props.children}
    </TemplatesContext.Provider>
  );
};
