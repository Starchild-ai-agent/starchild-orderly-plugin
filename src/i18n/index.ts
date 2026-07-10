import en from "./locales/en.json";

/**
 * Default locale resources for the Starchild plugin.
 */
export const localeResources = {
  en,
} as const;

export type LocaleKeys = keyof typeof en;
