"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, guessCountry, ApiError } from "./api";
import type { Overview } from "./types";

type Ctx = { data: Overview | null; error: string | null; refresh: () => Promise<void> };
const BankCtx = createContext<Ctx>({ data: null, error: null, refresh: async () => {} });

/** Loads the customer's overview once and shares it; pages call refresh() after any change. */
export function BankProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Overview | null>(null);
  const [errorCode,setErrorCode]=useState<string|undefined>();
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await api<Overview>(`/api/me?country=${guessCountry()}`));
      setError(null);setErrorCode(undefined);
    } catch (e) {
      setErrorCode(e instanceof ApiError?e.code:undefined);
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
  return <BankCtx.Provider value={value}>{errorCode==='BANKING_ACCESS_REQUIRED'?<section role="alert" className="recovery" style={{maxWidth:560,margin:'10vh auto',padding:24}}><h1>Banking access is not available</h1><p>{error}</p><p>Issue: BANKING_ACCESS_REQUIRED</p><div style={{display:'flex',flexWrap:'wrap',gap:12}}><a href={process.env.NEXT_PUBLIC_HUB_URL||'https://hub.citizenbank.co.ls'}>Open Citizen Hub</a><button onClick={()=>window.history.back()}>Go back</button><a href={process.env.NEXT_PUBLIC_WEBSITE_URL||'https://citizenbank.co.ls'}>Citizen Bank website</a></div></section>:children}</BankCtx.Provider>;
}

export const useBank = () => useContext(BankCtx);
