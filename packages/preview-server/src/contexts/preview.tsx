'use client';
import { useRouter } from 'next/navigation';
import { createContext, useContext } from 'react';
import type {
  RenderedTemplateMetadata,
  TemplateRenderingResult,
} from '../actions/render-template-by-path';
import { isBuilding, isPreviewDevelopment } from '../app/env';
import { useHotreload } from '../hooks/use-hot-reload';
import { useRenderingMetadata } from '../hooks/use-rendering-metadata';
import { useTemplateRenderingResult } from '../hooks/use-template-rendering-result';

export const PreviewContext = createContext<
  | {
      renderedTemplateMetadata: RenderedTemplateMetadata | undefined;
      renderingResult: TemplateRenderingResult;

      templateSlug: string;
      templatePath: string;
    }
  | undefined
>(undefined);

interface PreviewProvider {
  templateSlug: string;
  templatePath: string;

  serverRenderingResult: TemplateRenderingResult;

  children: React.ReactNode;
}

export const PreviewProvider = ({
  templateSlug,
  templatePath,
  serverRenderingResult,
  children,
}: PreviewProvider) => {
  const router = useRouter();

  const renderingResult = useTemplateRenderingResult(
    templatePath,
    serverRenderingResult,
  );

  const renderedTemplateMetadata = useRenderingMetadata(
    templatePath,
    renderingResult,
    serverRenderingResult,
  );

  if (!isBuilding && !isPreviewDevelopment) {
    // biome-ignore lint/correctness/useHookAtTopLevel: this will not change on runtime so it doesn't violate the rules of hooks
    useHotreload((changes) => {
      const changeForThisTemplate = changes.find((change) =>
        change.filename.includes(templateSlug),
      );

      if (typeof changeForThisTemplate !== 'undefined') {
        if (changeForThisTemplate.event === 'unlink') {
          router.push('/');
        }
      }
    });
  }

  return (
    <PreviewContext.Provider
      value={{
        templatePath,
        templateSlug,
        renderedTemplateMetadata,
        renderingResult,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreviewContext = () => {
  const previewContext = useContext(PreviewContext);

  if (typeof previewContext === 'undefined') {
    throw new Error(
      'Cannot call `usePreviewContext` outside of an `PreviewContext` provider.',
    );
  }

  return previewContext;
};
