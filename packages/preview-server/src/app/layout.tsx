import './globals.css';

import type { Metadata } from 'next';
import { TemplatesProvider } from '../contexts/templates';
import { getTemplatesDirectoryMetadata } from '../utils/get-templates-directory-metadata';
import { templatesDirectoryAbsolutePath } from './env';
import { inter, sfMono } from './fonts';

export const metadata: Metadata = {
  title: 'React PDF Forge',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const templatesDirectoryMetadata = await getTemplatesDirectoryMetadata(
    templatesDirectoryAbsolutePath,
  );

  if (typeof templatesDirectoryMetadata === 'undefined') {
    throw new Error(
      `Could not find the templates directory specified under ${templatesDirectoryAbsolutePath}!`,
    );
  }

  return (
    <html
      className={`${inter.variable} ${sfMono.variable} font-sans`}
      lang="en"
    >
      <body className="relative h-screen bg-black text-slate-11 leading-loose selection:bg-cyan-5 selection:text-cyan-12">
        <div className="bg-linear-to-t from-slate-3 flex flex-col">
          <TemplatesProvider
            initialTemplatesDirectoryMetadata={templatesDirectoryMetadata}
          >
            {children}
          </TemplatesProvider>
        </div>
      </body>
    </html>
  );
}
