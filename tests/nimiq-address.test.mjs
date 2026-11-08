import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isValidNimiqAddress } from '../app/nimiq-address.mjs';

const payout = 'NQ45 AUGB 5H1X 8FH6 GGXR RBL7 QBJV 4A6D BN8E';
test('accepts the supplied public payout address', () => assert.equal(isValidNimiqAddress(payout), true));
test('accepts canonical unspaced form', () => assert.equal(isValidNimiqAddress(payout.replaceAll(' ', '')), true));
test('rejects a mistyped checksum', () => assert.equal(isValidNimiqAddress(payout.replace('NQ45', 'NQ46')), false));
test('rejects missing/invalid addresses', () => {
  for (const input of ['', null, 'NQ07 WRONG', payout.replace('AUGB', 'AUGO')])
    assert.equal(isValidNimiqAddress(input), false);
});
