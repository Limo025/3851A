import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSISTANT_ENTRYPOINT = path.join(BACKEND_ROOT, 'src', 'routes', 'assistant.js');
const RELATIVE_IMPORT = /(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g;

async function readAssistantBackendSources() {
  const pending = [ASSISTANT_ENTRYPOINT];
  const visited = new Set();
  const sources = [];

  while (pending.length > 0) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);

    const source = await readFile(file, 'utf8');
    sources.push(`// ${path.relative(BACKEND_ROOT, file)}\n${source}`);

    for (const match of source.matchAll(RELATIVE_IMPORT)) {
      const importedFile = path.resolve(path.dirname(file), match[1]);
      pending.push(path.extname(importedFile) ? importedFile : `${importedFile}.js`);
    }
  }

  return sources.join('\n');
}

test('assistant backend source never imports the User model', async () => {
  const source = await readAssistantBackendSources();
  assert.doesNotMatch(source, /models[\\/]User(?:\.js)?/);
});

test('assistant backend source never populates seller records', async () => {
  const source = await readAssistantBackendSources();
  assert.doesNotMatch(source, /\.populate\s*\(\s*(?:['"]seller['"]|\{[\s\S]{0,200}?\bpath\s*:\s*['"]seller['"])/);
});
