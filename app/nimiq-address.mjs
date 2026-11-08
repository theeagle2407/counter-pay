// Nimiq user-friendly addresses use an IBAN-style mod-97 checksum.
// Format validation is not proof that a wallet belongs to a seller.
export function isValidNimiqAddress(input) {
  if (typeof input !== 'string') return false;
  const address = input.replace(/\s/g, '').toUpperCase();
  if (!/^NQ[0-9]{2}[0-9A-HJ-NP-VX-Y]{32}$/.test(address)) return false;
  const rearranged = address.slice(4) + address.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = char >= 'A' ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
