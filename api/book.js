// Booking endpoint for the Toilet Shark site.
//
// Receives a JSON booking from book.html and emails the shop owner via Resend.
// Deliberately dependency-free: it calls the Resend REST API with the global
// fetch (Node 18+), so the site stays static with no node_modules / build step.
//
// Required environment variables (set in Vercel → Settings → Environment
// Variables, never committed — see .env.example):
//   RESEND_API_KEY  Resend API key
//   BOOKING_TO      destination inbox(es), comma-separated for more than one
//   BOOKING_FROM    verified sender, e.g. "Toilet Shark <bookings@yourdomain>"

const MAX_PHOTOS = 4;
// Keep the whole request comfortably under Vercel's 4.5 MB function body limit.
const MAX_TOTAL_ATTACHMENT_BYTES = 4_000_000;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { RESEND_API_KEY, BOOKING_TO, BOOKING_FROM } = process.env;
  if (!RESEND_API_KEY || !BOOKING_TO || !BOOKING_FROM) {
    // Misconfiguration is on us, not the visitor — log it and fail cleanly.
    console.error("book: missing env config", {
      hasKey: Boolean(RESEND_API_KEY),
      hasTo: Boolean(BOOKING_TO),
      hasFrom: Boolean(BOOKING_FROM),
    });
    return res.status(500).json({ error: "Booking isn't configured yet." });
  }

  // Vercel parses JSON bodies automatically, but guard against a string/empty body.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") body = {};

  const name = (body.name || "").toString().trim();
  const phone = (body.phone || "").toString().trim();
  const address = (body.address || "").toString().trim();
  const problem = (body.problem || "").toString().trim();
  const honeypot = (body.fax || "").toString().trim();

  // A bot filled the hidden field — pretend success, send nothing.
  if (honeypot) return res.status(200).json({ ok: true });

  const missing = [];
  if (!name) missing.push("name");
  if (!phone) missing.push("phone");
  if (!address) missing.push("address");
  if (missing.length) {
    return res
      .status(400)
      .json({ error: `Missing required field(s): ${missing.join(", ")}` });
  }

  // Attach the compressed photos the browser sent, staying within the byte budget.
  const attachments = [];
  let totalBytes = 0;
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];
  for (const photo of photos) {
    if (!photo || typeof photo.content !== "string") continue;
    const approxBytes = Math.floor(photo.content.length * 0.75); // base64 → bytes
    if (totalBytes + approxBytes > MAX_TOTAL_ATTACHMENT_BYTES) break;
    totalBytes += approxBytes;
    attachments.push({
      filename: (photo.filename || `photo-${attachments.length + 1}.jpg`)
        .toString()
        .slice(0, 100),
      content: photo.content,
    });
  }

  const html = `
    <div style="font-family:system-ui,'Segoe UI',Arial,sans-serif;font-size:15px;color:#0f0f14;line-height:1.5">
      <h2 style="margin:0 0 12px">New booking request</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr><td style="padding:4px 14px 4px 0;color:#666">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#666">Phone</td><td><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#666">Address</td><td>${escapeHtml(address)}</td></tr>
      </table>
      <p style="margin:14px 0 4px;color:#666">What's clogged</p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(problem) || "<em>(not provided)</em>"}</p>
      <p style="margin:16px 0 0;color:#999;font-size:13px">${attachments.length} photo(s) attached · sent from the booking form</p>
    </div>`;

  const payload = {
    from: BOOKING_FROM,
    to: BOOKING_TO.split(",").map((s) => s.trim()).filter(Boolean),
    subject: `New booking — ${name}, ${phone}`,
    html,
  };
  if (attachments.length) payload.attachments = attachments;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("book: resend error", resp.status, detail);
      return res.status(502).json({ error: "Couldn't send the booking right now." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("book: fetch to resend failed", err);
    return res.status(502).json({ error: "Couldn't reach the mail service." });
  }
};
