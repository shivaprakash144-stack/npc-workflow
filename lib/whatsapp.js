// WhatsApp Cloud API (Meta) — automatic "order ready" message.
// If the env variables are not set, the app silently skips auto-send
// and staff use the tap-to-send buttons instead. Nothing breaks.

export function waConfigured() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Sends the approved template. Returns { ok, detail }.
export async function sendOrderReadyWhatsApp({ mobile, customerName, jobId, product }) {
  if (!waConfigured()) return { ok: false, skipped: true };
  const phone10 = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (phone10.length !== 10) return { ok: false, detail: "invalid mobile" };

  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: "91" + phone10,
    type: "template",
    template: {
      name: process.env.WHATSAPP_TEMPLATE || "order_ready",
      language: { code: process.env.WHATSAPP_LANG || "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: String(customerName || "Customer").slice(0, 60) },
            { type: "text", text: String(jobId || "") },
            { type: "text", text: String(product || "your order").slice(0, 60) },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.messages) return { ok: true };
    return { ok: false, detail: data?.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}
