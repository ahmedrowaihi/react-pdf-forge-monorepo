<div align="center"><strong>React PDF Render</strong></div>
<div align="center">The next generation of writing PDF templates.<br />High-quality components for creating PDFs with React.</div>
<br />
<div align="center">
<a href="https://react-pdf-forge.com">Website</a>
<span> · </span>
<a href="https://github.com/ahmedrowaihi/react-pdf-forge">GitHub</a>
</div>

## Introduction

A collection of high-quality components for creating beautiful PDF templates using React and TypeScript.
It simplifies PDF generation with proper page settings, print styles, and page break controls.

## Why

We believe that PDF generation should be as simple as building web applications. React PDF Render provides a modern, component-based approach to creating PDF templates with React, making it easy to generate professional PDFs programmatically.

## Install

Install the components package from your command line.

#### With yarn

```sh
yarn add @ahmedrowaihi/pdf-forge-components -E
```

#### With npm

```sh
npm install @ahmedrowaihi/pdf-forge-components -E
```

#### With pnpm

```sh
pnpm install @ahmedrowaihi/pdf-forge-components -E
```

## Getting started

Create a PDF template using React components:

```jsx
import {
  Document,
  PrintStyles,
  Body,
  Heading,
} from '@ahmedrowaihi/pdf-forge-components';
import { render } from '@ahmedrowaihi/pdf-forge-core';

const PDFTemplate = () => {
  return (
    <Document>
      <PrintStyles>
        {`
          body { font-family: Arial, sans-serif; }
        `}
      </PrintStyles>
      <Body>
        <Heading as="h1">Hello World</Heading>
      </Body>
    </Document>
  );
};

const html = await render(<PDFTemplate />);
```

## Components

A set of standard components to help you build PDF templates:

- **Document** - Wrapper component for PDF documents
- **PrintStyles** - Define print-specific CSS styles (Playwright handles page size via `format: 'A4'`)
- **PageBreak** - Control page breaks in your document
- **Html, Head, Body** - Document structure primitives
- **Font** - Load custom fonts for your PDFs

## CLI

Use the `pdf-dev` CLI to preview and build your PDF templates:

```sh
# Install the CLI
npm install -D @ahmedrowaihi/pdf-forge-cli

# Start development server
npx pdf-dev dev

# Build templates
npx pdf-dev export
```

## Development workflow

1. Create PDF templates in your `templates/` directory
2. Use `pdf-dev dev` to preview templates in the browser
3. Export templates with `pdf-dev export`
4. Use the rendered HTML with a PDF generation library (e.g., Playwright, Puppeteer)

## Contributing

Contributions are welcome! Please see our contributing guidelines.

## License

MIT License

> **Note:** This project is a fork of [React Email](https://github.com/resend/react-email), adapted for PDF generation. Thanks Resend team.
