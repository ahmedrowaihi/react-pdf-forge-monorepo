import type * as React from 'react';

export interface ThemeProps {
  /** CSS variables and styles for this theme variant */
  css: string;
  /** Theme variant name (e.g., 'light', 'dark', 'blue', 'green', etc.) */
  variant: string;
}

/**
 * Theme component that applies CSS variables and styles based on theme variant.
 * Uses :root CSS variables scoped to the variant class for theme switching.
 * Should be placed inside the <Head> component.
 *
 * @example
 * ```tsx
 * <Theme variant="light" css={`
 *   --color-bg: #ffffff;
 *   --color-text: #000000;
 * `} />
 * <Theme variant="dark" css={`
 *   --color-bg: #1a1a1a;
 *   --color-text: #ffffff;
 * `} />
 * ```
 */
export const Theme: React.FC<Readonly<ThemeProps>> = ({ css, variant }) => {
  if (variant === 'default') {
    const scopedCss = `
      :root {
        ${css}
      }
    `;
    return <style dangerouslySetInnerHTML={{ __html: scopedCss }} />;
  }

  const scopedCss = `
    :root.${variant},
    .${variant} {
      ${css}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: scopedCss }} />;
};

Theme.displayName = 'Theme';
