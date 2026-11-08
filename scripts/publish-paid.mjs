import { readFile } from 'node:fs/promises';

const base = process.env.COUNTER_BASE_URL || 'http://127.0.0.1:5173';
const secret = process.env.COUNTER_ADMIN_SECRET;
const payout = process.env.COUNTER_PAYOUT_ADDRESS;
if (!secret || !payout) throw new Error('Set COUNTER_ADMIN_SECRET and COUNTER_PAYOUT_ADDRESS in this terminal.');
if (!/^https?:\/\//.test(base)) throw new Error('Invalid COUNTER_BASE_URL.');

const existing = await fetch(new URL('/api/listings', base)).then(r => r.json());
if (existing.listings?.some(item => item.title === 'Weekend Notes · paid edition')) {
  console.log('Paid edition already published. No duplicate created.');
  process.exit(0);
}
const html = await readFile(new URL('../assets/counter-weekend-notes.html', import.meta.url));
const data = new FormData();
data.set('title', 'Weekend Notes · paid edition');
data.set('description', 'Printable weekend planner. Delivered after a finalized 1 NIM payment.');
data.set('amountNim', '1');
data.set('payoutAddress', payout);
data.set('file', new File([html], 'counter-weekend-notes.html', { type: 'text/html' }));
const response = await fetch(new URL('/api/listings', base), {
  method: 'POST', headers: { 'x-counter-admin-secret': secret }, body: data,
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || 'Could not publish.');
console.log(`Published 1 NIM paid edition: ${result.id}`);
