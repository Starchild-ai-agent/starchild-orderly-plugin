import bs58 from "bs58";
import type {
  OrderlyCredentialsRequest,
  OrderlyCredentialsResult,
} from "../types/plugin";
import { encryptOrderlySecretKey } from "./crypto";

export type StarchildCredentialsProvider = (
  req: OrderlyCredentialsRequest,
) => Promise<OrderlyCredentialsResult>;

/**
 * The ChatPanel runs in its own React root (mounted by `setup()` outside
 * `OrderlyAppProvider`), so it cannot call SDK hooks directly. `CredentialsBridge`
 * renders inside the provider tree and registers a provider here, which
 * `getCredentials` delegates to when the panel requests authorization.
 */
let currentProvider: StarchildCredentialsProvider | null = null;

export const setCredentialsProvider = (
  provider: StarchildCredentialsProvider,
): void => {
  currentProvider = provider;
};

export const clearCredentialsProvider = (
  provider: StarchildCredentialsProvider,
): void => {
  if (currentProvider === provider) {
    currentProvider = null;
  }
};

/** Plugin-facing getter: always rejects (never throws synchronously) when no bridge is mounted. */
export const getCredentials: StarchildCredentialsProvider = async (req) => {
  if (!currentProvider) {
    throw new Error(
      "Connect your wallet and finish Orderly account setup before authorizing.",
    );
  }

  return currentProvider(req);
};

export type OrderlyKeyReader = {
  getOrderlyKey: (address?: string) => { secretKey: string } | null;
};

export type SdkCredentialsOptions = {
  keyStore: OrderlyKeyReader;
  address?: string;
  accountId?: string;
  brokerId?: string;
  networkId?: "mainnet" | "testnet";
};

/** Builds a provider from live SDK state (key store + account + config). */
export const createSdkCredentialsProvider = (
  options: SdkCredentialsOptions,
): StarchildCredentialsProvider => {
  const { keyStore, address, accountId, brokerId, networkId } = options;

  return async (req) => {
    if (!brokerId) {
      throw new Error("Orderly broker ID is not available.");
    }

    const keyPair = keyStore.getOrderlyKey(address);

    if (!keyPair) {
      throw new Error(
        "No Orderly key found. Connect your wallet and enable trading first.",
      );
    }

    if (!accountId) {
      throw new Error("Orderly account is not registered yet.");
    }

    const secretKey = bs58.decode(keyPair.secretKey);

    if (secretKey.length !== 32) {
      throw new Error(
        `Unexpected Orderly secret key length: ${secretKey.length}`,
      );
    }

    return {
      ciphertext: await encryptOrderlySecretKey(req.pubKey, secretKey),
      accountId,
      brokerId,
      networkId,
    };
  };
};
