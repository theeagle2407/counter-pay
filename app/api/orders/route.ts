import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!env.DB) return NextResponse.json({ error: 'Store is not ready.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { listingId?: unknown } | null;
  if (typeof body?.listingId !== 'string' || body.listingId.length > 80)
    return NextResponse.json({ error: 'Select a listing.' }, { status: 400 });
  const listing = await env.DB.prepare('SELECT id,amount_luna AS amountLuna,payout_address AS recipient,edition_limit AS editionLimit FROM listings WHERE id=? AND active=1')
    .bind(body.listingId).first<{ id: string; amountLuna: number; recipient: string; editionLimit: number | null }>();
  if (!listing) return NextResponse.json({ error: 'Listing is unavailable.' }, { status: 404 });
  const id = `order_${crypto.randomUUID().replaceAll('-', '')}`;
  const claimSecret = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(claimSecret));
  const claimHash = Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  if (listing.amountLuna === 0) {
    // One database write checks and consumes an edition; anonymous visitors can request more than one.
    const result = await env.DB.prepare(`INSERT INTO orders (id,listing_id,claim_hash,status,created_at)
      SELECT ?, l.id, ?, 'free', ? FROM listings l WHERE l.id=? AND l.active=1 AND l.amount_luna=0
      AND l.edition_limit IS NOT NULL AND (SELECT COUNT(*) FROM orders o WHERE o.listing_id=l.id AND o.status='free') < l.edition_limit`)
      .bind(id, claimHash, Date.now(), listing.id).run();
    if (!result.meta.changes) return NextResponse.json({ error: 'This edition has been fully claimed.' }, { status: 409 });
  } else {
    await env.DB.prepare('INSERT INTO orders (id,listing_id,claim_hash,status,created_at) VALUES (?,?,?,?,?)')
      .bind(id, listing.id, claimHash, 'pending', Date.now()).run();
  }
  return NextResponse.json({ id, claimSecret, status: listing.amountLuna === 0 ? 'free' : 'pending', amountLuna: listing.amountLuna, recipient: listing.recipient, network: 'mainnet' },
    { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
