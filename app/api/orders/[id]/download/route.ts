import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { authorizedOrder } from '../../../../order-server';
import { decodeFile } from '../../../../file-content.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!env.DB) return NextResponse.json({ error: 'File storage unavailable.' }, { status: 503 });
  const { id } = await params;
  const order = await authorizedOrder(id, request.headers.get('x-counter-claim') ?? '');
  if (!order || (order.status !== 'paid' && order.status !== 'free')) return NextResponse.json({ error: 'Checkout required.' }, { status: 403 });
  const file = await env.DB.prepare('SELECT content_type AS contentType, content_base64 AS contentBase64 FROM product_files WHERE listing_id=?')
    .bind(order.listing_id).first<{ contentType: string; contentBase64: string }>();
  // Read existing local R2 uploads during migration; new hosted listings use D1 only.
  const legacy = !file && env.BUCKET ? await env.BUCKET.get(order.object_key) : null;
  if (!file && !legacy) return NextResponse.json({ error: 'File unavailable. Contact the seller.' }, { status: 503 });
  const bytes = file
    ? decodeFile(file.contentBase64)
    : new Uint8Array(await legacy!.arrayBuffer());
  const filename = order.original_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new Response(bytes, { headers: {
    'Content-Type': file?.contentType ?? legacy?.httpMetadata?.contentType ?? 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
