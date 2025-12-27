import * as React from 'react';
import { Document, Theme, Body } from '@ahmedrowaihi/pdf-forge-components';

export interface SimpleDemoProps {
  title?: string;
  content?: string;
}

function SimpleDemo({
  title = 'Simple PDF Demo',
  content = 'This is a simple PDF template with light and dark mode support.',
}: SimpleDemoProps) {
  const baseStyles = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: var(--color-bg);
      color: var(--color-text);
      padding: 20mm;
      line-height: 1.6;
      transition: background-color 0.3s ease, color 0.3s ease;
    }


    h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 10mm;
      border-bottom: 2px solid var(--color-accent);
      padding-bottom: 5mm;
    }

    .content {
      font-size: 14px;
      color: var(--color-text);
      margin-bottom: 8mm;
    }

    .content p {
      margin-bottom: 5mm;
    }

    .card {
      background: var(--color-accent-light);
      border: 1px solid var(--color-accent);
      border-radius: 6px;
      padding: 8mm;
      margin: 8mm 0;
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-accent);
      margin-bottom: 4mm;
    }

    .card-content {
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .info-box {
      background: var(--color-bg);
      border-left: 4px solid var(--color-accent);
      padding: 6mm;
      margin: 8mm 0;
    }

    .info-box strong {
      color: var(--color-text);
      font-weight: 600;
    }

    .footer {
      margin-top: 15mm;
      padding-top: 8mm;
      border-top: 1px solid var(--color-border);
      text-align: center;
      font-size: 12px;
      color: var(--color-text-muted);
    }
  `;

  return (
    <Document lang="en" dir="ltr">
      <Theme
        variant="default"
        css={`
          --color-bg: #ffffff;
          --color-text: #000000;
          --color-text-muted: #666666;
          --color-border: #e0e0e0;
          --color-accent: #007141;
          --color-accent-light: rgba(0, 188, 109, 0.1);
        `}
      />
      <Theme
        variant="dark"
        css={`
          --color-bg: #1a1a1a;
          --color-text: #ffffff;
          --color-text-muted: #b0b0b0;
          --color-border: #404040;
          --color-accent: #00c76d;
          --color-accent-light: rgba(0, 199, 109, 0.2);
        `}
      />
      <style dangerouslySetInnerHTML={{ __html: baseStyles }} />
      <Body>
        <div className="container">
          <h1>{title}</h1>

          <div className="content">
            <p>{content}</p>
            <p>
              This template demonstrates how CSS variables automatically adjust
              when the dark mode toggle is enabled in the preview.
            </p>
          </div>

          <div className="card">
            <div className="card-title">Light Mode</div>
            <div className="card-content">
              In light mode, the background is white and text is black. All
              colors use the default CSS variable values.
            </div>
          </div>

          <div className="card">
            <div className="card-title">Dark Mode</div>
            <div className="card-content">
              When dark mode is enabled, CSS variables are overridden to provide
              a dark theme. The preview server automatically adds the
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {' '}
                .dark-mode
              </span>{' '}
              class to enable this.
            </div>
          </div>

          <div className="info-box">
            <strong>Tip:</strong> Toggle dark mode in the preview to see the
            colors change automatically. All elements use CSS variables, so they
            update seamlessly.
          </div>

          <div className="footer">
            React PDF Render Demo • Light/Dark Mode Example
          </div>
        </div>
      </Body>
    </Document>
  );
}

SimpleDemo.PreviewProps = {
  title: 'Simple PDF Demo',
  content: 'This is a simple PDF template with light and dark mode support.',
} as SimpleDemoProps;

export default SimpleDemo;
