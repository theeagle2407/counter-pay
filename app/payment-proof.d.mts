export function verifyPayment(
  tx: unknown,
  order: { network: string; recipient: string; amountLuna: number; reference: string },
  finalizedHeight: unknown,
): { ok: boolean; reason?: string };
