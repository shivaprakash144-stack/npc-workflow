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
  function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File must be under 2 MB");
      return;
    }
    const r = new FileReader();
    r.onload = () => onChange(r.result);
    r.readAsDataURL(file);
  }
  const isImage = (value || "").startsWith("data:image");
  return (
    <div>
      <label className="upload-box">
        <input type="file" accept="image/*,.pdf" onChange={pick} style={{ display: "none" }} />
        {value ? (
          isImage ? <img src={value} alt="" className="thumb" /> : <span className="pill pill-gray">PDF attached</span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
        )}
        <span>{value ? "Tap to replace" : label}</span>
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

// Checkbox multi-select: lets one customer order multiple products / work types.
// Stores the selection as a comma-separated string ("Visiting Cards, Mug Printing").
export function MultiSelect({ value, onChange, options, placeholder = "Tap to select", allowOther = true }) {
  const [open, setOpen] = React.useState(false);
  const [other, setOther] = React.useState("");
  const opts = options.filter((o) => o && o !== "Other");
  const selected = String(value || "").split(",").map((s) => s.trim()).filter(Boolean);

  function toggle(o) {
    const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
    onChange(next.join(", "));
  }
  function removeItem(o) {
    onChange(selected.filter((x) => x !== o).join(", "));
  }
  function addOther() {
    const t = other.trim();
    if (!t) return;
    if (!selected.includes(t)) onChange([...selected, t].join(", "));
    setOther("");
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
          <span key={s} className="pill pill-gray" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {s}
            <span
              role="button"
              aria-label={`Remove ${s}`}
              onClick={(e) => { e.stopPropagation(); removeItem(s); }}
              style={{ cursor: "pointer", fontWeight: 800 }}
            >×</span>
          </span>
        ))}
        <span style={{ marginLeft: "auto", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute", zIndex: 40, left: 0, right: 0, marginTop: 6,
            background: "#fff", border: "1px solid var(--line)", borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)", padding: 10, maxHeight: 260, overflowY: "auto",
          }}
        >
          {opts.map((o) => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", cursor: "pointer", fontSize: 14 }}>
              <input
                type="checkbox"
                style={{ width: 18, height: 18, accentColor: "var(--ink)" }}
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
              />
              {o}
            </label>
          ))}
          {allowOther && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                className="text-input"
                placeholder="Other — type and add"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
              />
              <button type="button" className="btn-ghost" onClick={addOther}>Add</button>
            </div>
          )}
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
