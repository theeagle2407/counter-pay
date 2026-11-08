import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { authorizedOrder, verifyOnChain } from '../../../../order-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!env.DB) return NextResponse.json({ error: 'Store is not configured.' }, { status: 503 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { claimSecret?: unknown; txHash?: unknown } | null;
  const order = await authorizedOrder(id, typeof body?.claimSecret === 'string' ? body.claimSecret : '');
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status === 'paid') return NextResponse.json({ status: 'paid' });
  const hash = body?.txHash;
  if (typeof hash !== 'string') return NextResponse.json({ error: 'Transaction hash required.' }, { status: 400 });
  try {
    const result = await verifyOnChain(order, hash);
    if (!result.ok) return NextResponse.json({ status: 'pending', reason: result.reason }, { status: 202 });
    // UNIQUE tx_hash prevents applying the same payment to two orders.
    await env.DB.prepare("UPDATE orders SET status='paid',tx_hash=?,paid_at=? WHERE id=? AND status='pending'")
      .bind(hash.toLowerCase(), Date.now(), id).run();
    return NextResponse.json({ status: 'paid' });
  } catch {
    return NextResponse.json({ status: 'pending', reason: 'Verification unavailable. Do not repay; retry this check.' }, { status: 202 });
  }
}
