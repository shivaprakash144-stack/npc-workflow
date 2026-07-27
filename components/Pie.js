"use client";

// Simple SVG pie chart, no chart library.
export default function Pie({ data, size = 180 }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  if (!total) return <p className="muted">No jobs match the filters yet.</p>;

  const segs = [];
  let a0 = 0;
  const nonZero = data.filter((d) => d.count > 0);
  for (const d of nonZero) {
    const a1 = a0 + (d.count / total) * Math.PI * 2;
    segs.push({ ...d, a0, a1 });
    a0 = a1;
  }

  function path(s) {
    if (nonZero.length === 1) return null; // full circle handled separately
    const x0 = cx + r * Math.sin(s.a0), y0 = cy - r * Math.cos(s.a0);
    const x1 = cx + r * Math.sin(s.a1), y1 = cy - r * Math.cos(s.a1);
    const large = s.a1 - s.a0 > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  }

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Jobs by status">
        {nonZero.length === 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={nonZero[0].color} />
        ) : (
          segs.map((s) => <path key={s.label} d={path(s)} fill={s.color} stroke="#fff" strokeWidth="2" />)
        )}
      </svg>
      <div>
        {nonZero.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 13 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span className="muted">— {d.count} ({Math.round((d.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
