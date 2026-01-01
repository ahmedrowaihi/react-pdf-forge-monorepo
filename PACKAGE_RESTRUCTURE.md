# Package Restructure Analysis & Recommendations

## Current Package Structure

### Core Packages

1. **`@ahmedrowaihi/pdf-forge-primitive`** (`packages/primitive/`)
   - **Purpose**: Basic PDF structure components (Html, Head, Body, Document, Font, PageBreak, Theme)
   - **Dependencies**: None (pure React components)
   - **Status**: ✅ Well-defined, clear purpose

2. **`@ahmedrowaihi/pdf-forge-core`** (`packages/render/`)
   - **Purpose**: React to HTML rendering engine
   - **Dependencies**: `html-to-text`, `prettier`
   - **Status**: ⚠️ **Naming mismatch** - directory is `render` but package is `core`

3. **`@ahmedrowaihi/pdf-forge-components`** (`packages/components/`)
   - **Purpose**: Re-exports `core` + `primitive`
   - **Dependencies**: `core`, `primitive`
   - **Status**: ❓ **Questionable** - Just a convenience wrapper, might be redundant

### Tooling Packages

4. **`@ahmedrowaihi/pdf-forge-toolbox`** (`packages/toolbox/`)
   - **Purpose**: Shared utilities
   - **Responsibilities**:
     - Dependency graph creation
     - Template metadata discovery
     - Asset transformation
     - Path resolution
     - Hot reload detection
     - Spinner utilities
   - **Status**: ⚠️ **Too many responsibilities** - Could be split

5. **`@ahmedrowaihi/pdf-forge-cli`** (`packages/react-pdf/`)
   - **Purpose**: CLI tool for dev server, build, export
   - **Dependencies**: `toolbox`, file watching, socket.io
   - **Status**: ⚠️ **Naming mismatch** - directory is `react-pdf` but package is `cli`

6. **`create-pdf-forge`** (`packages/create-pdf/`)
   - **Purpose**: Scaffolding tool (like `create-react-app`)
   - **Status**: ✅ Clear purpose

### Rendering Packages

7. **`@ahmedrowaihi/pdf-forge-printer`** (`packages/pdf-forge-printer/`)
   - **Purpose**: Playwright-based PDF/screenshot rendering
   - **Dependencies**: `playwright`, `sharp`
   - **Status**: ✅ Well-defined, clear purpose

8. **`@ahmedrowaihi/pdf-forge-preview`** (`packages/preview-server/`)
   - **Purpose**: Next.js-based preview UI server
   - **Dependencies**: `next`, React UI components
   - **Status**: ✅ Clear purpose (but Next.js dependent)

---

## Issues Identified

### 1. **Naming Inconsistencies**

- `packages/render/` → `@ahmedrowaihi/pdf-forge-core` ❌
- `packages/react-pdf/` → `@ahmedrowaihi/pdf-forge-cli` ❌
- Should directory names match package names?

### 2. **Redundant Packages**

- `components` package just re-exports `core` + `primitive`
- Could users just import from `core` and `primitive` directly?

### 3. **Toolbox Overload**

- `toolbox` has too many responsibilities:
  - Build-time utilities (asset transforms, dependency graphs)
  - Runtime utilities (template discovery, hot reload)
  - Dev utilities (spinners, path resolution)
- Could be split into: `build-tools`, `runtime-utils`, `dev-utils`

### 4. **Unclear Separation**

- What's the difference between `primitive` and `components`?
- Should `primitive` be part of `core`?

---

## Recommendations

### Option A: Minimal Changes (Recommended for Now)

**Keep current structure but fix naming:**

1. **Rename directories to match packages:**
   - `packages/render/` → `packages/core/`
   - `packages/react-pdf/` → `packages/cli/`

2. **Keep `components` as convenience package:**
   - Users can import everything from one place
   - Or import `core` + `primitive` separately if they want

3. **Split `toolbox` into focused packages:**
   - `@ahmedrowaihi/pdf-forge-build-tools` - Build-time utilities
   - `@ahmedrowaihi/pdf-forge-runtime` - Runtime utilities (template discovery, etc.)
   - Keep `toolbox` as re-export or remove it

### Option B: Consolidation

**Merge related packages:**

1. **Merge `primitive` into `core`:**
   - `@ahmedrowaihi/pdf-forge-core` includes both rendering + primitives
   - Simpler for users - one package for core functionality

2. **Keep `components` as convenience:**
   - Re-exports `core` (which now includes primitives)

3. **Split `toolbox` as in Option A**

### Option C: Full Restructure (Future)

**Complete reorganization:**

```
packages/
├── core/                    # React to HTML rendering
│   └── @ahmedrowaihi/pdf-forge-core
├── components/              # PDF components (primitives + high-level)
│   └── @ahmedrowaihi/pdf-forge-components
├── printer/                 # PDF generation (Playwright)
│   └── @ahmedrowaihi/pdf-forge-printer
├── preview/                 # Preview server (Next.js)
│   └── @ahmedrowaihi/pdf-forge-preview
├── cli/                     # CLI tool
│   └── @ahmedrowaihi/pdf-forge-cli
├── build-tools/             # Build-time utilities
│   └── @ahmedrowaihi/pdf-forge-build-tools
├── runtime/                 # Runtime utilities
│   └── @ahmedrowaihi/pdf-forge-runtime
└── create/                  # Scaffolding
    └── create-pdf-forge
```

---

## My Recommendation: **Option A with Toolbox Split**

### Immediate Actions:

1. **Fix naming inconsistencies:**

   ```bash
   packages/render/ → packages/core/
   packages/react-pdf/ → packages/cli/
   ```

2. **Split toolbox:**
   - `@ahmedrowaihi/pdf-forge-build-tools` - Asset transforms, dependency graphs
   - `@ahmedrowaihi/pdf-forge-runtime` - Template discovery, hot reload
   - Keep `toolbox` as thin re-export for backward compatibility

3. **Keep `components` package:**
   - It's a convenience - users can import everything from one place
   - Or use `core` + `primitive` directly if they prefer

### Package Responsibilities:

| Package                               | Responsibility                 | Dependencies                        |
| ------------------------------------- | ------------------------------ | ----------------------------------- |
| `@ahmedrowaihi/pdf-forge-primitive`   | Basic PDF structure components | None                                |
| `@ahmedrowaihi/pdf-forge-core`        | React → HTML rendering         | `html-to-text`, `prettier`          |
| `@ahmedrowaihi/pdf-forge-components`  | Convenience re-export          | `core`, `primitive`                 |
| `@ahmedrowaihi/pdf-forge-build-tools` | Build-time utilities           | `@babel/*`                          |
| `@ahmedrowaihi/pdf-forge-runtime`     | Runtime utilities              | File system APIs                    |
| `@ahmedrowaihi/pdf-forge-printer`     | PDF generation                 | `playwright`, `sharp`               |
| `@ahmedrowaihi/pdf-forge-preview`     | Preview UI server              | `next`, React                       |
| `@ahmedrowaihi/pdf-forge-cli`         | CLI tool                       | `build-tools`, `runtime`, `preview` |
| `create-pdf-forge`                    | Scaffolding                    | None                                |

---

## Questions to Consider

1. **Should `primitive` be merged into `core`?**
   - Pro: Simpler for users, one less package
   - Con: Less granular control, larger bundle if you only need rendering

2. **Should `components` package exist?**
   - Pro: Convenience, single import
   - Con: Extra package, users can import directly

3. **How to split `toolbox`?**
   - By usage (build-time vs runtime)?
   - By domain (templates, assets, dev tools)?

4. **Naming convention:**
   - Keep `pdf-forge-*` prefix?
   - Or use shorter names like `@pdf-forge/core`?

---

## Next Steps

1. **Decide on approach** (Option A, B, or C)
2. **Create migration plan** with backward compatibility
3. **Update documentation** with new structure
4. **Gradual migration** - don't break existing users

What do you think? Which option resonates with you?
