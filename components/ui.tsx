"use client";

import Icon from "./Icon";

export function Orb({ state = "idle", onClick, size }: { state?: "idle" | "busy" | "listening" | "speaking"; onClick?: () => void; size?: number }) {
  const bars = [14, 26, 18, 38, 22, 44, 30, 20, 36, 16, 28, 12];
  return (
    <div className={`orb-wrap ${state}`} onClick={onClick} role={onClick ? "button" : undefined} aria-label={onClick ? "Talk to Citizen AI" : undefined}
      style={size ? { width: size } : undefined}>
      <div className="wave l">{bars.map((h, i) => <i key={i} style={{ ["--h" as string]: `${h}px`, animationDelay: `${i * 0.07}s` }} />)}</div>
      <div className="wave r">{bars.slice().reverse().map((h, i) => <i key={i} style={{ ["--h" as string]: `${h}px`, animationDelay: `${i * 0.07}s` }} />)}</div>
      <div className="ring r2" />
      <div className="dots" />
      <div className="ring" />
      <div className="glow" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Citizen AI" />
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ flex: 1 }}>{title}</h2>
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHead({ title, sub, back, actions }: { title: string; sub?: string; back?: () => void; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      {back && <button className="icon-btn" onClick={back} aria-label="Back"><Icon name="back" size={18} /></button>}
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Skeleton({ h = 60, style }: { h?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, ...style }} />;
}

export function SecureNote() {
  return <div className="secure-note"><Icon name="lock" size={14} /> Bank-grade security · Citizen AI uses an AI-generated voice</div>;
}
