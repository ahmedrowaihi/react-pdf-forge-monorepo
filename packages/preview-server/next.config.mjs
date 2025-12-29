/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  serverExternalPackages: ['playwright', 'playwright-core', 'sharp'],
  // Exclude playwright and sharp native assets from output file tracing
  // These packages contain non-ECMAScript assets (fonts, binaries, etc.) that can't be bundled
  outputFileTracingExcludes: {
    '*': [
      '**/node_modules/playwright/**',
      '**/node_modules/playwright-core/**',
      '**/node_modules/@playwright/**',
      '**/node_modules/sharp/**',
      '**/node_modules/**/sharp/**',
    ],
  },
  // Noticed an issue with typescript transpilation when going from Next 14.1.1 to 14.1.2
  // and I narrowed that down into this PR https://github.com/vercel/next.js/pull/62005
  //
  // What is probably happening is that it's noticing the files for the app are somewhere inside of a `node_modules` and automatically opt-outs of SWC's transpilation.
  //
  // TODO: Open an issue on Nextjs about this.
  transpilePackages: ['@ahmedrowaihi'],
};

export default nextConfig;
