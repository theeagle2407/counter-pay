import { readFile } from 'node:fs/promises';

const base = process.env.COUNTER_BASE_URL || 'http://127.0.0.1:5173';
const secret = process.env.COUNTER_ADMIN_SECRET;
if (!secret) throw new Error('Set COUNTER_ADMIN_SECRET in .dev.vars and restart the dev server.');
const html = await readFile(new URL('../assets/counter-weekend-notes.html', import.meta.url));
const data = new FormData();
data.set('title', 'Weekend Notes · limited free edition');
data.set('description', 'A beautifully simple weekend planner. Claim one of 50 free editions at checkout, then download the printable file. No NIM payment required.');
data.set('amountNim', '0');
data.set('editionLimit', '50');
data.set('payoutAddress', 'NQ45 AUGB 5H1X 8FH6 GGXR RBL7 QBJV 4A6D BN8E');
data.set('file', new File([html], 'counter-weekend-notes.html', { type: 'text/html' }));
const response = await fetch(new URL('/api/listings', base), { method: 'POST', headers: { 'x-counter-admin-secret': secret }, body: data });
const result = await response.json();
if (!response.ok) throw new Error(result.error || 'Could not publish.');
console.log('Published free edition:', result.id);
