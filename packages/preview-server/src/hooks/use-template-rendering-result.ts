import { useState } from 'react';
import { getTemplatePathFromSlug } from '../actions/get-template-path-from-slug';
import {
  renderTemplateByPath,
  type TemplateRenderingResult,
} from '../actions/render-template-by-path';
import { isBuilding, isPreviewDevelopment } from '../app/env';
import { useTemplates } from '../contexts/templates';
import { containsTemplate } from '../utils/contains-template';
import { useHotreload } from './use-hot-reload';

export const useTemplateRenderingResult = (
  templatePath: string,
  serverTemplateRenderedResult: TemplateRenderingResult,
) => {
  const [renderingResult, setRenderingResult] = useState(
    serverTemplateRenderedResult,
  );

  const { templatesDirectoryMetadata } = useTemplates();

  if (!isBuilding && !isPreviewDevelopment) {
    // biome-ignore lint/correctness/useHookAtTopLevel: This is fine since isBuilding does not change at runtime
    useHotreload(async (changes) => {
      for await (const change of changes) {
        const relativePathForChangedFile =
          // ex: apple-receipt.tsx
          // it will be the path relative to the templates directory, so it is already
          // going to be equivalent to the slug
          change.filename;

        if (
          !containsTemplate(
            relativePathForChangedFile,
            templatesDirectoryMetadata,
          )
        ) {
          continue;
        }

        const pathForChangedTemplate = await getTemplatePathFromSlug(
          relativePathForChangedFile,
        );

        const newRenderingResult = await renderTemplateByPath(
          pathForChangedTemplate,
          true,
        );

        if (pathForChangedTemplate === templatePath) {
          setRenderingResult(newRenderingResult);
        }
      }
    });
  }

  return renderingResult;
};
