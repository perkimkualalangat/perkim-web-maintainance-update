/**
 * checks.mjs — PERKIM Web health checks
 * Validates JSON, HTML links, image sizes, R2 assets, SEO, accessibility
 */

import { config } from './config.mjs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const PERKIM_WEB = config.paths.perkimWeb;
const DATA_DIR = resolve(__dirname, '..', 'data');

const THRESHOLDS = {
  htmlSizeKB: 300,
  imageSizeKB: 500,
  responseTimeMs: 2500,
  lighthouseScore: 70,
};

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function check(id, label, run) {
  return async () => {
    const started = Date.now();
    try {
      const result = await run();
      return { id, label, ok: result.ok, durationMs: Date.now() - started, output: result.output };
    } catch (error) {
      return { id, label, ok: false, durationMs: Date.now() - started, output: String(error.stack || error.message) };
    }
  };
}

function formatOutput(ok, message, details = []) {
  return { ok, output: details.length ? `${message}\n${details.join('\n')}` : message };
}

/**
 * Check JSON data files are valid and have expected structure
 */
async function checkDataFiles() {
  const dataPath = join(PERKIM_WEB, 'data');
  const expectedFiles = [
    'site.json', 'books.json', 'aktiviti.json', 'kepimpinan.json',
    'berita.json', 'perkim-network.json', 'search-index.json',
    'perkim.json', 'sitemap.json', 'motion.json',
    'perkim/ringkasan.json',
  ];

  const results = { valid: 0, invalid: 0, missing: 0, details: [] };

  for (const file of expectedFiles) {
    const fullPath = join(dataPath, file);
    try {
      const content = await readFile(fullPath, 'utf8');
      const parsed = JSON.parse(content);
      results.valid++;
      results.details.push({ file, status: 'valid', records: Array.isArray(parsed) ? parsed.length : (parsed?.kumpulan ? parsed.kumpulan.reduce((a, g) => a + (g.buku?.length || 0), 0) : Object.keys(parsed).length) });
    } catch (e) {
      if (e.code === 'ENOENT') {
        results.missing++;
        results.details.push({ file, status: 'missing' });
      } else {
        results.invalid++;
        results.details.push({ file, status: 'invalid', error: e.message });
      }
    }
  }

  return formatOutput(
    results.invalid === 0 && results.missing === 0,
    `${results.valid} valid, ${results.invalid} invalid, ${results.missing} missing`,
    results.details.map(d => `${d.file}: ${d.status}${d.records !== undefined ? ` (${d.records} records)` : ''}${d.error ? ` - ${d.error}` : ''}`)
  );
}

/**
 * Check HTML pages for basic validity
 */
async function checkHtmlPages() {
  const pagesPath = join(PERKIM_WEB, 'pages');
  const rootPath = PERKIM_WEB;

  const pages = ['index.html'];
  try {
    const entries = await readdir(pagesPath);
    pages.push(...entries.filter(f => f.endsWith('.html')).map(f => `pages/${f}`));
  } catch {}

  const issues = [];

  for (const page of pages) {
    const fullPath = join(rootPath, page);
    try {
      const content = await readFile(fullPath, 'utf8');
      const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;

      if (sizeKB > THRESHOLDS.htmlSizeKB) {
        issues.push(`${page}: HTML size ${sizeKB.toFixed(1)}KB > ${THRESHOLDS.htmlSizeKB}KB`);
      }

      if (!content.includes('<title>')) issues.push(`${page}: Missing <title>`);
      if (!content.includes('meta name="description"')) issues.push(`${page}: Missing meta description`);
      if (!content.includes('lang="ms"')) issues.push(`${page}: Missing lang="ms"`);
      if (!content.includes('<h1')) issues.push(`${page}: Missing <h1>`);
      if (!content.includes('viewport')) issues.push(`${page}: Missing viewport meta`);

    } catch (e) {
      issues.push(`${page}: ${e.message}`);
    }
  }

  return formatOutput(issues.length === 0, `${pages.length} pages checked`, issues);
}

/**
 * Check internal links in HTML files
 */
async function checkInternalLinks() {
  const pagesPath = join(PERKIM_WEB, 'pages');
  const rootPath = PERKIM_WEB;

  const pages = ['index.html'];
  try {
    const entries = await readdir(pagesPath);
    pages.push(...entries.filter(f => f.endsWith('.html')).map(f => `pages/${f}`));
  } catch {}

  const issues = [];
  const linkRegex = /href=["']([^"']+)["']/g;

  for (const page of pages) {
    const fullPath = join(rootPath, page);
    try {
      const content = await readFile(fullPath, 'utf8');
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const href = match[1];
        if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        // Resolve relative to page
        const pageDir = page.includes('/') ? join(rootPath, page.replace(/\/[^/]+$/, '')) : rootPath;
        const targetPath = join(pageDir, href.replace(/#.*$/, ''));

        try {
          await stat(targetPath);
        } catch {
          issues.push(`${page}: Broken link -> ${href}`);
        }
      }
    } catch (e) {
      issues.push(`${page}: ${e.message}`);
    }
  }

  return formatOutput(issues.length === 0, `Checked ${pages.length} pages`, issues);
}

/**
 * Check image sizes
 */
async function checkImageSizes() {
  const assetDirs = ['assets/img', 'assets/books', 'program'];
  const issues = [];
  let checked = 0;

  for (const dir of assetDirs) {
    const fullDir = join(PERKIM_WEB, dir);
    try {
      const entries = await readdir(fullDir, { recursive: true, withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(extname(entry.name).toLowerCase())) {
          checked++;
          const filePath = join(fullDir, entry.name);
          try {
            const stats = await stat(filePath);
            const sizeKB = stats.size / 1024;
            if (sizeKB > THRESHOLDS.imageSizeKB) {
              const relPath = relative(PERKIM_WEB, filePath);
              issues.push(`${relPath}: ${sizeKB.toFixed(1)}KB > ${THRESHOLDS.imageSizeKB}KB`);
            }
          } catch {}
        }
      }
    } catch {}
  }

  return formatOutput(issues.length === 0, `${checked} images checked`, issues);
}

/**
 * Check R2 assets (PDFs and covers from books.json)
 */
async function checkR2Assets() {
  const booksPath = join(PERKIM_WEB, 'data', 'books.json');
  const issues = [];
  let checked = 0;

  try {
    const booksData = await readJson(booksPath);
    if (!booksData?.kumpulan) return formatOutput(true, 'books.json not found or invalid');

    for (const group of booksData.kumpulan) {
      for (const book of group.buku || []) {
        checked += 2;
        if (book.pdf) {
          try {
            const res = await fetch(book.pdf, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
            if (!res.ok) issues.push(`PDF ${book.id}: HTTP ${res.status}`);
            else {
              const ct = res.headers.get('content-type');
              if (!ct?.includes('pdf')) issues.push(`PDF ${book.id}: Not a PDF (${ct})`);
            }
          } catch {
            issues.push(`PDF ${book.id}: Unreachable`);
          }
        }
        if (book.cover) {
          try {
            const res = await fetch(book.cover, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
            if (!res.ok) issues.push(`Cover ${book.id}: HTTP ${res.status}`);
            else {
              const ct = res.headers.get('content-type');
              if (!ct?.startsWith('image/')) issues.push(`Cover ${book.id}: Not an image (${ct})`);
            }
          } catch {
            issues.push(`Cover ${book.id}: Unreachable`);
          }
        }
      }
    }
  } catch (e) {
    issues.push(`Error checking R2: ${e.message}`);
  }

  return formatOutput(issues.length === 0, `${checked} R2 assets checked`, issues);
}

/**
 * Check SEO basics
 */
async function checkSeo() {
  const pagesPath = join(PERKIM_WEB, 'pages');
  const rootPath = PERKIM_WEB;

  const pages = ['index.html'];
  try {
    const entries = await readdir(pagesPath);
    pages.push(...entries.filter(f => f.endsWith('.html')).map(f => `pages/${f}`));
  } catch {}

  const issues = [];

  for (const page of pages) {
    const fullPath = join(rootPath, page);
    try {
      const content = await readFile(fullPath, 'utf8');

      const title = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (!title) issues.push(`${page}: No title`);
      else if (title[1].length < 10 || title[1].length > 70) issues.push(`${page}: Title length ${title[1].length} (10-70)`);

      const desc = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (!desc) issues.push(`${page}: No meta description`);
      else if (desc[1].length < 50 || desc[1].length > 170) issues.push(`${page}: Description length ${desc[1].length} (50-170)`);

      const canonical = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
      if (!canonical && !content.includes('noindex')) issues.push(`${page}: No canonical URL`);

      const ogTitle = content.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      const ogDesc = content.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (!ogTitle) issues.push(`${page}: No og:title`);
      if (!ogDesc) issues.push(`${page}: No og:description`);

    } catch (e) {
      issues.push(`${page}: ${e.message}`);
    }
  }

  return formatOutput(issues.length === 0, `SEO checked on ${pages.length} pages`, issues);
}

/**
 * Check accessibility basics
 */
async function checkA11y() {
  const pagesPath = join(PERKIM_WEB, 'pages');
  const rootPath = PERKIM_WEB;

  const pages = ['index.html'];
  try {
    const entries = await readdir(pagesPath);
    pages.push(...entries.filter(f => f.endsWith('.html')).map(f => `pages/${f}`));
  } catch {}

  const issues = [];

  for (const page of pages) {
    const fullPath = join(rootPath, page);
    try {
      const content = await readFile(fullPath, 'utf8');

      if (!content.includes('lang="ms"')) issues.push(`${page}: Missing lang="ms"`);
      if (!content.match(/<h1[^>]*>/)) issues.push(`${page}: No H1`);
      if (!content.includes('skip-link') && !content.includes('href="#main"')) issues.push(`${page}: No skip link`);

      // Images without alt
      const imgMatches = content.matchAll(/<img[^>]*>/g);
      for (const match of imgMatches) {
        const imgTag = match[0];
        if (!imgTag.includes('alt=')) {
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          issues.push(`${page}: Image missing alt -> ${srcMatch?.[1] || 'unknown'}`);
        }
      }

      // target="_blank" without noopener
      const blankLinks = content.matchAll(/<a[^>]*target=["']_blank["'][^>]*>/g);
      for (const match of blankLinks) {
        if (!match[0].includes('noopener') && !match[0].includes('noreferrer')) {
          issues.push(`${page}: target=_blank without noopener`);
        }
      }

    } catch (e) {
      issues.push(`${page}: ${e.message}`);
    }
  }

  return formatOutput(issues.length === 0, `A11y checked on ${pages.length} pages`, issues);
}

/**
 * Check NVIDIA API configuration
 */
async function checkNvidiaConfig() {
  const ok = config.nvidia.hasValidKey;
  return formatOutput(ok, ok
    ? `Model: ${config.nvidia.model}\nEndpoint: ${config.nvidia.baseUrl}`
    : 'NVIDIA_API_KEY not configured in .env.local');
}

/**
 * Check monitor audit status
 */
async function checkMonitorAudit() {
  const statusPath = join(config.paths.perkimMonitor, 'data', 'status.json');
  try {
    const status = await readJson(statusPath);
    if (!status) return formatOutput(false, 'No audit data found');
    const score = status.summary?.score ?? 0;
    const ok = score >= THRESHOLDS.lighthouseScore;
    return formatOutput(ok, `Monitor score: ${score}/100`, [
      `Pass: ${status.summary?.pass || 0}`,
      `Warn: ${status.summary?.warn || 0}`,
      `Fail: ${status.summary?.fail || 0}`,
      `Generated: ${status.generated_at || 'unknown'}`,
    ]);
  } catch {
    return formatOutput(false, 'Monitor audit not run yet');
  }
}

export async function runSystemChecks() {
  const startedAt = Date.now();

  const checks = [
    check('data-files', 'Data Files (JSON)', checkDataFiles),
    check('html-pages', 'HTML Pages', checkHtmlPages),
    check('internal-links', 'Internal Links', checkInternalLinks),
    check('image-sizes', 'Image Sizes', checkImageSizes),
    check('r2-assets', 'R2 Assets (PDF/Cover)', checkR2Assets),
    check('seo', 'SEO Basics', checkSeo),
    check('a11y', 'Accessibility', checkA11y),
    check('nvidia', 'NVIDIA Configuration', checkNvidiaConfig),
    check('monitor-audit', 'Monitor Audit', checkMonitorAudit),
  ];

  const results = await Promise.all(checks.map(run => run()));

  return {
    ok: results.every(r => r.ok),
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    results,
  };
}