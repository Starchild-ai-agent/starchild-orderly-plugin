/**
 * RSA-OAEP sealing of the Orderly ed25519 secret key.
 *
 * The Starchild backend owns a long-lived RSA keypair. It sends the public key
 * to the host page; the host seals the 32-byte Orderly secret key with it.
 * The plaintext secret key only ever exists inside this module's call stack.
 */

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
};

/** Encrypts the raw 32-byte ed25519 seed with `pubKey` (RSA-OAEP SHA-256). */
export const encryptOrderlySecretKey = async (
  pubKey: string,
  secretKey: Uint8Array,
): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(pubKey),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    new Uint8Array(secretKey),
  );

  return toBase64(new Uint8Array(encrypted));
};
