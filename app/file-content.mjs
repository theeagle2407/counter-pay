export const MAX_FILE_BYTES = 512 * 1024;

export function encodeFile(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 1 || bytes.length > MAX_FILE_BYTES)
    throw new Error('File must be between 1 byte and 512 KB.');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

export function decodeFile(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 700_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw new Error('Stored file is invalid.');
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  if (bytes.length < 1 || bytes.length > MAX_FILE_BYTES) throw new Error('Stored file is too large.');
  return bytes;
}
