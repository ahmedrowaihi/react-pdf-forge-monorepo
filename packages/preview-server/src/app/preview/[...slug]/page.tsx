import path from 'node:path';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getTemplatePathFromSlug } from '../../../actions/get-template-path-from-slug';
import { renderTemplateByPath } from '../../../actions/render-template-by-path';
import { Shell } from '../../../components/shell';
import { Toolbar } from '../../../components/toolbar';
import { PreviewProvider } from '../../../contexts/preview';
import { getTemplatesDirectoryMetadata } from '../../../utils/get-templates-directory-metadata';
import { templatesDirectoryAbsolutePath, isBuilding } from '../../env';
import Preview from './preview';

export const dynamicParams = true;

export const dynamic = 'force-dynamic';

export interface PreviewParams {
  slug: string[];
}

export default async function Page({
  params: paramsPromise,
}: {
  params: Promise<PreviewParams>;
}) {
  const params = await paramsPromise;
  // will come in here as segments of a relative path to the template
  // ex: ['authentication', 'verify-password.tsx']
  const slug = decodeURIComponent(params.slug.join('/'));
  const templatesDirMetadata = await getTemplatesDirectoryMetadata(
    templatesDirectoryAbsolutePath,
  );

  if (typeof templatesDirMetadata === 'undefined') {
    throw new Error(
      `Could not find the templates directory specified under ${templatesDirectoryAbsolutePath}!

This is most likely not an issue with the preview server. Maybe there was a typo on the "--dir" flag?`,
    );
  }

  let templatePath: string;
  try {
    templatePath = await getTemplatePathFromSlug(slug);
  } catch (exception) {
    if (exception instanceof Error) {
      console.warn(exception.message);
      redirect('/');
    }
    throw exception;
  }

  const serverTemplateRenderingResult =
    await renderTemplateByPath(templatePath);

  if (isBuilding && 'error' in serverTemplateRenderingResult) {
    throw new Error(serverTemplateRenderingResult.error.message, {
      cause: serverTemplateRenderingResult.error,
    });
  }

  return (
    <PreviewProvider
      templateSlug={slug}
      templatePath={templatePath}
      serverRenderingResult={serverTemplateRenderingResult}
    >
      <Shell currentTemplateOpenSlug={slug}>
        {/* This suspense is so that this page doesn't throw warnings */}
        {/* on the build of the preview server de-opting into         */}
        {/* client-side rendering on build                            */}
        <Suspense>
          <Preview templateTitle={path.basename(templatePath)} />

          <Toolbar />
        </Suspense>
      </Shell>
    </PreviewProvider>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PreviewParams>;
}) {
  const { slug } = await params;

  return { title: `${path.basename(slug.join('/'))} — React PDF Forge` };
}
