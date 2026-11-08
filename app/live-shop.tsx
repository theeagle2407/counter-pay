'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Download, ShieldCheck } from 'lucide-react';
import { submitPayment } from './nimiq-wallet';

type Listing = {
  id: string; title: string; description: string; kind: string; amountLuna: number;
  editionLimit: number | null; claimed: number; pickupCity: string | null;
};
type Order = {
  id: string; listingId?: string; title?: string; claimSecret: string;
  recipient: string; amountLuna: number; network: string;
  status: 'free' | 'pending' | 'paid'; txHash?: string;
};
const historyKey = 'counter-orders-v2';
const oldKey = 'counter-pending-order-v1';

export default function LiveShop({
  view = 'shop', onOpenOrders, search = '', category = 'Everything', kind = 'all',
}: { view?: 'shop' | 'orders'; onOpenOrders?: () => void; search?: string; category?: string; kind?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const order = orders.find(item => item.id === selectedId) ?? orders[0] ?? null;

  useEffect(() => {
    fetch('/api/listings', { cache: 'no-store' }).then(r => r.json()).then(raw => {
      const data = raw as { listings?: Listing[] };
      if (Array.isArray(data.listings)) setListings(data.listings);
    }).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) || 'null') as Order[] | null;
      const legacy = JSON.parse(localStorage.getItem(oldKey) || 'null') as Order | null;
      const recovered = Array.isArray(saved) ? saved.filter(item => item && /^order_[0-9a-f]{32}$/.test(item.id)) : [];
      if (legacy && /^order_[0-9a-f]{32}$/.test(legacy.id) && !recovered.some(item => item.id === legacy.id)) recovered.unshift(legacy);
      setOrders(recovered);
      if (recovered[0]) setSelectedId(recovered[0].id);
      if (legacy) {
        localStorage.setItem(historyKey, JSON.stringify(recovered));
        localStorage.removeItem(oldKey);
      }
    } catch { /* Browser storage may be unavailable. */ }
  }, []);

  function saveOrder(next: Order) {
    const updated = [next, ...orders.filter(item => item.id !== next.id)];
    try { localStorage.setItem(historyKey, JSON.stringify(updated)); }
    catch { setMessage('Order saved for this session only. Browser storage is unavailable.'); }
    setOrders(updated);
    setSelectedId(next.id);
  }

  async function begin(listing: Listing) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const created = await response.json() as Order & { error?: string };
      if (!response.ok) throw new Error(created.error || 'Could not create order.');
      saveOrder({ ...created, listingId: listing.id, title: listing.title });
      if (created.status === 'free') {
        setListings(current => current.map(item => item.id === listing.id ? { ...item, claimed: item.claimed + 1 } : item));
        setMessage('Claimed. Find your download in My orders. No payment was made.');
      } else setMessage('Order created. Open My orders to complete payment.');
      onOpenOrders?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create order.'); }
    finally { setBusy(false); }
  }

  async function pay() {
    if (!order || order.status !== 'pending' || order.txHash) return;
    setBusy(true); setMessage('');
    try {
      const txHash = await submitPayment(order.recipient, order.amountLuna / 100_000, order.id);
      const next = { ...order, txHash };
      saveOrder(next);
      setMessage('Payment submitted. Waiting for chain finality; do not pay twice.');
      await verify(next);
    } catch (error) {
      setMessage(error instanceof Error ? `${error.message} If your wallet showed a payment, check that transaction before trying again.` : 'Could not open wallet payment.');
    } finally { setBusy(false); }
  }

  async function verify(current: Order) {
    if (!current.txHash) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/orders/${current.id}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimSecret: current.claimSecret, txHash: current.txHash }),
      });
      const result = await response.json() as { status?: string; reason?: string; error?: string };
      if (result.status === 'paid') {
        saveOrder({ ...current, status: 'paid' });
        setMessage('Payment verified. Download ready.');
      } else setMessage(result.reason || result.error || 'Not finalized yet. Check again shortly; do not pay twice.');
    } catch { setMessage('Verification unavailable. Do not pay twice.'); }
    finally { setBusy(false); }
  }

  async function receive() {
    if (!order || !['free', 'paid'].includes(order.status)) return;
    try {
      const response = await fetch(`/api/orders/${order.id}/download`, {
        method: 'POST', headers: { 'x-counter-claim': order.claimSecret },
      });
      if (!response.ok) throw new Error('Download unavailable. Retry from this order.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const name = response.headers.get('Content-Disposition')?.match(/filename="([^"\\]+)"/)?.[1];
      const link = document.createElement('a');
      link.href = url; link.download = name || 'counter-purchase'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Download unavailable.'); }
  }

  if (view === 'orders' && !orders.length) return <p className="live-message">No checkout orders on this device yet.</p>;
  if (view === 'shop') return <>
    {listings.filter(item =>
      kind !== 'pickup' &&
      (category === 'Everything' || category === 'Templates' || (category === 'Design' && item.title.startsWith('Invoice Studio')) || (category === 'Guides' && item.title.startsWith('Focus Planner'))) &&
      (item.title + ' ' + item.description).toLowerCase().includes(search.trim().toLowerCase())
    ).map(item => {
      const claimedHere = item.amountLuna === 0 && orders.some(saved => saved.listingId === item.id && saved.status === 'free');
      const soldOut = item.editionLimit !== null && item.claimed >= item.editionLimit;
      const weekend = item.title.startsWith('Weekend Notes');
      const photo = weekend
        ? 'photo-1506784365847-bbad939e9335'
        : item.title.startsWith('Invoice Studio')
          ? 'photo-1554224155-6726b3ff858f'
          : item.title.startsWith('Focus Planner')
            ? 'photo-1506784983877-45594efa4cbe'
            : null;
      return <article className="card live-product" key={item.id}>
        <div className="cover live-product-cover" aria-label={`${item.title} illustrative photograph`}>
          {photo ? <img className="live-product-photo" src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=960&q=82`} alt="" loading="lazy" referrerPolicy="no-referrer" /> :
            <div className="live-product-art"><span>COUNTER STUDIO / DIGITAL EDITION</span><strong>Made<br/><em>for you.</em></strong><span>DIGITAL DOWNLOAD</span></div>}
          <span className="badge"><Download size={11}/> Digital download</span>
        </div>
        <div className="maker"><span>Counter Studio</span><small>AVAILABLE</small></div>
        <h3 className="product-name">{item.title}</h3>
        <div className="price-row"><span>{item.editionLimit !== null ? `${Math.max(0, item.editionLimit - item.claimed)} left` : 'Digital'}</span><b>{item.amountLuna / 100_000} NIM</b></div>
        {claimedHere ? <button className="secondary live-product-button" onClick={onOpenOrders}>View order <ArrowRight size={16}/></button> :
          <button className="primary live-product-button" disabled={busy || soldOut} onClick={() => begin(item)}>{soldOut ? 'Sold out' : item.amountLuna ? 'Checkout' : 'Get it'} <ArrowRight size={16}/></button>}
        {message && <p className="live-message" role="status">{message}</p>}
      </article>;
    })}
  </>;

  return <section className="live-shop" aria-label="Saved orders">
    <>
      <div className="order-history">
        {orders.map(item => <button key={item.id} className={order?.id === item.id ? 'selected' : ''} onClick={() => { setSelectedId(item.id); setMessage(''); }}>
          <span><strong>{item.title || 'Digital order'}</strong><small>{item.status === 'paid' ? 'Paid' : item.status === 'free' ? 'Free edition' : item.txHash ? 'Confirming payment' : 'Awaiting payment'}</small></span>
          <b>{item.amountLuna / 100_000} NIM</b>
        </button>)}
      </div>
      {order && <div className="live-order" role="region" aria-label="Selected order">
        <ShieldCheck size={25}/><div><h3>{order.title || 'Digital order'}</h3><p>{order.status === 'free' ? 'Free edition · no payment made' : order.status === 'paid' ? 'Payment verified' : `${order.amountLuna / 100_000} NIM · ${order.txHash ? 'confirmation pending' : 'payment pending'}`}</p><p className="live-reference">Order {order.id}</p></div>
        {order.status === 'free' || order.status === 'paid' ?
          <button className="primary" onClick={receive}><Download size={16}/> Download</button> :
          order.txHash ? <button className="primary" disabled={busy} onClick={() => verify(order)}>{busy ? 'Checking…' : 'Check payment'}</button> :
          <button className="primary" disabled={busy} onClick={pay}>{busy ? 'Opening wallet…' : 'Pay in Nimiq Pay'}</button>}
      </div>}
      <p className="note">Orders are stored in this browser. Keep browser data until you have your files.</p>
    </>
    {message && <p className="live-message" role="status">{message}</p>}
  </section>;
}
