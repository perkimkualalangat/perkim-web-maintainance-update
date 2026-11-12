/**
 * scan.mjs — Scan perkim-web and generate data manifests for Dashboard
 * Run via: npm run scan
 */

import { config } from './config.mjs';
import { scanManifest, listDir, readFileContent, resolveSafePath } from './file-ops.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, extname, basename } from 'node:path';

const { perkimWeb } = config.paths;
const DATA_DIR = resolve('data');

// Asset type categories based on PERKIM web structure
const ASSET_CATEGORIES = {
  pages: { path: 'pages', extensions: ['.html'], label: 'Pages' },
  'data-files': { path: 'data', extensions: ['.json'], label: 'Data Files (JSON)' },
  modules: { path: 'js/modules', extensions: ['.js', '.mjs'], label: 'JS Modules' },
  styles: { path: 'css', extensions: ['.css'], label: 'Stylesheets' },
  assets: { path: 'assets', extensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf', '.woff', '.woff2'], label: 'Assets (Images/Fonts/PDFs)' },
  config: { path: '.', extensions: ['.json', '.md', '.txt', '.yaml', '.yml'], label: 'Config Files' },
};

async function scanCategory(categoryKey, options = {}) {
  const category = ASSET_CATEGORIES[categoryKey];
  if (!category) return [];

  try {
    const manifest = await scanManifest('web', category.path);
    return manifest.files.map(file => ({
      ...file,
      category: categoryKey,
      categoryLabel: category.label,
    }));
  } catch (error) {
    console.error(`[SCAN] Failed to scan ${categoryKey}:`, error.message);
    return [];
  }
}

async function generatePageMetadata() {
  // Scan pages directory for HTML files and extract metadata
  const pagesPath = resolveSafePath('pages', 'web');
  if (!pagesPath) return [];

  try {
    const entries = await listDir('pages', 'web');
    const pages = [];

    for (const entry of entries) {
      if (!entry.isDirectory && entry.extension === '.html') {
        try {
          const content = await readFileContent(entry.path, 'web');
          const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);

          pages.push({
            path: entry.path,
            title: titleMatch?.[1]?.trim() || basename(entry.path, '.html'),
            description: descMatch?.[1]?.trim() || '',
            h1: h1Match?.[1]?.trim() || '',
            size: entry.size,
            modified: entry.modified,
          });
        } catch {
          pages.push({
            path: entry.path,
            title: basename(entry.path, '.html'),
            size: entry.size,
            modified: entry.modified,
          });
        }
      }
    }

    return pages;
  } catch {
    return [];
  }
}

async function generateModuleMetadata() {
  // Scan JS modules for exports, imports, dependencies
  const modules = [];
  try {
    const entries = await listDir('js/modules', 'web');
    for (const entry of entries) {
      if (!entry.isDirectory && (entry.extension === '.js' || entry.extension === '.mjs')) {
        try {
          const content = await readFileContent(entry.path, 'web');
          const imports = [...content.matchAll(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
          const exports = [...content.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g)].map(m => m[1]);

          modules.push({
            path: entry.path,
            name: basename(entry.path, entry.extension),
            size: entry.size,
            modified: entry.modified,
            imports: imports.filter(i => !i.startsWith('.')),
            localImports: imports.filter(i => i.startsWith('.')),
            exports,
          });
        } catch {
          modules.push({ path: entry.path, name: basename(entry.path, entry.extension), size: entry.size });
        }
      }
    }
  } catch {}
  return modules;
}

async function generateDataFileMetadata() {
  // Scan JSON data files for structure
  const dataFiles = [];
  try {
    const entries = await listDir('data', 'web');
    for (const entry of entries) {
      if (!entry.isDirectory && entry.extension === '.json') {
        try {
          const content = await readFileContent(entry.path, 'web');
          const parsed = JSON.parse(content);
          let recordCount = 0;
          let structure = 'object';

          if (Array.isArray(parsed)) {
            recordCount = parsed.length;
            structure = 'array';
          } else if (typeof parsed === 'object' && parsed !== null) {
            recordCount = Object.keys(parsed).length;
            structure = 'object';
          }

          dataFiles.push({
            path: entry.path,
            name: basename(entry.path, '.json'),
            size: entry.size,
            modified: entry.modified,
            recordCount,
            structure,
            keys: structure === 'object' ? Object.keys(parsed).slice(0, 20) : [],
          });
        } catch {
          dataFiles.push({ path: entry.path, name: basename(entry.path, '.json'), size: entry.size });
        }
      }
    }
  } catch {}
  return dataFiles;
}

async function generateAssetMetadata() {
  // Scan assets (images, fonts, PDFs)
  const assets = [];
  const assetDirs = ['assets/img', 'assets/books', 'assets/fonts', 'assets/icons', 'program'];

  for (const dir of assetDirs) {
    try {
      const manifest = await scanManifest('web', dir);
      for (const file of manifest.files) {
        assets.push({
          ...file,
          type: file.extension.match(/\.(png|jpg|jpeg|webp|svg)$/) ? 'image' :
                file.extension === '.pdf' ? 'pdf' :
                file.extension.match(/\.(woff|woff2|ttf|eot)$/) ? 'font' : 'other',
        });
      }
    } catch {}
  }
  return assets;
}

async function generateConfigMetadata() {
  // Root config files
  const configs = [];
  const configFiles = ['site.json', 'package.json', 'README.md', 'sitemap.json', 'search-index.json'];

  for (const file of configFiles) {
    try {
      const absPath = resolveSafePath(file, 'web');
      if (absPath) {
        const stats = await import('node:fs/promises').then(fs => fs.stat(absPath));
        const content = await readFileContent(file, 'web');
        configs.push({
          path: file,
          name: basename(file),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: extname(file).toLowerCase(),
          preview: content.slice(0, 200),
        });
      }
    } catch {}
  }
  return configs;
}

export async function runFullScan(options = {}) {
  console.log('[SCAN] Starting full scan of perkim-web...');

  const results = {
    scannedAt: new Date().toISOString(),
    categories: {},
    summary: {},
  };

  // Scan each category
  for (const categoryKey of Object.keys(ASSET_CATEGORIES)) {
    console.log(`[SCAN] Scanning ${categoryKey}...`);
    let files;

    switch (categoryKey) {
      case 'pages':
        files = await generatePageMetadata();
        break;
      case 'modules':
        files = await generateModuleMetadata();
        break;
      case 'data-files':
        files = await generateDataFileMetadata();
        break;
      case 'assets':
        files = await generateAssetMetadata();
        break;
      case 'config':
        files = await generateConfigMetadata();
        break;
      default:
        files = await scanCategory(categoryKey);
    }

    results.categories[categoryKey] = {
      label: ASSET_CATEGORIES[categoryKey].label,
      count: files.length,
      files,
    };
  }

  // Summary
  results.summary = {
    totalFiles: Object.values(results.categories).reduce((sum, c) => sum + c.count, 0),
    byCategory: Object.fromEntries(
      Object.entries(results.categories).map(([k, v]) => [k, v.count])
    ),
  };

  // Write to data/manifest.json
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'manifest.json'), JSON.stringify(results, null, 2) + '\n');

  // Also write individual category files for easier loading
  for (const [key, cat] of Object.entries(results.categories)) {
    await writeFile(join(DATA_DIR, `${key}.json`), JSON.stringify(cat.files, null, 2) + '\n');
  }

  console.log('[SCAN] Complete:', results.summary);
  return results;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullScan().catch(err => {
    console.error('[SCAN] Error:', err);
    process.exit(1);
  });
}

export { scanCategory, ASSET_CATEGORIES };