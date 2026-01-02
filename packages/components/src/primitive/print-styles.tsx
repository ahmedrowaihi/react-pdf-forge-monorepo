import type * as React from 'react';

export interface PrintStylesProps {
  /** Preserve colors when printing */
  preserveColors?: boolean;
  /** Remove shadows from elements */
  removeShadows?: boolean;
  /** Selectors that should have page-break-after: always */
  pageBreakAfter?: string[];
  /** Selectors that should have page-break-before: avoid */
  pageBreakBefore?: string[];
  /** Selectors that should have page-break-inside: avoid */
  pageBreakInside?: string[];
  /** Custom print styles */
  children?: React.ReactNode;
}

/**
 * PrintStyles component wraps styles in @media print for PDF generation.
 * Should be placed inside the <Head> component.
 */
export const PrintStyles: React.FC<Readonly<PrintStylesProps>> = ({
  preserveColors = false,
  removeShadows = false,
  pageBreakAfter = [],
  pageBreakBefore = [],
  pageBreakInside = [],
  children,
}) => {
  const styles: string[] = [];

  if (preserveColors) {
    styles.push(`* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}`);
  }

  if (removeShadows) {
    styles.push(`.sheet, .page, .card, .box {
  box-shadow: none !important;
}`);
  }

  if (pageBreakAfter.length > 0) {
    styles.push(`${pageBreakAfter.join(', ')} {
  page-break-after: always !important;
  break-after: page !important;
}`);
  }

  if (pageBreakBefore.length > 0) {
    styles.push(`${pageBreakBefore.join(', ')} {
  page-break-before: avoid !important;
  break-before: avoid !important;
}`);
  }

  if (pageBreakInside.length > 0) {
    styles.push(`${pageBreakInside.join(', ')} {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}`);
  }

  const customStyles = children
    ? typeof children === 'string'
      ? children
      : ''
    : '';

  const css = `@media print {
${styles.join('\n\n')}${customStyles ? `\n\n${customStyles}` : ''}
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

PrintStyles.displayName = 'PrintStyles';
