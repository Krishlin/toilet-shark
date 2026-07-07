// Booking endpoint for the Toilet Shark site (Netlify Functions format).
//
// Receives a JSON booking from book.html and emails the shop owner via Resend.
// Deliberately dependency-free: it calls the Resend REST API with the global
// fetch (Node 18+), so the site stays static with no node_modules / build step.
//
// Also pushes a phone notification via ntfy.sh (https://ntfy.sh) so a booking
// shows up on the shop owner's phone within seconds, not just in their inbox.
// ntfy needs no account or API key - it's a free pub/sub push service; the
// "topic" name is effectively the secret, so keep it hard to guess.
//
// Required environment variables (set in Netlify → Site configuration →
// Environment variables):
//   RESEND_API_KEY  Resend API key
//   BOOKING_TO      destination inbox(es), comma-separated for more than one
//   BOOKING_FROM    verified sender, e.g. "Toilet Shark <bookings@yourdomain>"
//   NTFY_TOPIC      ntfy.sh topic to push booking alerts to (optional - push
//                   is skipped if unset, email still sends)

const MAX_PHOTOS = 4;
// Keep the whole request comfortably under Netlify's 6 MB function payload limit.
const MAX_TOTAL_ATTACHMENT_BYTES = 4_000_000;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const { RESEND_API_KEY, BOOKING_TO, BOOKING_FROM, NTFY_TOPIC } = process.env;
  if (!RESEND_API_KEY || !BOOKING_TO || !BOOKING_FROM) {
    // Misconfiguration is on us, not the visitor - log it and fail cleanly.
    console.error("book: missing env config", {
      hasKey: Boolean(RESEND_API_KEY),
      hasTo: Boolean(BOOKING_TO),
      hasFrom: Boolean(BOOKING_FROM),
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Booking isn't configured yet." }),
    };
  }

  let body = event.body;
  if (event.isBase64Encoded && body) {
    body = Buffer.from(body, "base64").toString("utf8");
  }
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

  // A bot filled the hidden field - pretend success, send nothing.
  if (honeypot) return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  const missing = [];
  if (!name) missing.push("name");
  if (!phone) missing.push("phone");
  if (!address) missing.push("address");
  if (missing.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Missing required field(s): ${missing.join(", ")}` }),
    };
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
    subject: `New booking - ${name}, ${phone}`,
    html,
  };
  if (attachments.length) payload.attachments = attachments;

  // Push a phone alert best-effort - a failure here shouldn't fail the
  // booking, since the email above is the record of truth.
  if (NTFY_TOPIC) {
    const pushBody = [`${name} - ${phone}`, address, problem || "(no details given)"].join("\n");
    fetch(`https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Title: "New booking request",
        Tags: "wrench",
        "X-Click": `tel:${phone.replace(/[^\d+]/g, "")}`,
      },
      body: pushBody,
    }).catch((err) => console.error("book: ntfy push failed", err));
  }

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
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Couldn't send the booking right now." }),
      };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("book: fetch to resend failed", err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Couldn't reach the mail service." }),
    };
  }
};
