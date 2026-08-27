import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexPath = new URL('../index.html', import.meta.url);

test('all local shell assets remain root-safe when the SPA is opened at a nested route', async () => {
  const html = await readFile(indexPath, 'utf8');
  const assetUrls = [
    ...[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(([, src]) => src),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(([, href]) => href),
  ].filter((url) => !/^(?:https?:|data:|#)/.test(url));

  assert.ok(assetUrls.length > 0);
  for (const assetUrl of assetUrls) {
    assert.equal(
      new URL(assetUrl, 'https://marketplace.test/listings/abc/edit').pathname,
      assetUrl,
      `${assetUrl} must resolve from the site root, not the current nested route`,
    );
  }
});
