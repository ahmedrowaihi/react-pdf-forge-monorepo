<div align="center"><strong>@ahmedrowaihi/pdf-forge-components</strong></div>
<div align="center">A collection of all React PDF Render components.</div>
<br />
<div align="center">
<a href="https://react-pdf-forge.com">Website</a>
<span> · </span>
<a href="https://github.com/ahmedrowaihi/react-pdf-forge-monorepo">GitHub</a>

</div>

## Install

Install component from your command line.

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

Add the component to your PDF template. Include styles where needed.

```jsx
import { Document, Body, Heading } from '@ahmedrowaihi/pdf-forge-components';

const PDFTemplate = () => {
  return (
    <Document>
      <Body>
        <Heading as="h1">Lorem ipsum</Heading>
      </Body>
    </Document>
  );
};
```

## Components

- **Document** - Document wrapper component
- **PrintStyles** - Print-specific CSS styles (Playwright handles page size via `format: 'A4'`)
- **PageBreak** - Page break controls
- **Html, Head, Body** - Document structure primitives
- **Font** - Custom font loading

## License

MIT License
