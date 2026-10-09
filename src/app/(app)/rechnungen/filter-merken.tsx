"use client";

import { useEffect } from "react";

/** Merkt die aktuelle Filterauswahl (Cookie), damit „Rechnungen“ beim Zurückkehren dort weitermacht. */
export function FilterMerken({ query }: { query: string }) {
  useEffect(() => {
    document.cookie = `rg-filter=${encodeURIComponent(query)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  }, [query]);
  return null;
}
