import type { OrderlySDK } from "@orderly.network/plugin-core";
import { describe, expect, it } from "vitest";
import { registerStarchildPlugin } from "./plugin";

const collectDescriptors = () => {
  const descriptors: any[] = [];
  const sdk = {
    registerPlugin: (descriptor: unknown) => descriptors.push(descriptor),
  };

  return { descriptors, sdk: sdk as unknown as OrderlySDK };
};

describe("registerStarchildPlugin", () => {
  it("registers the descriptor when called with no arguments", () => {
    const { descriptors, sdk } = collectDescriptors();

    registerStarchildPlugin()(sdk);

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0].id).toBe("starchild-ai-assistant");
    expect(descriptors[0].version).toBe("1.4.0");
    expect(descriptors[0].orderlyVersion).toBe(">=3.0.0");
    expect(descriptors[0].interceptors).toHaveLength(1);
    expect(descriptors[0].interceptors[0].target).toBe("Layout.MainMenus");
    expect(typeof descriptors[0].setup).toBe("function");
  });

  it("accepts an options object", () => {
    const { descriptors, sdk } = collectDescriptors();

    registerStarchildPlugin({ tradingAuthorization: false })(sdk);

    expect(descriptors).toHaveLength(1);
  });
});
