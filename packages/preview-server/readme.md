<div align="center"><strong>@ahmedrowaihi/pdf-forge-preview</strong></div>
<div align="center">A live preview of your PDF templates right in your browser.</div>
<br />
<div align="center">
<a href="https://react-pdf-forge.com">Website</a>
<span> · </span>
<a href="https://github.com/ahmedrowaihi/react-pdf-forge-monorepo">GitHub</a>

</div>

This package is used to store the preview server, it is also published and versioned so that it can be installed when the [CLI](../pdf-forge-cli) is being used.

## Development workflow

### 1. Seed PDF templates

```sh
pnpm dev:seed
```

This generates a boilerplate templates directory for you to work with. These files can also be modified as you see fit since they are not included in git.

### 2. Run development server

```sh
pnpm dev
```

This is somewhat equivalent to `next dev` and does not support hot reloading for PDF templates like the CLI does. It lets you work on the UI for the preview server mainly.

### 3. Open in your browser

Go to http://localhost:3000
