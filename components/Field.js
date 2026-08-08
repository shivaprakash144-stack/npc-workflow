"use client";

import React from "react";

export function Field({ label, children, full }) {
  return (
    <div className={full ? "full" : ""}>
      <label className="f-label">{label}</label>
      {children}
    </div>
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o || "none"} value={o}>{o === "" ? "— Not set —" : o}</option>
      ))}
    </select>
  );
}

export function Text({ value, onChange, ...rest }) {
  return (
    <input className="text-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
  );
}

export function FileUpload({ label, value, onChange }) {
  const [busy, setBusy] = React.useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("File must be under 4 MB");
      return;
    }
    setBusy(true);
    // Prefer Vercel Blob (URL stored, keeps the database small).
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          onChange(data.url);
          setBusy(false);
          return;
        }
      }
    } catch {}
    // Fallback: base64 in the database (old behaviour, 2 MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert("File must be under 2 MB (cloud file storage is not configured)");
      setBusy(false);
      return;
    }
    const r = new FileReader();
    r.onload = () => { onChange(r.result); setBusy(false); };
    r.onerror = () => setBusy(false);
    r.readAsDataURL(file);
  }

  const v = value || "";
  const isImage = v.startsWith("data:image") || (/^https?:/.test(v) && /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(v));
  const isUrl = /^https?:/.test(v);
  const kept = v === "__KEEP__";
  return (
    <div>
      <label className="upload-box">
        <input type="file" accept="image/*,.pdf" onChange={pick} style={{ display: "none" }} />
        {busy ? (
          <span className="pill pill-gray">Uploading…</span>
        ) : value ? (
          isImage ? <img src={value} alt="" className="thumb" /> : <span className="pill pill-gray">{kept ? "Image on file" : isUrl ? "File attached" : "PDF attached"}</span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
        )}
        <span>{busy ? "Please wait" : value ? "Tap to replace" : label}</span>
        {value && (
          <button type="button" className="btn-ghost" style={{ marginLeft: "auto" }} onClick={(e) => { e.preventDefault(); onChange(""); }}>Remove</button>
        )}
      </label>
    </div>
  );
}

// Dropdown with an "Other" option that opens a text box for typing details.
export function SelectWithOther({ value, onChange, options, placeholder = "Type the details" }) {
  const OTHER = "Other";
  const opts = options.includes(OTHER) ? options : [...options, OTHER];
  const isCustom = value !== undefined && value !== null && value !== "" && !opts.includes(value);
  const [showOther, setShowOther] = React.useState(isCustom);

  React.useEffect(() => {
    if (isCustom) setShowOther(true);
  }, [isCustom]);

  return (
    <div>
      <select
        value={showOther ? OTHER : (value ?? "")}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setShowOther(true);
            onChange("");
          } else {
            setShowOther(false);
            onChange(v);
          }
        }}
      >
        {opts.map((o) => (
          <option key={o || "none"} value={o}>{o === "" ? "— Not set —" : o}</option>
        ))}
      </select>
      {showOther && (
        <input
          className="text-input"
          style={{ marginTop: 8 }}
          placeholder={placeholder}
          value={isCustom ? value : (value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// Checkbox multi-select: lets one customer order multiple products.
// Stores the selection as a comma-separated string ("Visiting Cards, Mug Printing").
// Ticking "Other" opens a comment box, same as the single dropdowns.
export function MultiSelect({ value, onChange, options, placeholder = "Tap to select" }) {
  const OTHER = "Other";
  const opts = options.filter((o) => o && o !== OTHER).slice().sort((a, b) => a.localeCompare(b));
  const selected = String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
  const customs = selected.filter((s) => !opts.includes(s));
  const standard = selected.filter((s) => opts.includes(s));

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [otherOn, setOtherOn] = React.useState(customs.length > 0);
  const [otherText, setOtherText] = React.useState(customs.join(", "));

  React.useEffect(() => {
    if (customs.length > 0) {
      setOtherOn(true);
      setOtherText(customs.join(", "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(nextStandard, nextOtherText, nextOtherOn) {
    const parts = [...nextStandard];
    const t = String(nextOtherText || "").trim();
    if (nextOtherOn && t) parts.push(t);
    onChange(parts.join(", "));
  }

  function toggle(o) {
    const next = standard.includes(o) ? standard.filter((x) => x !== o) : [...standard, o];
    emit(next, otherText, otherOn);
  }

  function toggleOther() {
    const next = !otherOn;
    setOtherOn(next);
    if (!next) {
      setOtherText("");
      emit(standard, "", false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        className="text-input"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: "pointer", minHeight: 42, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
      >
        {selected.length === 0 && <span style={{ opacity: 0.55 }}>{placeholder}</span>}
        {selected.map((s) => (
          <span key={s} className="pill pill-gray">{s}</span>
        ))}
        <span style={{ marginLeft: "auto", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute", zIndex: 40, left: 0, right: 0, marginTop: 6,
            background: "#fff", border: "1px solid var(--line)", borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)", padding: 10, maxHeight: 280, overflowY: "auto",
          }}
        >
          <input
            className="text-input"
            style={{ marginBottom: 6 }}
            placeholder="Type to search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {opts
            .filter((o) => {
              const q = search.trim().toLowerCase();
              return !q || o.toLowerCase().includes(q);
            })
            .sort((a, b) => {
              const q = search.trim().toLowerCase();
              if (!q) return 0;
              const as = a.toLowerCase().startsWith(q) ? 0 : 1;
              const bs = b.toLowerCase().startsWith(q) ? 0 : 1;
              return as - bs;
            })
            .map((o) => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", cursor: "pointer", fontSize: 14 }}>
              <input
                type="checkbox"
                style={{ width: 18, height: 18, accentColor: "var(--ink)" }}
                checked={standard.includes(o)}
                onChange={() => toggle(o)}
              />
              {o}
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", cursor: "pointer", fontSize: 14 }}>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, accentColor: "var(--ink)" }}
              checked={otherOn}
              onChange={toggleOther}
            />
            {OTHER}
          </label>
          {otherOn && (
            <input
              className="text-input"
              style={{ marginTop: 6 }}
              placeholder="Type the details"
              value={otherText}
              onChange={(e) => { setOtherText(e.target.value); emit(standard, e.target.value, true); }}
            />
          )}
          <button type="button" className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={() => setOpen(false)}>✓ Done</button>
        </div>
      )}
    </div>
  );
}
