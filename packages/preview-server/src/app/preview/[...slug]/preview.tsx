'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Toaster } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';
import { Topbar } from '../../../components';
import { CodeContainer } from '../../../components/code-container';
import {
  makeIframeDocumentBubbleEvents,
  ResizableWrapper,
} from '../../../components/resizable-wrapper';
import { useToolbarState } from '../../../components/toolbar';
import { Tooltip } from '../../../components/tooltip';
import { ActiveViewToggleGroup } from '../../../components/topbar/active-view-toggle-group';
import { EmulatedDarkModeToggle } from '../../../components/topbar/emulated-dark-mode-toggle';
import { ViewSizeControls } from '../../../components/topbar/view-size-controls';
import { usePreviewContext } from '../../../contexts/preview';
import { useClampedState } from '../../../hooks/use-clamped-state';
import { cn } from '../../../utils';
import { TemplateFrame } from './template-frame';
import { ErrorOverlay } from './error-overlay';
import { DownloadButton } from './download-button';

interface PreviewProps extends React.ComponentProps<'div'> {
  templateTitle: string;
}

const Preview = ({ templateTitle, className, ...props }: PreviewProps) => {
  const { renderingResult, renderedTemplateMetadata } = usePreviewContext();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isDarkModeEnabled = searchParams.get('dark') !== null;
  const activeView = searchParams.get('view') ?? 'preview';
  const activeLang = searchParams.get('lang') ?? 'tsx';

  const handleDarkModeChange = (enabled: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('dark', '');
    } else {
      params.delete('dark');
    }
    router.push(`${pathname}?${params.toString()}${location.hash}`);
  };

  const handleViewChange = (view: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}${location.hash}`);
  };

  const handleLangChange = (lang: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', 'source');
    params.set('lang', lang);
    const isSameLang = searchParams.get('lang') === lang;
    router.push(
      `${pathname}?${params.toString()}${isSameLang ? location.hash : ''}`,
    );
  };

  const hasRenderingMetadata = typeof renderedTemplateMetadata !== 'undefined';
  const hasErrors = 'error' in renderingResult;

  const [maxWidth, setMaxWidth] = useState(Number.POSITIVE_INFINITY);
  const [maxHeight, setMaxHeight] = useState(Number.POSITIVE_INFINITY);
  const minWidth = 220;
  const minHeight = minWidth * 1.6;
  const storedWidth = searchParams.get('width');
  const storedHeight = searchParams.get('height');
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;

  const [width, setWidth] = useClampedState(
    storedWidth ? Number.parseInt(storedWidth, 10) : A4_WIDTH,
    minWidth,
    maxWidth,
  );
  const [height, setHeight] = useClampedState(
    storedHeight ? Number.parseInt(storedHeight, 10) : A4_HEIGHT,
    minHeight,
    maxHeight,
  );

  const handleSaveViewSize = useDebouncedCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set('width', width.toString());
    params.set('height', height.toString());
    router.push(`${pathname}?${params.toString()}${location.hash}`);
  }, 300);

  const { toggled: toolbarToggled } = useToolbarState();

  return (
    <>
      <Topbar templateTitle={templateTitle}>
        {activeView === 'preview' ? (
          <>
            <EmulatedDarkModeToggle
              enabled={isDarkModeEnabled}
              onChange={(enabled) => handleDarkModeChange(enabled)}
            />
            <ViewSizeControls
              setViewHeight={(height) => {
                setHeight(height);
                flushSync(() => {
                  handleSaveViewSize();
                });
              }}
              setViewWidth={(width) => {
                setWidth(width);
                flushSync(() => {
                  handleSaveViewSize();
                });
              }}
              viewHeight={height}
              viewWidth={width}
              minWidth={minWidth}
              minHeight={minHeight}
            />
          </>
        ) : null}
        <ActiveViewToggleGroup
          activeView={activeView}
          setActiveView={handleViewChange}
        />
        {hasRenderingMetadata ? (
          <div className="flex justify-end">
            <DownloadButton
              templateSlug={templateTitle}
              htmlMarkup={renderedTemplateMetadata.markup}
              darkMode={isDarkModeEnabled}
            />
          </div>
        ) : null}
      </Topbar>

      <div
        {...props}
        className={cn(
          'h-[calc(100%-3.5rem-2.375rem)] will-change-[height] flex p-4 transition-[height] duration-300 relative',
          activeView === 'preview' && 'bg-gray-200',
          activeView === 'preview' && isDarkModeEnabled && 'bg-gray-400',
          toolbarToggled && 'h-[calc(100%-3.5rem-13rem)]',
          className,
        )}
        ref={(element) => {
          const observer = new ResizeObserver((entry) => {
            const [elementEntry] = entry;
            if (elementEntry) {
              setMaxWidth(elementEntry.contentRect.width);
              setMaxHeight(elementEntry.contentRect.height);
            }
          });

          if (element) {
            observer.observe(element);
          }

          return () => {
            observer.disconnect();
          };
        }}
      >
        {hasErrors ? <ErrorOverlay error={renderingResult.error} /> : null}

        {hasRenderingMetadata ? (
          <>
            {activeView === 'preview' && (
              <ResizableWrapper
                minHeight={minHeight}
                minWidth={minWidth}
                maxHeight={maxHeight}
                maxWidth={maxWidth}
                height={height}
                onResizeEnd={() => {
                  handleSaveViewSize();
                }}
                onResize={(value, direction) => {
                  const isHorizontal =
                    direction === 'east' || direction === 'west';
                  if (isHorizontal) {
                    setWidth(Math.round(value));
                  } else {
                    setHeight(Math.round(value));
                  }
                }}
                width={width}
              >
                <TemplateFrame
                  className="max-h-full rounded-lg bg-white [color-scheme:auto]"
                  darkMode={isDarkModeEnabled}
                  markup={renderedTemplateMetadata.markup}
                  width={width}
                  height={height}
                  title={templateTitle}
                  ref={(iframe) => {
                    if (!iframe) return;

                    return makeIframeDocumentBubbleEvents(iframe);
                  }}
                />
              </ResizableWrapper>
            )}

            {activeView === 'source' && (
              <div className="h-full w-full">
                <div className="m-auto h-full flex max-w-3xl p-6">
                  <Tooltip.Provider>
                    <CodeContainer
                      activeLang={activeLang}
                      basename={renderedTemplateMetadata.basename}
                      markups={[
                        {
                          language: 'tsx',
                          extension: renderedTemplateMetadata.extname,
                          content: renderedTemplateMetadata.reactMarkup,
                        },
                        {
                          language: 'html',
                          content: renderedTemplateMetadata.prettyMarkup,
                        },
                        {
                          language: 'markdown',
                          extension: 'md',
                          content: renderedTemplateMetadata.plainText,
                        },
                      ]}
                      setActiveLang={handleLangChange}
                    />
                  </Tooltip.Provider>
                </div>
              </div>
            )}
          </>
        ) : null}

        <Toaster />
      </div>
    </>
  );
};

export default Preview;
