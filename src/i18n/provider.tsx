import React from "react";
import { useTranslation } from "@orderly.network/i18n";
import { localeResources } from "./index";

/**
 * Optional locale provider that registers Starchild plugin translations
 * with the Orderly i18n system.
 *
 * Wrap your app (or the relevant subtree) with this provider to enable
 * localized strings for the Starchild plugin UI.
 *
 * @example
 * ```tsx
 * <LocaleProvider>
 *   <App />
 * </LocaleProvider>
 * ```
 */
export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();

  // Register plugin locale resources on mount
  React.useEffect(() => {
    if (i18n?.addResourceBundle) {
      Object.entries(localeResources).forEach(([lang, resources]) => {
        i18n.addResourceBundle(lang, "translation", resources, true, true);
      });
    }
  }, [i18n]);

  return <>{children}</>;
};
