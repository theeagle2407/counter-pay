# Counter

### Made by people. Picked by you.

[Open Counter in Nimiq Pay](https://counter-pay.theeagle2407.workers.dev) · [Browse the live catalogue](https://counter-pay.theeagle2407.workers.dev/api/listings) · [Nimiq Mini Apps documentation](https://nimiq.dev/mini-apps)

Counter is a small shop inside Nimiq Pay. A buyer finds a useful digital product, approves a NIM payment in their own wallet, and downloads the file after the payment is independently verified on Nimiq mainnet. The maker receives NIM directly at their payout address.

Built for the **Pay** category of the Nimiq Mini Apps Competition, Cycle III.

## Try the complete flow

1. Open the live URL inside **Nimiq Pay**. The three live downloads—**Weekend Notes**, **Invoice Studio**, and **Focus Planner**—cost **1 NIM** each.
2. Choose a product and start checkout. Counter creates an order with a unique reference and shows the exact amount and recipient.
3. Approve the payment in Nimiq Pay's native wallet confirmation. Counter never handles your private key.
4. Wait for **Payment verified**, then open **My orders** and download the file. If network verification is temporarily unavailable, retry the check on the same order; **do not pay again**.

The product pages can be browsed in a normal browser; wallet checkout needs the Nimiq Pay host on **mainnet**. This is a real-money checkout, not a simulated transaction. Only pay if you want the product.

## What is live

| Capability | Status |
| --- | --- |
| Nimiq Pay wallet checkout | Live, native NIM payment approval |
| Paid digital delivery | Live, unlocks after verified mainnet payment |
| Products | Three downloadable, functional HTML products at 1 NIM each |
| Order recovery | Claim held by the originating browser; see limitation below |
| Seller publishing | Curated/admin-only, not public self-service |
| Physical pickup | Not live; no pickup purchase is offered |

We completed an end-to-end **1 NIM Weekend Notes purchase** in Nimiq Pay: the order was marked paid after onchain verification, the seller wallet received NIM, and the download opened. The other two products are published and downloadable through the same checkout, but this statement does not claim independent purchases of each.

## Why verification matters

A wallet-returned hash proves only that a transaction was submitted. Counter checks the transaction server-side before fulfilling an order:

- Nimiq **mainnet** (`networkId: 24`) and an exact transaction-hash match;
- the seller payout address and **exact amount** in luna;
- recipient data equal to `COUNTER:<unique order ID>`;
- successful execution and inclusion at or before the last finalized macro block.

The hash is unique across orders in the database, preventing one payment from being applied twice. The paid download endpoint requires the order's unguessable claim secret; the database stores its SHA-256 hash, not the secret itself. A payment failure or unavailable RPC does not unlock the product.

```text
Product → order + reference → Nimiq Pay approval → mainnet verification → download
```

Relevant source: [`app/nimiq-wallet.ts`](app/nimiq-wallet.ts), [`app/payment-proof.mjs`](app/payment-proof.mjs), [`app/order-server.ts`](app/order-server.ts), and [`app/api/orders`](app/api/orders).

## Architecture

Counter is a Next.js/React Mini App built with the Nimiq Mini App SDK. The storefront runs in Nimiq Pay's WebView and asks the injected provider to initiate a NIM transaction. The host wallet displays the approval dialog. A Cloudflare Worker serves the app and APIs; Cloudflare D1 stores listings, files, and orders. Server-side JSON-RPC reads independently check chain state before the download route releases a file. Files are stored in D1; **R2 is not required**.

The seller setup endpoint is protected by a Worker secret and used only for the curated catalogue. The admin secret and RPC endpoint are deployment settings, never browser-side code. A normal visitor cannot create a listing by opening the public UI.

## Run locally

Requirements: Node.js 22+, pnpm, and a Cloudflare-compatible local D1 environment. Copy the repo and install dependencies:

```bash
pnpm install --frozen-lockfile
node --test tests/*.test.mjs
pnpm exec vite --config vite.config.counter.ts --host 127.0.0.1 --port 5173
```

The local app is at `http://127.0.0.1:5173`. A phone on the same network can reach a LAN-bound development server, but Nimiq Pay may require a public HTTPS URL to recognize a Mini App. The hosted deployment is the recommended way to test wallet checkout. Never use the public mainnet flow as a test-payment faucet.

For a fresh Cloudflare deployment, create a D1 database, substitute its ID into [`wrangler.counter.jsonc`](wrangler.counter.jsonc), run the migrations in [`drizzle/`](drizzle/), then set `COUNTER_ADMIN_SECRET` and `COUNTER_NIMIQ_RPC_URL` as Worker secrets. Build with `pnpm exec vite build --config vite.config.counter.ts` and deploy the generated Worker with `pnpm exec wrangler deploy --config dist/server/wrangler.json`. Set a valid Nimiq payout address when publishing products. No credentials are included in this repository.

## Tests

```bash
node --test tests/*.test.mjs
pnpm exec vite build --config vite.config.counter.ts
```

The tests cover Nimiq address validation, payment proof rejection cases (wrong network, recipient, amount, order reference, failed execution, and lack of finality), local file encoding, and the live-catalogue presentation. A passing unit test does **not** substitute for a real purchase; the live 1 NIM path above was exercised separately.

## Current boundaries

- Downloads are tied to a claim secret held on the buyer's device. Cross-device recovery, customer accounts, refunds, and chargeback handling are not yet provided. Save the downloaded file and retain access to the purchasing browser.
- Seller onboarding and cataloguing are curated. This is not yet a self-service multi-seller marketplace.
- Physical pickup, delivery coordination, and pickup passes are not available in the deployed flow.
- The catalogue images are illustrative; the actual purchased products are the downloadable HTML files. Product images are loaded from Unsplash; see their [license](https://unsplash.com/license).

## Built with

[Nimiq Mini App SDK](https://nimiq.dev/mini-apps) · Nimiq Pay · Nimiq mainnet JSON-RPC · Next.js/React · vinext/Vite · Cloudflare Workers · D1

## License

MIT; see [LICENSE](LICENSE). Third-party dependencies and image assets retain their own licenses.
