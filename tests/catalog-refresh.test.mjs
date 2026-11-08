import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
test('three paid products have usable downloadable files and idempotent publishing', async () => {
  const script = await readFile(new URL('scripts/publish-catalog.mjs', root), 'utf8');
  assert.match(script, /existing\.listings\?\.some/);
  assert.match(script, /data\.set\('amountNim', '1'\)/);
  for (const name of ['counter-weekend-notes.html', 'counter-invoice-studio.html', 'counter-focus-planner.html']) {
    const file = await readFile(new URL('assets/' + name, root), 'utf8');
    assert.match(file, /<!doctype html>/i);
    assert.ok(file.length > 1200, `${name} should contain real content`);
  }
});
test('free edition is hidden, not deleted; live cards use photographs', async () => {
  const sql = await readFile(new URL('drizzle/0003_catalog_refresh.sql', root), 'utf8');
  const ui = await readFile(new URL('app/live-shop.tsx', root), 'utf8');
  assert.match(sql, /SET active = 0/);
  assert.doesNotMatch(sql, /DELETE\s+FROM/i);
  assert.match(ui, /images\.unsplash\.com/);
  assert.match(ui, /Invoice Studio/);
  assert.match(ui, /Focus Planner/);
});
