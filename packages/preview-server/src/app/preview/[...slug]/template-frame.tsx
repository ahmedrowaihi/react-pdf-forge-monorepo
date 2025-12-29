import type { ComponentProps } from 'react';
import { forwardRef, useEffect, useRef } from 'react';

interface TemplateFrameProps extends ComponentProps<'iframe'> {
  markup: string;
  width: number;
  height: number;
  darkMode?: boolean;
}

const applyDarkMode = (contentDocument: Document, darkMode: boolean) => {
  // Add or remove 'dark' class on the body/html element
  // Templates can use Theme component with variant="dark" to define CSS variables
  // Example: <Theme variant="dark" css={`--color-bg: #1a1a1a;`} />
  const { documentElement, body } = contentDocument;
  if (!documentElement || !body) return;

  if (darkMode) {
    documentElement.classList.add('dark');
    body.classList.add('dark');
  } else {
    documentElement.classList.remove('dark');
    body.classList.remove('dark');
  }
};

export const TemplateFrame = forwardRef<HTMLIFrameElement, TemplateFrameProps>(
  function TemplateFrame(
    { markup, width, height, darkMode = false, ...rest },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const setRefs = (element: HTMLIFrameElement | null) => {
      iframeRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const { contentDocument } = iframe;
      if (!contentDocument) return;

      applyDarkMode(contentDocument, darkMode);
    }, [darkMode, markup]);

    return (
      <iframe
        ref={setRefs}
        srcDoc={markup}
        width={width}
        height={height}
        onLoad={(event) => {
          const iframe = event.currentTarget;
          const { contentDocument } = iframe;
          if (!contentDocument) return;

          applyDarkMode(contentDocument, darkMode);
        }}
        {...rest}
      />
    );
  },
);
