import { readFile } from 'node:fs/promises';

const base = process.env.COUNTER_BASE_URL;
const secret = process.env.COUNTER_ADMIN_SECRET;
const payout = process.env.COUNTER_PAYOUT_ADDRESS;
if (!base?.startsWith('https://') || !secret || !payout)
  throw new Error('Set COUNTER_BASE_URL (HTTPS), COUNTER_ADMIN_SECRET and COUNTER_PAYOUT_ADDRESS.');

const products = [
  {
    title: 'Invoice Studio',
    description: 'An editable invoice with line items, automatic totals, local autosave and print-to-PDF. Downloadable HTML file; works offline once saved.',
    file: 'counter-invoice-studio.html',
  },
  {
    title: 'Focus Planner',
    description: 'A simple weekly planning tool with priorities, seven daily focus fields, local autosave and print-to-PDF. Downloadable HTML file; works offline once saved.',
    file: 'counter-focus-planner.html',
  },
];

for (const product of products) {
  const response = await fetch(new URL('/api/listings', base));
  if (!response.ok) throw new Error(`Listing lookup failed: ${response.status}`);
  const existing = await response.json();
  if (existing.listings?.some(item => item.title === product.title)) {
    console.log(`Already published: ${product.title}`);
    continue;
  }
  const content = await readFile(new URL(`../assets/${product.file}`, import.meta.url));
  const data = new FormData();
  data.set('title', product.title);
  data.set('description', product.description);
  data.set('amountNim', '1');
  data.set('payoutAddress', payout);
  data.set('file', new File([content], product.file, { type: 'text/html' }));
  const published = await fetch(new URL('/api/listings', base), {
    method: 'POST', headers: { 'x-counter-admin-secret': secret }, body: data,
  });
  const result = await published.json();
  if (!published.ok) throw new Error(`${product.title}: ${result.error ?? published.status}`);
  console.log(`Published ${product.title}: ${result.id}`);
}
