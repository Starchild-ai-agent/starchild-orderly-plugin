import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["cjs", "esm"],
  target: "es2020",
  platform: "browser",
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Only the host-provided modules stay external (resolved by the Orderly One
  // import map). Everything else must be bundled into the runtime plugin, or
  // the marketplace rejects it at install time.
  external: ["react", "react-dom", /^@orderly\.network\/.*/],
  noExternal: ["bs58"],
  env: {
    NODE_ENV: "production",
  },
  treeshake: true,
  minify: false,
});
