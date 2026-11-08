import { getHostNetwork, init, NimiqProviderError } from '@nimiq/mini-app-sdk';
import { isValidNimiqAddress } from './nimiq-address.mjs';

export type WalletStatus =
  | { state: 'outside-host'; message: string }
  | { state: 'ready'; network: 'mainnet' | 'testnet'; blockNumber: number }
  | { state: 'unavailable'; message: string };

// Checking readiness never requests accounts or prompts for a payment.
export async function checkWallet(): Promise<WalletStatus> {
  if (typeof window === 'undefined' || !('nimiqPay' in window))
    return { state: 'outside-host', message: 'Open Counter inside Nimiq Pay to use wallet checkout.' };
  try {
    const provider = await init({ timeout: 10_000 });
    if (!(await provider.isConsensusEstablished()))
      return { state: 'unavailable', message: 'Nimiq is still connecting. Try again shortly.' };
    const network = getHostNetwork();
    if (network !== 'mainnet' && network !== 'testnet')
      return { state: 'unavailable', message: 'Could not determine the wallet network. No payment can be started.' };
    return { state: 'ready', network, blockNumber: await provider.getBlockNumber() };
  } catch (error) {
    return { state: 'unavailable', message: NimiqProviderError.is(error) ? error.message : 'Wallet connection is unavailable.' };
  }
}

export function nimToLuna(amount: number): number {
  const value = Math.round(amount * 100_000);
  if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(value) || Math.abs(value / 100_000 - amount) > 1e-8)
    throw new Error('Enter an amount in NIM with at most five decimal places.');
  return value;
}

// A returned hash is only a submission receipt. The server must independently
// verify network, recipient, exact amount, order reference and finality before
// releasing a product or issuing a pickup pass.
export async function submitPayment(recipient: string, amountNim: number, orderReference: string): Promise<string> {
  if (!isValidNimiqAddress(recipient)) throw new Error('Seller payout address is missing or invalid.');
  if (!/^[A-Za-z0-9_-]{8,48}$/.test(orderReference)) throw new Error('Order reference is invalid.');
  const provider = await init({ timeout: 10_000 });
  if (!(await provider.isConsensusEstablished())) throw new Error('Network consensus is not ready.');
  if (getHostNetwork() !== 'mainnet') throw new Error('Checkout requires Nimiq Pay mainnet.');
  return provider.sendBasicTransactionWithData({ recipient, value: nimToLuna(amountNim), data: `COUNTER:${orderReference}` });
}
