'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { LayoutGroup } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';
import * as React from 'react';
import { usePreviewContext } from '../contexts/preview';
import { cn } from '../utils';
import { IconArrowDown } from './icons/icon-arrow-down';
import { IconCheck } from './icons/icon-check';
import { IconInfo } from './icons/icon-info';
import { ToolbarButton } from './toolbar/toolbar-button';

export type ToolbarTabValue = 'linter';

export const useToolbarState = () => {
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('toolbar-panel') ?? undefined) as
    | ToolbarTabValue
    | undefined;

  return {
    activeTab,

    toggled: activeTab !== undefined,
  };
};

const ToolbarInner = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { activeTab, toggled } = useToolbarState();

  const setActivePanelValue = (newValue: ToolbarTabValue | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (newValue === undefined) {
      params.delete('toolbar-panel');
    } else {
      params.set('toolbar-panel', newValue);
    }
    router.push(`${pathname}?${params.toString()}${location.hash}`);
  };

  const id = React.useId();

  return (
    <div
      data-toggled={toggled}
      className={cn(
        'absolute bottom-0 left-0 right-0',
        'border-t border-slate-6 group/toolbar text-xs text-slate-11 h-52 transition-transform',
        'data-[toggled=false]:translate-y-42.5',
      )}
    >
      <Tabs.Root
        value={activeTab ?? ''}
        onValueChange={(newValue) => {
          setActivePanelValue(newValue as ToolbarTabValue);
        }}
        asChild
      >
        <div className="flex flex-col h-full">
          <Tabs.List className="flex gap-4 px-4 border-b border-solid border-slate-6 h-10 w-full shrink-0">
            <LayoutGroup id={`toolbar-${id}`}>
              <Tabs.Trigger asChild value="linter">
                <ToolbarButton active={activeTab === 'linter'}>
                  Linter
                </ToolbarButton>
              </Tabs.Trigger>
            </LayoutGroup>
            <div className="flex gap-0.5 ml-auto">
              <ToolbarButton
                delayDuration={0}
                tooltip={
                  activeTab === 'linter'
                    ? 'PDF-specific linting features are coming soon. This will check for page breaks, print CSS issues, font loading problems, and more.'
                    : 'Info'
                }
              >
                <IconInfo size={24} />
              </ToolbarButton>
              <ToolbarButton
                tooltip="Toggle toolbar"
                onClick={() => {
                  if (activeTab === undefined) {
                    setActivePanelValue('linter');
                  } else {
                    setActivePanelValue(undefined);
                  }
                }}
              >
                <IconArrowDown
                  size={24}
                  className="transition-transform group-data-[toggled=false]/toolbar:rotate-180"
                />
              </ToolbarButton>
            </div>
          </Tabs.List>

          <div className="grow transition-opacity opacity-100 group-data-[toggled=false]/toolbar:opacity-0 overflow-y-auto pr-3 pl-4 pt-3">
            <Tabs.Content value="linter">
              <SuccessWrapper>
                <SuccessIcon />
                <SuccessTitle>PDF Linter Coming Soon</SuccessTitle>
                <SuccessDescription>
                  We're working on PDF-specific linting features that will check
                  for page breaks, print CSS issues, font loading problems, and
                  more. Stay tuned!
                </SuccessDescription>
              </SuccessWrapper>
            </Tabs.Content>
          </div>
        </div>
      </Tabs.Root>
    </div>
  );
};

const SuccessWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-center pt-8">
      {children}
    </div>
  );
};

const SuccessIcon = () => {
  return (
    <div className="relative mb-8 flex items-center justify-center">
      <div className="h-16 w-16 rounded-full bg-linear-to-br from-green-300/20 opacity-80 to-emerald-500/30 blur-md absolute m-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="h-12 w-12 rounded-full bg-linear-to-br from-green-400/80 opacity-10 to-emerald-600/80 absolute m-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg" />
      <div className="h-10 w-10 rounded-full bg-linear-to-br from-green-400 to-emerald-600 flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
        <IconCheck size={24} className="text-white drop-shadow-xs" />
      </div>
    </div>
  );
};

const SuccessTitle = ({
  children,
  className,
  ...props
}: ComponentProps<'h3'>) => {
  return (
    <h3
      className={cn('text-slate-12 font-medium text-base mb-1', className)}
      {...props}
    >
      {children}
    </h3>
  );
};

const SuccessDescription = ({
  children,
  className,
  ...props
}: ComponentProps<'p'>) => {
  return (
    <p
      className={cn(
        'text-slate-11 text-sm text-center max-w-[320px]',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
};

export function Toolbar() {
  const { renderedTemplateMetadata } = usePreviewContext();

  if (renderedTemplateMetadata === undefined) return null;

  return <ToolbarInner />;
}
