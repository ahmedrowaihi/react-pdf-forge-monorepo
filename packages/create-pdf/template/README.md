# React PDF Starter

This is a starter template for React PDF Render.

## Getting Started

1. Install dependencies:

   ```sh
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```

2. Start the development server:

   ```sh
   pnpm dev
   # or
   npm run dev
   # or
   yarn dev
   ```

3. Open http://localhost:3000 in your browser

## Creating Templates

Add your PDF templates in the `templates/` directory. Each template should be a React component that exports a default function.

Example:

```tsx
import { Document, Body } from '@ahmedrowaihi/pdf-forge-components';

export default function MyTemplate() {
  return (
    <Document>
      <Body>
        <h1>Hello World</h1>
      </Body>
    </Document>
  );
}
```

## Building Templates

To export all templates as HTML:

```sh
pnpm export
# or
npm run export
# or
yarn export
```

## Learn More

Visit [react-pdf-forge.com](https://react-pdf-forge.com) for documentation.
