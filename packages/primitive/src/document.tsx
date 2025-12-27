import * as React from 'react';
import { Html } from './html';
import { Head } from './head';
import { Body } from './body';

export interface DocumentProps {
  /** Document language */
  lang?: string;
  /** Text direction */
  dir?: 'ltr' | 'rtl';
  /** Head content */
  head?: React.ReactNode;
  /** Body content */
  children: React.ReactNode;
  /** Additional HTML attributes */
  htmlProps?: React.HtmlHTMLAttributes<HTMLHtmlElement>;
  /** Additional head attributes */
  headProps?: React.HtmlHTMLAttributes<HTMLHeadElement>;
  /** Additional body attributes */
  bodyProps?: React.HtmlHTMLAttributes<HTMLBodyElement>;
}

/**
 * Document component for PDF generation.
 * Convenience wrapper that provides proper HTML5 document structure.
 */
export const Document: React.FC<Readonly<DocumentProps>> = ({
  lang = 'en',
  dir = 'ltr',
  head,
  children,
  htmlProps,
  headProps,
  bodyProps,
}) => {
  return (
    <Html lang={lang} dir={dir} {...htmlProps}>
      <Head {...headProps}>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {head}
      </Head>
      <Body {...bodyProps}>{children}</Body>
    </Html>
  );
};

Document.displayName = 'Document';
