// Uploads reference images / design files to Vercel Blob and returns a URL.
// If Blob is not configured (no BLOB_READ_WRITE_TOKEN), returns 501 and the
// app silently falls back to the old base64-in-database storage.
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel request body limit is ~4.5 MB)

export async function POST(req) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "File storage not configured" }, { status: 501 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be under 4 MB" }, { status: 400 });
    }
    const { put } = await import("@vercel/blob");
    const safeName = String(file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`npc/${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
