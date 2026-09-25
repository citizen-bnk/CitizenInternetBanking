"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, guessCountry } from "./api";
import type { Overview } from "./types";

type Ctx = { data: Overview | null; error: string | null; refresh: () => Promise<void> };
const BankCtx = createContext<Ctx>({ data: null, error: null, refresh: async () => {} });

/** Loads the customer's overview once and shares it; pages call refresh() after any change. */
export function BankProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await api<Overview>(`/api/me?country=${guessCountry()}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your accounts.");
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (data) document.documentElement.setAttribute("data-theme", data.user.preferredTheme === "light" ? "light" : "dark");
  }, [data]);
  // Keep balances fresh when the tab regains focus.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);
  const value = useMemo(() => ({ data, error, refresh }), [data, error, refresh]);
  return <BankCtx.Provider value={value}>{children}</BankCtx.Provider>;
}

export const useBank = () => useContext(BankCtx);
