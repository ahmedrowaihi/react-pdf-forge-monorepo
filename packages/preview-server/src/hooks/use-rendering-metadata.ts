import { useEffect } from 'react';
import type {
  RenderedTemplateMetadata,
  TemplateRenderingResult,
} from '../actions/render-template-by-path';

const lastRenderingMetadataPerTemplatePath = {} as Record<
  string,
  RenderedTemplateMetadata
>;

/**
 * Returns the rendering metadata if the given `renderingResult`
 * does not error. If it does error it returns the last value it had for the hook.
 */
export const useRenderingMetadata = (
  templatePath: string,
  renderingResult: TemplateRenderingResult,
  serverRenderingMetadata: TemplateRenderingResult,
): RenderedTemplateMetadata | undefined => {
  useEffect(() => {
    if ('markup' in renderingResult) {
      lastRenderingMetadataPerTemplatePath[templatePath] = renderingResult;
    } else if (
      typeof serverRenderingMetadata !== 'undefined' &&
      'markup' in serverRenderingMetadata &&
      typeof lastRenderingMetadataPerTemplatePath[templatePath] === 'undefined'
    ) {
      lastRenderingMetadataPerTemplatePath[templatePath] =
        serverRenderingMetadata;
    }
  }, [renderingResult, templatePath, serverRenderingMetadata]);

  return 'error' in renderingResult
    ? lastRenderingMetadataPerTemplatePath[templatePath]
    : renderingResult;
};
