"use client";

import React from "react";
import { Field, SelectWithOther, MultiSelect } from "@/components/Field";
import { PRODUCT_CATEGORIES, productTypesForCategory } from "@/lib/products";
import { PRODUCT_TYPES } from "@/lib/options";

function parseList(s) {
  return String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
}

// Rebuilds the row UI from the two flat comma-separated strings stored in the
// database (product_category, product_type). Each named category "claims"
// the product types from its own mapped list out of the saved product_type
// value; anything left over (legacy data, or an "Other" category's custom
// types) is kept on the first unmapped row so nothing already saved is lost.
function buildRows(categoryStr, typeStr) {
  const categories = parseList(categoryStr);
  let pool = parseList(typeStr);
  const rows = categories.map((c) => {
    const mapped = productTypesForCategory(c);
    if (mapped.length) {
      const mine = pool.filter((t) => mapped.includes(t));
      pool = pool.filter((t) => !mapped.includes(t));
      return { category: c, types: mine };
    }
    return { category: c, types: [] };
  });
  if (pool.length) {
    const lastUnmapped = [...rows].reverse().find((r) => !productTypesForCategory(r.category).length);
    if (lastUnmapped) lastUnmapped.types.push(...pool);
    else rows.push({ category: rows.length ? "Other" : "", types: pool });
  }
  if (rows.length === 0) rows.push({ category: "", types: [] });
  return rows;
}

function emitChange(rows, onChange) {
  const categoryStr = rows.map((r) => r.category).filter(Boolean).join(", ");
  const seen = new Set();
  const typeStr = rows
    .flatMap((r) => r.types)
    .filter((t) => t && !seen.has(t) && seen.add(t))
    .join(", ");
  onChange(categoryStr, typeStr);
}

// Repeatable "Product category → Product type" rows. Picking a named
// category filters Product type down to just that category's mapped
// options; picking "Other" (or typing a custom category name) leaves
// Product type unrestricted. An "Other" checkbox is always available on
// Product type too, so a specific item can be typed in even under a
// mapped category.
export default function ProductCategoryType({ categoryValue, typeValue, onChange }) {
  const [rows, setRows] = React.useState(() => buildRows(categoryValue, typeValue));

  function update(next) {
    setRows(next);
    emitChange(next, onChange);
  }

  function setCategory(i, c) {
    update(rows.map((r, idx) => (idx === i ? { category: c, types: [] } : r)));
  }
  function setTypes(i, tStr) {
    update(rows.map((r, idx) => (idx === i ? { ...r, types: parseList(tStr) } : r)));
  }
  function addRow() {
    update([...rows, { category: "", types: [] }]);
  }
  function removeRow(i) {
    const next = rows.filter((_, idx) => idx !== i);
    update(next.length ? next : [{ category: "", types: [] }]);
  }

  return (
    <div>
      {rows.map((row, i) => {
        const mappedOptions = productTypesForCategory(row.category);
        const isMapped = mappedOptions.length > 0;
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom: i < rows.length - 1 ? "1px dashed var(--line)" : "none",
            }}
          >
            <div className="form-grid">
              <Field label={`Product category${rows.length > 1 ? ` #${i + 1}` : ""}`}>
                <SelectWithOther
                  value={row.category}
                  onChange={(v) => setCategory(i, v)}
                  options={["", ...PRODUCT_CATEGORIES.filter((c) => c !== "Other")]}
                  placeholder="Type the category name"
                />
              </Field>
              <Field label="Product type">
                {row.category ? (
                  <MultiSelect
                    value={row.types.join(", ")}
                    onChange={(v) => setTypes(i, v)}
                    options={isMapped ? mappedOptions : PRODUCT_TYPES}
                    allowOther
                    placeholder="Tap to select products"
                  />
                ) : (
                  <p className="muted" style={{ marginTop: 10 }}>Select a category first</p>
                )}
              </Field>
            </div>
            {rows.length > 1 && (
              <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => removeRow(i)}>
                Remove this category
              </button>
            )}
          </div>
        );
      })}
      <button type="button" className="btn-ghost" onClick={addRow}>+ Add another category</button>
    </div>
  );
}
