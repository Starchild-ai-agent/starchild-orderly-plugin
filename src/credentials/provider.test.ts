import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import {
  clearCredentialsProvider,
  createSdkCredentialsProvider,
  getCredentials,
  setCredentialsProvider,
} from "./provider";

const toPem = (spki: ArrayBuffer): string => {
  const bytes = new Uint8Array(spki);
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return `-----BEGIN PUBLIC KEY-----\n${btoa(binary)}\n-----END PUBLIC KEY-----`;
};

const generateRsaKeyPair = () =>
  crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

const decrypt = async (
  privateKey: CryptoKey,
  ciphertext: string,
): Promise<Uint8Array> => {
  const binary = atob(ciphertext);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, bytes),
  );
};

const request = (pubKey: string) => ({
  pubKey,
  nonce: "nonce-1",
  scope: "trade-only" as const,
});

const publicKeyPem = async (keyPair: CryptoKeyPair) =>
  toPem(await crypto.subtle.exportKey("spki", keyPair.publicKey));

/** Drops any provider registered by another test via public API only. */
const resetCredentialsProvider = () => {
  const provider = createSdkCredentialsProvider({
    keyStore: { getOrderlyKey: () => null },
    brokerId: "demo",
  });
  setCredentialsProvider(provider);
  clearCredentialsProvider(provider);
};

describe("createSdkCredentialsProvider", () => {
  it("seals the base58 ed25519 seed so only the RSA private key can open it", async () => {
    const keyPair = await generateRsaKeyPair();
    const seed = crypto.getRandomValues(new Uint8Array(32));

    const provider = createSdkCredentialsProvider({
      keyStore: { getOrderlyKey: () => ({ secretKey: bs58.encode(seed) }) },
      address: "0xdeadbeef",
      accountId: "0x1234567890abcdef1234567890abcdef12345678",
      brokerId: "demo",
      networkId: "testnet",
    });

    const result = await provider(request(await publicKeyPem(keyPair)));

    expect(result.accountId).toBe(
      "0x1234567890abcdef1234567890abcdef12345678",
    );
    expect(result.brokerId).toBe("demo");
    expect(result.networkId).toBe("testnet");
    expect(await decrypt(keyPair.privateKey, result.ciphertext)).toEqual(seed);
  });

  it("looks up the key for the connected address and fails without one", async () => {
    const keyPair = await generateRsaKeyPair();
    const addresses: Array<string | undefined> = [];

    const provider = createSdkCredentialsProvider({
      keyStore: {
        getOrderlyKey: (address) => {
          addresses.push(address);
          return null;
        },
      },
      address: "0xabc",
      accountId: "0x1",
      brokerId: "demo",
      networkId: "mainnet",
    });

    await expect(provider(request(await publicKeyPem(keyPair)))).rejects.toThrow(
      "No Orderly key found",
    );
    expect(addresses).toEqual(["0xabc"]);
  });

  it("rejects a secret key that is not 32 bytes", async () => {
    const keyPair = await generateRsaKeyPair();
    const provider = createSdkCredentialsProvider({
      keyStore: {
        getOrderlyKey: () => ({
          secretKey: bs58.encode(new Uint8Array(16)),
        }),
      },
      address: "0xabc",
      accountId: "0x1",
      brokerId: "demo",
      networkId: "mainnet",
    });

    await expect(provider(request(await publicKeyPem(keyPair)))).rejects.toThrow(
      "Unexpected Orderly secret key length: 16",
    );
  });

  it("requires a broker id", async () => {
    const keyPair = await generateRsaKeyPair();
    const provider = createSdkCredentialsProvider({
      keyStore: {
        getOrderlyKey: () => ({
          secretKey: bs58.encode(new Uint8Array(32)),
        }),
      },
      address: "0xabc",
      accountId: "0x1",
      brokerId: undefined,
      networkId: "mainnet",
    });

    await expect(provider(request(await publicKeyPem(keyPair)))).rejects.toThrow(
      "Orderly broker ID is not available.",
    );
  });

  it("requires a registered account id", async () => {
    const keyPair = await generateRsaKeyPair();
    const provider = createSdkCredentialsProvider({
      keyStore: {
        getOrderlyKey: () => ({
          secretKey: bs58.encode(new Uint8Array(32)),
        }),
      },
      address: "0xabc",
      accountId: undefined,
      brokerId: "demo",
      networkId: "mainnet",
    });

    await expect(provider(request(await publicKeyPem(keyPair)))).rejects.toThrow(
      "Orderly account is not registered yet.",
    );
  });
});

describe("credentials provider registry", () => {
  it("fails clearly when no bridge is mounted", async () => {
    resetCredentialsProvider();

    await expect(getCredentials(request("pem"))).rejects.toThrow(
      "Connect your wallet and finish Orderly account setup before authorizing.",
    );
  });

  it("keeps the current provider when a stale one is cleared", async () => {
    const stale = createSdkCredentialsProvider({
      keyStore: { getOrderlyKey: () => null },
      brokerId: "demo",
    });
    const current = createSdkCredentialsProvider({
      keyStore: { getOrderlyKey: () => null },
      brokerId: "demo",
    });

    setCredentialsProvider(current);
    clearCredentialsProvider(stale);
    // `current` is still installed, so the call reaches its own error path
    // instead of the "no bridge" error.
    await expect(getCredentials(request("pem"))).rejects.toThrow(
      "No Orderly key found",
    );

    clearCredentialsProvider(current);
    await expect(getCredentials(request("pem"))).rejects.toThrow(
      "Connect your wallet and finish Orderly account setup before authorizing.",
    );
  });
});
