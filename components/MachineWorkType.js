"use client";

import React from "react";
import { Field, SelectWithOther, MultiSelect } from "@/components/Field";
import { MACHINE_TYPES, workTypesForMachine } from "@/lib/machines";
import { WORK_TYPES } from "@/lib/options";

function parseList(s) {
  return String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
}

// Rebuilds the row UI from the two flat comma-separated strings stored in the
// database (machine_type, work_type). Each named machine "claims" the work
// types from its own mapped list out of the saved work_type value; anything
// left over (legacy data, or an "Other" machine's custom work types) is kept
// on the first unmapped row so nothing already saved is ever lost.
function buildRows(machineStr, workTypeStr) {
  const machines = parseList(machineStr);
  let pool = parseList(workTypeStr);
  const rows = machines.map((m) => {
    const mapped = workTypesForMachine(m);
    if (mapped.length) {
      const mine = pool.filter((w) => mapped.includes(w));
      pool = pool.filter((w) => !mapped.includes(w));
      return { machine: m, workTypes: mine };
    }
    return { machine: m, workTypes: [] };
  });
  if (pool.length) {
    const lastUnmapped = [...rows].reverse().find((r) => !workTypesForMachine(r.machine).length);
    if (lastUnmapped) lastUnmapped.workTypes.push(...pool);
    else rows.push({ machine: rows.length ? "Other" : "", workTypes: pool });
  }
  if (rows.length === 0) rows.push({ machine: "", workTypes: [] });
  return rows;
}

function emitChange(rows, onChange) {
  const machineStr = rows.map((r) => r.machine).filter(Boolean).join(", ");
  const seen = new Set();
  const workTypeStr = rows
    .flatMap((r) => r.workTypes)
    .filter((w) => w && !seen.has(w) && seen.add(w))
    .join(", ");
  onChange(machineStr, workTypeStr);
}

// Repeatable "Machine type → Work type" rows. Picking a named machine
// filters Work type down to just that machine's mapped options; picking
// "Other" (or typing a custom machine name) leaves Work type unrestricted.
export default function MachineWorkType({ machineValue, workTypeValue, onChange }) {
  const [rows, setRows] = React.useState(() => buildRows(machineValue, workTypeValue));

  function update(next) {
    setRows(next);
    emitChange(next, onChange);
  }

  function setMachine(i, m) {
    update(rows.map((r, idx) => (idx === i ? { machine: m, workTypes: [] } : r)));
  }
  function setWorkTypes(i, wtStr) {
    update(rows.map((r, idx) => (idx === i ? { ...r, workTypes: parseList(wtStr) } : r)));
  }
  function addRow() {
    update([...rows, { machine: "", workTypes: [] }]);
  }
  function removeRow(i) {
    const next = rows.filter((_, idx) => idx !== i);
    update(next.length ? next : [{ machine: "", workTypes: [] }]);
  }

  return (
    <div>
      {rows.map((row, i) => {
        const mappedOptions = workTypesForMachine(row.machine);
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
              <Field label={`Machine type${rows.length > 1 ? ` #${i + 1}` : ""}`}>
                <SelectWithOther
                  value={row.machine}
                  onChange={(v) => setMachine(i, v)}
                  options={["", ...MACHINE_TYPES.filter((m) => m !== "Other")]}
                  placeholder="Type the machine name"
                />
              </Field>
              <Field label="Work type">
                {row.machine ? (
                  <MultiSelect
                    value={row.workTypes.join(", ")}
                    onChange={(v) => setWorkTypes(i, v)}
                    options={isMapped ? mappedOptions : WORK_TYPES}
                    allowOther
                    placeholder="Tap to select work types"
                  />
                ) : (
                  <p className="muted" style={{ marginTop: 10 }}>Select a machine first</p>
                )}
              </Field>
            </div>
            {rows.length > 1 && (
              <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => removeRow(i)}>
                Remove this machine
              </button>
            )}
          </div>
        );
      })}
      <button type="button" className="btn-ghost" onClick={addRow}>+ Add another machine</button>
    </div>
  );
}
