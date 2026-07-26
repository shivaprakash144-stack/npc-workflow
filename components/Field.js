"use client";

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
