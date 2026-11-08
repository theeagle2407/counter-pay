// A wallet-returned hash is never proof of a completed purchase. Keep this
// predicate independent of UI and database code so it can be exercised with
// adversarial transaction fixtures before any delivery endpoint uses it.
export function verifyPayment(tx, order, finalizedHeight) {
  if (!tx || !order) return { ok: false, reason: 'Transaction or order missing' };
  const normalize = value => typeof value === 'string' ? value.replace(/\s/g, '').toUpperCase() : '';
  if (order.network !== 'mainnet' || tx.networkId !== 24)
    return { ok: false, reason: 'Wrong network' };
  if (normalize(tx.to) !== normalize(order.recipient))
    return { ok: false, reason: 'Wrong recipient' };
  if (!Number.isSafeInteger(order.amountLuna) || order.amountLuna < 1 ||
      tx.value !== order.amountLuna)
    return { ok: false, reason: 'Wrong amount' };
  if (decodeRecipientData(tx.recipientData) !== `COUNTER:${order.reference}`)
    return { ok: false, reason: 'Wrong order reference' };
  if (tx.executionResult !== true)
    return { ok: false, reason: 'Transaction did not execute' };
  if (!Number.isSafeInteger(tx.blockNumber) || !Number.isSafeInteger(finalizedHeight) ||
      finalizedHeight < tx.blockNumber)
    return { ok: false, reason: 'Transaction not finalized' };
  return { ok: true };
}

function decodeRecipientData(data) {
  if (Array.isArray(data) && data.every(x => Number.isInteger(x) && x >= 0 && x <= 255))
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(data));
  if (typeof data !== 'string') return null;
  if (/^(0x)?(?:[0-9a-f]{2})+$/i.test(data)) {
    const hex = data.startsWith('0x') ? data.slice(2) : data;
    try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(hex.match(/.{2}/g), x => parseInt(x, 16))); }
    catch { return null; }
  }
  return data;
}
