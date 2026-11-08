import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { verifyPayment } from '../app/payment-proof.mjs';

const order = { network: 'mainnet', recipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000', amountLuna: 125000, reference: 'order_abcdef12' };
const tx = { networkId: 24, to: order.recipient, value: order.amountLuna, recipientData: `COUNTER:${order.reference}`, executionResult: true, blockNumber: 100 };
test('accepts only a finalized exact payment', () => assert.deepEqual(verifyPayment(tx, order, 100), { ok: true }));
test('accepts RPC byte-array recipient data', () => assert.equal(verifyPayment({ ...tx, recipientData: [...new TextEncoder().encode(tx.recipientData)] }, order, 100).ok, true));
test('accepts hex-encoded recipient data', () => assert.equal(verifyPayment({ ...tx, recipientData: `0x${Buffer.from(tx.recipientData).toString('hex')}` }, order, 100).ok, true));
for (const [label, changedTx, changedOrder, height] of [
  ['network', { networkId: 5 }, {}, 100],
  ['recipient', { to: 'NQ99 WRONG' }, {}, 100],
  ['amount', { value: 125001 }, {}, 100],
  ['reference', { recipientData: 'COUNTER:another-order' }, {}, 100],
  ['failed execution', { executionResult: false }, {}, 100],
  ['unconfirmed', { blockNumber: undefined }, {}, 100],
  ['not finalized', {}, {}, 99],
  ['testnet order', {}, { network: 'testnet' }, 100],
]) test(`rejects ${label}`, () => assert.equal(verifyPayment({ ...tx, ...changedTx }, { ...order, ...changedOrder }, height).ok, false));
