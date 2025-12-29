import fs from 'node:fs/promises';
import path from 'node:path';
import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type * as t from '@babel/types';

/**
 * Extract asset path from a JSX attribute value
 * Handles:
 * - String literals: "/fonts/myfont.woff2"
 * - Template literals: `${baseUrl}/fonts/myfont.woff2`
 * - Binary expressions: baseUrl + "/fonts/myfont.woff2"
 * - JSXExpressionContainer: {`${baseUrl}/fonts/myfont.woff2`}
 */
function extractAssetPath(node: t.Node, templateDir: string): string | null {
  if (node.type === 'JSXExpressionContainer') {
    return extractAssetPath(node.expression, templateDir);
  }

  if (node.type === 'StringLiteral') {
    const assetPath = node.value;
    if (
      assetPath.startsWith('data:') ||
      assetPath.startsWith('http://') ||
      assetPath.startsWith('https://')
    ) {
      return null;
    }
    return assetPath;
  }

  if (node.type === 'TemplateLiteral') {
    if (node.expressions.length === 1 && node.quasis.length === 2) {
      const [before, after] = node.quasis;
      const expr = node.expressions[0]!;

      if (expr.type === 'Identifier' && before && after) {
        const beforePart = before.value.cooked ?? before.value.raw ?? '';
        const afterPart = after.value.cooked ?? after.value.raw ?? '';
        const staticPath = `${beforePart}${afterPart}`;

        let normalized = staticPath.trim();
        if (normalized) {
          normalized = normalized.replace(/^\/+/, '');
          normalized = normalized.replace(/\/+$/, '');

          if (normalized) {
            return normalized;
          }
        }
      }
    }
  }

  if (node.type === 'BinaryExpression' && node.operator === '+') {
    if (node.right.type === 'StringLiteral') {
      return extractAssetPath(node.right, templateDir);
    }
    if (node.left.type === 'StringLiteral') {
      return extractAssetPath(node.left, templateDir);
    }
  }

  return null;
}

const ASSET_EXTENSIONS = new Set([
  '.woff2',
  '.woff',
  '.otf',
  '.ttf',
  '.eot',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
]);

/**
 * Check if a file exists and is an asset file
 * Optimized: uses Set for O(1) extension lookup
 */
async function isAssetFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return false;
    return ASSET_EXTENSIONS.has(path.extname(filePath).toLowerCase());
  } catch {
    return false;
  }
}

// Cache for resolved asset paths to avoid repeated file system lookups
const resolvedPathCache = new Map<string, string | null>();

// Cache for file transformations (key: filePath, value: transformed code + asset imports)
// This prevents re-processing the same file multiple times during Bun.build()
const fileTransformCache = new Map<
  string,
  { code: string; assetImports: Map<string, string> }
>();

// Global cache for base64-encoded assets (key: filePath, value: base64 data URI)
// Shared across all file transformations to avoid re-encoding the same asset
const assetEncodingCache = new Map<string, string>();

/**
 * Resolve asset path to actual file path
 * Optimized: caches resolved paths and checks paths in parallel
 */
async function resolveAssetPath(
  assetPath: string,
  templateDir: string,
): Promise<string | null> {
  const cacheKey = `${templateDir}:${assetPath}`;
  if (resolvedPathCache.has(cacheKey)) {
    return resolvedPathCache.get(cacheKey)!;
  }

  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;

  const possiblePaths = [
    path.join(templateDir, 'static', cleanPath),
    path.join(templateDir, cleanPath),
    path.resolve(templateDir, '..', 'static', cleanPath),
    path.resolve(templateDir, '..', '..', 'static', cleanPath),
    path.resolve(process.cwd(), 'static', cleanPath),
    path.resolve(process.cwd(), cleanPath),
  ];

  const results = await Promise.all(
    possiblePaths.map(async (possiblePath) => {
      const exists = await isAssetFile(possiblePath);
      return exists ? possiblePath : null;
    }),
  );

  const resolved = results.find((result) => result !== null) || null;
  resolvedPathCache.set(cacheKey, resolved);
  return resolved;
}

interface TransformResult {
  code: string;
  assetImports: Map<string, string>;
}

/**
 * Extract component name from JSX element
 * Handles both <Font /> and <Some.Font />
 */
function getComponentName(node: t.JSXOpeningElement): string | null {
  return node.name.type === 'JSXIdentifier'
    ? node.name.name
    : node.name.type === 'JSXMemberExpression' &&
        node.name.property.type === 'JSXIdentifier'
      ? node.name.property.name
      : null;
}

/**
 * Check if component is an asset component (Font, img, Image)
 */
function isAssetComponent(componentName: string | null): boolean {
  return (
    componentName === 'Font' ||
    componentName === 'img' ||
    componentName === 'Image'
  );
}

/**
 * Find a JSX attribute by name
 */
function findAttribute(
  node: t.JSXOpeningElement,
  name: string,
): t.JSXAttribute | undefined {
  return node.attributes.find(
    (attr) =>
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === name,
  ) as t.JSXAttribute | undefined;
}

/**
 * Handle src attribute for components (Font, img, Image)
 */
function _handleSrcAttribute(
  node: t.JSXOpeningElement,
  templateDir: string,
  assetReferences: Array<{ srcAttr: t.JSXAttribute; assetPath: string }>,
): void {
  const srcAttr = findAttribute(node, 'src');
  if (!srcAttr?.value) return;

  const assetPath = extractAssetPath(srcAttr.value, templateDir);
  if (assetPath) {
    assetReferences.push({ srcAttr, assetPath });
  }
}

/**
 * Find backgroundImage property in style object
 */
function findBackgroundImageProperty(
  styleAttr: t.JSXAttribute,
): { prop: t.ObjectProperty; assetPath: string } | null {
  if (
    styleAttr.value?.type !== 'JSXExpressionContainer' ||
    styleAttr.value.expression.type !== 'ObjectExpression'
  ) {
    return null;
  }

  for (const prop of styleAttr.value.expression.properties) {
    if (
      prop.type === 'ObjectProperty' &&
      prop.key.type === 'Identifier' &&
      (prop.key.name === 'backgroundImage' ||
        prop.key.name === 'background-image') &&
      prop.value.type === 'StringLiteral'
    ) {
      const urlMatch = prop.value.value.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (urlMatch?.[1]) {
        return { prop, assetPath: urlMatch[1] };
      }
    }
  }
  return null;
}

/**
 * Handle style attribute with backgroundImage (collection phase)
 */
function _handleStyleAttribute(
  node: t.JSXOpeningElement,
  templateDir: string,
  assetReferences: Array<{ srcAttr: t.JSXAttribute; assetPath: string }>,
): void {
  const styleAttr = findAttribute(node, 'style');
  if (!styleAttr) return;

  const bgImage = findBackgroundImageProperty(styleAttr);
  if (bgImage) {
    const assetPath = extractAssetPath(
      {
        type: 'StringLiteral',
        value: bgImage.assetPath,
      } as t.StringLiteral,
      templateDir,
    );
    if (assetPath) {
      assetReferences.push({ srcAttr: styleAttr, assetPath });
    }
  }
}

/**
 * Transform src attribute to use import name
 */
function transformSrcAttribute(
  srcAttr: t.JSXAttribute,
  _assetPath: string,
  importName: string,
  assetImports: Map<string, string>,
  resolvedPath: string,
): void {
  if (!assetImports.has(importName)) {
    assetImports.set(importName, resolvedPath);
  }
  srcAttr.value = {
    type: 'JSXExpressionContainer',
    expression: {
      type: 'Identifier',
      name: importName,
    },
  } as t.JSXExpressionContainer;
}

/**
 * Transform style backgroundImage to use import name
 */
function transformStyleBackgroundImage(
  prop: t.ObjectProperty,
  _assetPath: string,
  importName: string,
  assetImports: Map<string, string>,
  resolvedPath: string,
): void {
  if (!assetImports.has(importName)) {
    assetImports.set(importName, resolvedPath);
  }

  prop.value = {
    type: 'BinaryExpression',
    operator: '+',
    left: {
      type: 'BinaryExpression',
      operator: '+',
      left: {
        type: 'StringLiteral',
        value: 'url(',
      },
      right: {
        type: 'Identifier',
        name: importName,
      },
    },
    right: {
      type: 'StringLiteral',
      value: ')',
    },
  } as t.BinaryExpression;
}

/**
 * Transform template code to replace asset string references with base64 constants
 *
 * Handles:
 * - Font components: <Font src={`${baseUrl}/fonts/myfont.woff2`} />
 * - Image tags: <img src="/images/logo.png" /> or <Image src="..." />
 * - Style props: style={{ backgroundImage: 'url(/images/bg.png)' }}
 *
 * Example transformation:
 * Before: <Font src={`${baseUrl}/fonts/myfont.woff2`} />
 * After:  const __asset_0 = "data:font/woff2;base64,...";
 *         <Font src={__asset_0} />
 */
export async function transformAssetsToImports(
  code: string,
  templatePath: string,
): Promise<TransformResult> {
  const cached = fileTransformCache.get(templatePath);
  if (cached) {
    return cached;
  }

  const templateDir = path.dirname(templatePath);
  const assetReferences: Array<{
    srcAttr: t.JSXAttribute;
    assetPath: string;
  }> = [];

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators'],
  });

  const attrToAssetPath = new WeakMap<
    t.JSXAttribute | t.ObjectProperty,
    string
  >();

  traverse(ast, {
    JSXOpeningElement(jsxPath) {
      const { node } = jsxPath;
      const componentName = getComponentName(node);

      if (isAssetComponent(componentName)) {
        const srcAttr = findAttribute(node, 'src');
        if (srcAttr?.value) {
          const assetPath = extractAssetPath(srcAttr.value, templateDir);
          if (assetPath) {
            assetReferences.push({ srcAttr, assetPath });
            attrToAssetPath.set(srcAttr, assetPath);
          }
        }
      }

      const styleAttr = findAttribute(node, 'style');
      if (styleAttr) {
        const bgImage = findBackgroundImageProperty(styleAttr);
        if (bgImage) {
          const assetPath = extractAssetPath(
            {
              type: 'StringLiteral',
              value: bgImage.assetPath,
            } as t.StringLiteral,
            templateDir,
          );
          if (assetPath) {
            assetReferences.push({ srcAttr: styleAttr, assetPath });
            attrToAssetPath.set(bgImage.prop, assetPath);
          }
        }
      }
    },
  });

  if (assetReferences.length === 0) {
    return { code, assetImports: new Map() };
  }

  const resolvedAssets = new Map<string, string>();
  await Promise.all(
    assetReferences.map(async ({ assetPath }) => {
      const resolved = await resolveAssetPath(assetPath, templateDir);
      if (resolved) {
        resolvedAssets.set(assetPath, resolved);
      }
    }),
  );

  let assetCounter = 0;
  const filePathToImportName = new Map<string, string>();
  const assetPathToImportName = new Map<string, string>();

  for (const [assetPath, resolvedPath] of resolvedAssets) {
    let importName = filePathToImportName.get(resolvedPath);
    if (!importName) {
      importName = `__asset_${assetCounter++}`;
      filePathToImportName.set(resolvedPath, importName);
    }
    assetPathToImportName.set(assetPath, importName);
  }

  const assetImports = new Map<string, string>();

  traverse(ast, {
    JSXOpeningElement(jsxPath) {
      const { node } = jsxPath;
      const componentName = getComponentName(node);

      if (isAssetComponent(componentName)) {
        const srcAttr = findAttribute(node, 'src');
        if (srcAttr) {
          const assetPath = attrToAssetPath.get(srcAttr);
          if (assetPath) {
            const importName = assetPathToImportName.get(assetPath);
            const resolvedPath = resolvedAssets.get(assetPath);
            if (importName && resolvedPath) {
              transformSrcAttribute(
                srcAttr,
                assetPath,
                importName,
                assetImports,
                resolvedPath,
              );
            }
          }
        }
      }

      const styleAttr = findAttribute(node, 'style');
      if (styleAttr) {
        const bgImage = findBackgroundImageProperty(styleAttr);
        if (bgImage) {
          const assetPath = attrToAssetPath.get(bgImage.prop);
          if (assetPath) {
            const importName = assetPathToImportName.get(assetPath);
            const resolvedPath = resolvedAssets.get(assetPath);
            if (importName && resolvedPath) {
              transformStyleBackgroundImage(
                bgImage.prop,
                assetPath,
                importName,
                assetImports,
                resolvedPath,
              );
            }
          }
        }
      }
    },
  });

  const mimeTypes: Record<string, string> = {
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const assetConstants = await Promise.all(
    Array.from(assetImports.entries()).map(async ([importName, filePath]) => {
      let dataUri = assetEncodingCache.get(filePath);

      if (!dataUri) {
        try {
          const buffer =
            typeof Bun !== 'undefined' && Bun.file
              ? await Bun.file(filePath)
                  .arrayBuffer()
                  .then((ab) => Buffer.from(ab))
              : await fs.readFile(filePath);

          const base64 = buffer.toString('base64');

          const ext = path.extname(filePath).toLowerCase();
          const mimeType = mimeTypes[ext] || 'application/octet-stream';
          dataUri = `data:${mimeType};base64,${base64}`;

          assetEncodingCache.set(filePath, dataUri);
        } catch (error) {
          console.error(
            `[Asset Transform] Failed to read asset file ${filePath}:`,
            error,
          );
          dataUri = '';
        }
      }

      return `const ${importName} = "${dataUri}";`;
    }),
  );

  const { code: transformedCode } = generate(ast, {
    retainLines: false,
    compact: false,
  });

  const finalCode =
    assetConstants.length > 0
      ? `${assetConstants.join('\n')}\n\n${transformedCode}`
      : transformedCode;

  const result = {
    code: finalCode,
    assetImports,
  };

  fileTransformCache.set(templatePath, result);

  return result;
}

/**
 * Clear caches (useful for hot reload or testing)
 */
export function clearTransformCaches(): void {
  fileTransformCache.clear();
  assetEncodingCache.clear();
  resolvedPathCache.clear();
}
