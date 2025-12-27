'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { exportSingleTemplate } from '../../../actions/export-single-template';
import { IconFile } from '../../../components/icons/icon-file';
import { IconImage } from '../../../components/icons/icon-image';
import { Tooltip } from '../../../components/tooltip';
import { cn } from '../../../utils';

interface DownloadButtonProps {
  templateSlug: string;
  htmlMarkup: string;
  darkMode?: boolean;
}

type ExportFormat = 'pdf' | 'screenshot';

export const DownloadButton = ({
  templateSlug,
  htmlMarkup,
  darkMode = false,
}: DownloadButtonProps) => {
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isLoadingScreenshot, setIsLoadingScreenshot] = useState(false);

  const templateName = templateSlug.replace(/\.[^/.]+$/, '');

  const handleOpen = async (format: ExportFormat) => {
    if (format === 'pdf') {
      setIsLoadingPdf(true);
    } else {
      setIsLoadingScreenshot(true);
    }

    try {
      const result = await exportSingleTemplate({
        name: templateName,
        html: htmlMarkup,
        format,
        darkMode,
      });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (!result?.data) {
        toast.error('Failed to export template');
        return;
      }

      const resultData = result.data;

      if (resultData.format === 'html' || !('data' in resultData)) {
        toast.error('Invalid export format');
        return;
      }

      const resultFormat = resultData.format;

      const binaryString = atob(resultData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: resultData.mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success(
        `${resultFormat === 'pdf' ? 'PDF' : 'Screenshot'} opened in new window`,
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to export template. Make sure the PDF Forge server is running.',
      );
    } finally {
      if (format === 'pdf') {
        setIsLoadingPdf(false);
      } else {
        setIsLoadingScreenshot(false);
      }
    }
  };

  const isLoading = isLoadingPdf || isLoadingScreenshot;

  return (
    <div className="flex gap-2">
      <Tooltip>
        <Tooltip.Trigger asChild>
          <button
            disabled={isLoading}
            type="button"
            onClick={() => {
              void handleOpen('pdf');
            }}
            className={cn(
              'relative w-9 h-9 flex items-center justify-center border border-slate-6 text-sm rounded-lg transition duration-200 ease-in-out',
              'text-slate-11 hover:text-slate-12',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isLoadingPdf && 'bg-slate-4',
            )}
          >
            <IconFile size={16} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>Open as PDF</Tooltip.Content>
      </Tooltip>

      <Tooltip>
        <Tooltip.Trigger asChild>
          <button
            disabled={isLoading}
            type="button"
            onClick={() => {
              void handleOpen('screenshot');
            }}
            className={cn(
              'relative w-9 h-9 flex items-center justify-center border border-slate-6 text-sm rounded-lg transition duration-200 ease-in-out',
              'text-slate-11 hover:text-slate-12',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isLoadingScreenshot && 'bg-slate-4',
            )}
          >
            <IconImage size={16} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>Open as Screenshot</Tooltip.Content>
      </Tooltip>
    </div>
  );
};
