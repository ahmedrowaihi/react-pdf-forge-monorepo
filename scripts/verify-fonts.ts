#!/usr/bin/env tsx
/**
 * Font Verification Utility
 *
 * This script helps verify that fonts are correctly loaded and applied in PDFs.
 * It can:
 * 1. Extract font metadata (internal name) from font files
 * 2. Check if CSS font-family matches font file internal name
 * 3. Generate a test HTML page to visually verify fonts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as opentype from 'opentype.js';

interface FontInfo {
  filePath: string;
  fileName: string;
  internalName?: string;
  familyName?: string;
  subfamilyName?: string;
  fullName?: string;
  error?: string;
}

function extractFontMetadata(fontPath: string): FontInfo {
  const info: FontInfo = {
    filePath: fontPath,
    fileName: path.basename(fontPath),
  };

  try {
    const fontBuffer = fs.readFileSync(fontPath);
    const font = opentype.parse(fontBuffer.buffer);

    info.internalName = font.names.fontFamily?.en || font.names.fontFamily?.[0];
    info.familyName = font.names.fontFamily?.en || font.names.fontFamily?.[0];
    info.subfamilyName =
      font.names.fontSubfamily?.en || font.names.fontSubfamily?.[0];
    info.fullName = font.names.fullName?.en || font.names.fullName?.[0];

    return info;
  } catch (error) {
    info.error = error instanceof Error ? error.message : String(error);
    return info;
  }
}

function verifyFonts() {
  // Fonts are in the parent project's assets/fonts directory
  const fontsDir = path.join(__dirname, '../fonts');
  const fontFiles: string[] = [];

  // Find all font files
  const folders = ['sans', 'serif-text', 'ibm-plex-sans-arabic'];

  for (const folder of folders) {
    const folderPath = path.join(fontsDir, folder);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      for (const file of files) {
        if (file.match(/\.(otf|ttf|woff|woff2)$/i)) {
          fontFiles.push(path.join(folderPath, file));
        }
      }
    }
  }

  console.log('🔍 Analyzing font files...\n');
  console.log('='.repeat(80));

  const results: FontInfo[] = [];
  for (const fontFile of fontFiles) {
    const info = extractFontMetadata(fontFile);
    results.push(info);

    console.log(`\n📄 ${info.fileName}`);
    console.log(`   Path: ${fontFile}`);
    if (info.error) {
      console.log(`   ❌ Error: ${info.error}`);
    } else {
      console.log(`   ✅ Internal Name: ${info.internalName || 'N/A'}`);
      console.log(`   ✅ Family Name: ${info.familyName || 'N/A'}`);
      console.log(`   ✅ Subfamily: ${info.subfamilyName || 'N/A'}`);
      console.log(`   ✅ Full Name: ${info.fullName || 'N/A'}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Summary:\n');

  // Check for mismatches
  const expectedNames = {
    sans: 'Thmanyah Sans',
    serif: 'Thmanyah Serif',
    ibmPlex: 'IBM Plex Sans Arabic',
  };

  for (const result of results) {
    if (result.error) continue;

    const fileName = result.fileName.toLowerCase();
    let expectedName = '';

    if (fileName.includes('sans') && !fileName.includes('ibm')) {
      expectedName = expectedNames.sans;
    } else if (fileName.includes('serif')) {
      expectedName = expectedNames.serif;
    } else if (fileName.includes('ibm') || fileName.includes('plex')) {
      expectedName = expectedNames.ibmPlex;
    }

    if (expectedName && result.internalName !== expectedName) {
      console.log(
        `⚠️  MISMATCH: ${result.fileName}\n` +
          `   Expected CSS name: "${expectedName}"\n` +
          `   Actual font name: "${result.internalName}"\n` +
          `   → You may need to use "${result.internalName}" in your CSS font-family\n`,
      );
    }
  }

  console.log('\n💡 Tips:');
  console.log(
    "1. The CSS font-family name must match the font file's internal name",
  );
  console.log("2. If names don't match, either:");
  console.log("   - Update your CSS to use the font's internal name, OR");
  console.log("   - Use font editing tools to change the font's internal name");
  console.log(
    '3. Check the rendered HTML/PDF to see which font is actually applied',
  );
}

// Run if called directly
if (require.main === module) {
  verifyFonts();
}

export { verifyFonts, extractFontMetadata };
