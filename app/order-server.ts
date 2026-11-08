import { env } from 'cloudflare:workers';
import { verifyPayment } from './payment-proof.mjs';

export type PendingOrder = {
  id: string; claim_hash: string; status: string; tx_hash: string | null;
  amount_luna: number; payout_address: string; object_key: string;
  original_filename: string; listing_id: string;
};

export async function authorizedOrder(id: string, secret: string): Promise<PendingOrder | null> {
  if (!env.DB || !/^order_[0-9a-f]{32}$/.test(id) || !/^[0-9a-f]{64}$/.test(secret)) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const claimHash = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
  return env.DB.prepare('SELECT o.id,o.claim_hash,o.status,o.tx_hash,l.amount_luna,l.payout_address,l.object_key,l.original_filename,l.id AS listing_id FROM orders o JOIN listings l ON l.id=o.listing_id WHERE o.id=? AND o.claim_hash=?')
    .bind(id, claimHash).first<PendingOrder>();
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const endpoint = env.COUNTER_NIMIQ_RPC_URL;
  if (!endpoint || new URL(endpoint).protocol !== 'https:') throw new Error('Mainnet RPC is not configured.');
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Mainnet RPC unavailable.');
  const json = await response.json() as { result?: { data?: unknown }; error?: unknown };
  if (json.error || json.result?.data == null) throw new Error('Mainnet RPC returned no result.');
  return json.result.data;
}

export async function verifyOnChain(order: PendingOrder, hash: string) {
  if (!/^[0-9a-f]{64}$/i.test(hash)) return { ok: false, reason: 'Invalid transaction hash' };
  const tx = await rpc('getTransactionByHash', [hash]) as Record<string, unknown>;
  if (typeof tx.hash !== 'string' || tx.hash.toLowerCase() !== hash.toLowerCase())
    return { ok: false, reason: 'Transaction hash mismatch' };
  const head = await rpc('getBlockNumber', []);
  if (!Number.isSafeInteger(head)) throw new Error('Invalid chain head.');
  const finalizedHeight = await rpc('getLastMacroBlock', [head]);
  return verifyPayment(tx, {
    network: 'mainnet', recipient: order.payout_address,
    amountLuna: order.amount_luna, reference: order.id,
  }, finalizedHeight);
}
