import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isValidNimiqAddress } from '../../nimiq-address.mjs';
import { encodeFile, MAX_FILE_BYTES } from '../../file-content.mjs';

export const dynamic = 'force-dynamic';
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function GET() {
  if (!env.DB) return NextResponse.json({ listings: [] });
  const { results } = await env.DB.prepare(`SELECT l.id, l.title, l.description, l.kind, l.amount_luna AS amountLuna, l.pickup_city AS pickupCity,
    l.edition_limit AS editionLimit, (SELECT COUNT(*) FROM orders o WHERE o.listing_id=l.id AND o.status='free') AS claimed
    FROM listings l WHERE l.active = 1 ORDER BY l.created_at DESC LIMIT 50`).all();
  return NextResponse.json({ listings: results }, { headers: { 'Cache-Control': 'no-store' } });
}

// Initial seller onboarding is deliberately admin-only. Never put this secret
// in client JavaScript; public seller identity will require a separate design.
export async function POST(request: NextRequest) {
  const secret = env.COUNTER_ADMIN_SECRET;
  if (!secret || request.headers.get('x-counter-admin-secret') !== secret)
    return error('Seller setup is not available.', 403);
  if (!env.DB) return error('Store storage is not configured.', 503);
  const data = await request.formData();
  const file = data.get('file');
  const title = String(data.get('title') ?? '').trim();
  const description = String(data.get('description') ?? '').trim();
  const amountNim = Number(data.get('amountNim'));
  const editionLimit = Number(data.get('editionLimit') || 0);
  const payoutAddress = String(data.get('payoutAddress') ?? '').trim();
  // D1 has a 2 MB row limit. Keep encoded files comfortably below it.
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES ||
      !['application/pdf', 'application/zip', 'text/plain', 'text/html'].includes(file.type) ||
      !title || title.length > 80 || !description || description.length > 1200 ||
      !isValidNimiqAddress(payoutAddress) ||
      !Number.isFinite(amountNim) || amountNim < 0 || amountNim > 100_000 ||
      (amountNim === 0 && (!Number.isInteger(editionLimit) || editionLimit < 1 || editionLimit > 10000)) ||
      Math.abs(amountNim * 100_000 - Math.round(amountNim * 100_000)) > 1e-7)
    return error('Invalid listing details or file.', 400);
  const id = crypto.randomUUID();
  const objectKey = `products/${id}`;
  const encoded = encodeFile(new Uint8Array(await file.arrayBuffer()));
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO listings (id,title,description,kind,amount_luna,payout_address,object_key,original_filename,edition_limit,active,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)')
        .bind(id, title, description, 'download', Math.round(amountNim * 100_000), payoutAddress, objectKey, file.name.slice(0, 120), amountNim === 0 ? editionLimit : null, Date.now()),
      env.DB.prepare('INSERT INTO product_files (listing_id,content_type,content_base64) VALUES (?,?,?)')
        .bind(id, file.type, encoded),
    ]);
  } catch {
    return error('Could not create the listing.', 500);
  }
  return NextResponse.json({ id, title, amountNim }, { status: 201 });
}
