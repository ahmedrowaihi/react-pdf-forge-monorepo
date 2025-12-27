import * as React from 'react';

export interface PageBreakProps {
  /** Type of page break */
  type?: 'after' | 'before' | 'avoid';
}

/**
 * PageBreak component adds page break CSS for PDF generation.
 * Can be used as a self-closing element or wrapper.
 */
export const PageBreak: React.FC<Readonly<PageBreakProps>> = ({
  type = 'after',
}) => {
  const style: React.CSSProperties =
    type === 'after'
      ? { pageBreakAfter: 'always', breakAfter: 'page' }
      : type === 'before'
        ? { pageBreakBefore: 'always', breakBefore: 'page' }
        : { pageBreakInside: 'avoid', breakInside: 'avoid' };

  return <div style={style} />;
};

PageBreak.displayName = 'PageBreak';
