import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeFile, decodeFile, MAX_FILE_BYTES } from '../app/file-content.mjs';

test('small binary files roundtrip exactly', () => {
  const bytes = Uint8Array.from([0, 1, 127, 128, 255]);
  assert.deepEqual(decodeFile(encodeFile(bytes)), bytes);
});
test('rejects files beyond D1-safe size', () => {
  assert.throws(() => encodeFile(new Uint8Array(MAX_FILE_BYTES + 1)));
});
test('rejects malformed stored bytes', () => {
  assert.throws(() => decodeFile('***'));
});
