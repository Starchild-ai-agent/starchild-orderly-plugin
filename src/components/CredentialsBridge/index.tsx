import { FC, useEffect } from "react";
import { useAccount, useConfig, useKeyStore } from "@orderly.network/hooks";
import {
  clearCredentialsProvider,
  createSdkCredentialsProvider,
  setCredentialsProvider,
} from "../../credentials/provider";

export type CredentialsBridgeProps = {
  /** Optional override for hosts whose config store lacks `brokerId`. */
  brokerId?: string;
  /** Optional override for hosts whose config store lacks `networkId`. */
  networkId?: "mainnet" | "testnet";
};

/**
 * Headless component rendered by the plugin inside `OrderlyAppProvider`
 * (next to the AssistantButton). It publishes the connected account's Orderly
 * key to the credentials module, which the ChatPanel then uses for one-click
 * trading authorization.
 */
export const CredentialsBridge: FC<CredentialsBridgeProps> = ({
  brokerId: brokerIdOverride,
  networkId: networkIdOverride,
}) => {
  const keyStore = useKeyStore();
  const { state } = useAccount();
  const configBrokerId = useConfig("brokerId");
  const configNetworkId = useConfig<"mainnet" | "testnet">("networkId");

  const address = state.address;
  const accountId = state.accountId;
  const brokerId = brokerIdOverride ?? configBrokerId;
  const networkId = networkIdOverride ?? configNetworkId;

  useEffect(() => {
    const provider = createSdkCredentialsProvider({
      keyStore,
      address,
      accountId,
      brokerId,
      networkId,
    });
    setCredentialsProvider(provider);

    return () => clearCredentialsProvider(provider);
  }, [keyStore, address, accountId, brokerId, networkId]);

  return null;
};
