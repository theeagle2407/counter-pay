import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Counter link has its own icon and share artwork', async () => {
  const layout = await readFile('app/layout.tsx', 'utf8');
  for (const path of ['favicon.svg', 'apple-touch-icon.png', 'counter-preview.png']) {
    const asset = await readFile(`public/${path}`);
    assert.ok(asset.length > 100, `${path} is missing`);
    assert.match(layout, new RegExp(path.replace('.', '\\.')));
  }
  assert.match(layout, /metadataBase: new URL\("https:\/\/counter-pay\.theeagle2407\.workers\.dev"\)/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /summary_large_image/);
});
