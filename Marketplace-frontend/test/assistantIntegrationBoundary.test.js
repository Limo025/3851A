import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = path.join(FRONTEND_ROOT, 'src');
const ASSISTANT_ROOT = path.join(SOURCE_ROOT, 'assistant');
const SOURCE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.ts', '.tsx']);
const APPROVED_INTEGRATION_FILES = [
  'src/main.jsx',
  'src/pages/CreateListing.jsx',
];
const ASSISTANT_INTEGRATION = /(?:from\s+|import\s*)['"][^'"]*[\\/]assistant(?:[\\/]|['"])|import\s*\(\s*['"][^'"]*[\\/]assistant[\\/]|\b(?:ChatWidget|listingDraftFromLocationState|assistantDraft)\b|marketplace-assistant|\/api\/assistant(?:\/|['"])/;

async function readSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readSourceFiles(entryPath);
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : [];
  }));
  return nestedFiles.flat();
}

async function readAssistantFrontendSources() {
  const files = await readSourceFiles(ASSISTANT_ROOT);
  return (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
}

function repoRelative(file) {
  return path.relative(FRONTEND_ROOT, file).split(path.sep).join('/');
}

test('assistant never uses browser persistence', async () => {
  const source = await readAssistantFrontendSources();
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('assistant integration is limited to the two approved existing frontend files', async () => {
  const files = await readSourceFiles(SOURCE_ROOT);
  const existingFiles = files.filter((file) => !file.startsWith(`${ASSISTANT_ROOT}${path.sep}`));
  const integrationFiles = [];

  for (const file of existingFiles) {
    const source = await readFile(file, 'utf8');
    if (ASSISTANT_INTEGRATION.test(source)) integrationFiles.push(repoRelative(file));
  }

  assert.deepEqual(integrationFiles.sort(), [...APPROVED_INTEGRATION_FILES].sort());
});
