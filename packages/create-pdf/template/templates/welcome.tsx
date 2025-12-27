import { Body, Document } from '@ahmedrowaihi/pdf-forge-components';

export interface WelcomeProps {
  name?: string;
}

function Welcome({ name = 'World' }: WelcomeProps) {
  const cssStyles = `
    :root {
      --color-bg: #ffffff;
      --color-text: #000000;
      --color-text-muted: #666666;
      --color-border: #e0e0e0;
      --color-accent: #007141;
      --color-accent-light: rgba(0, 188, 109, 0.1);
    }

    /* Dark mode variable overrides */
    :root.dark-mode,
    .dark-mode {
      --color-bg: #1a1a1a;
      --color-text: #ffffff;
      --color-text-muted: #b0b0b0;
      --color-border: #404040;
      --color-accent: #00c76d;
      --color-accent-light: rgba(0, 199, 109, 0.2);
    }

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
      font-size: 32px;
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
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      <Body>
        <div className="container">
          <h1>Welcome, {name}!</h1>

          <div className="content">
            <p>
              This is your first PDF template created with React PDF Render.
            </p>
            <p>
              You can start editing this template in{' '}
              <code>templates/welcome.tsx</code> to create your own PDF
              documents.
            </p>
          </div>

          <div className="footer">
            React PDF Render • Get started at{' '}
            <a href="https://react-pdf-forge.com">react-pdf-forge.com</a>
          </div>
        </div>
      </Body>
    </Document>
  );
}

Welcome.PreviewProps = {
  name: 'World',
} as WelcomeProps;

export default Welcome;
