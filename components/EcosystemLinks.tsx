"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

const website = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizenbank.co.ls").replace(/\/$/, "");
const hub = (process.env.NEXT_PUBLIC_HUB_URL || "https://hub.citizenbank.co.ls").replace(/\/$/, "");
const staffRoles = new Set(["super_admin", "admin", "staff", "back_office"]);

export default function EcosystemLinks() {
  const [canOpenHub, setCanOpenHub] = useState(false);
  const [accessError, setAccessError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error("Access check unavailable");
        const profile = await response.json();
        if (active) {
          setCanOpenHub(profile?.linked === true && Array.isArray(profile.roles) && profile.roles.some((role: string) => staffRoles.has(role)));
          setAccessError(false);
        }
      } catch { if (active) { setCanOpenHub(false); setAccessError(true); } }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [attempt]);
  return <>
    <div className="nav-sep" />
    {canOpenHub && <a href={hub} title="Citizen Hub — Back Office"><Icon name="shield" /><span className="label">Hub / Back Office</span></a>}
    {accessError && <button type="button" className="mode-switch" onClick={() => setAttempt(value => value + 1)} title="Staff access could not be checked. Retry."><Icon name="shield" /><span className="label">Retry menu access</span></button>}
    <a href={`${website}/enter-app`} title="Open mobile app"><Icon name="phone" /><span className="label">Mobile app</span></a>
    <a href={website} title="Citizen Bank website"><Icon name="globe" /><span className="label">Website</span></a>
  </>;
}
