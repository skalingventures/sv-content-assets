// Shared signing for the contact form's anti-bot token.
// The page fetches a short-lived signed timestamp before submitting; the form
// handler rejects any post without a valid one. Bots that post straight to
// /api/contact (the bulk of form spam) never have it.
const crypto = require('crypto');

function secret() {
  const base = process.env.CONTACT_SECRET || process.env.RESEND_API_KEY || process.env.Resend_email || '';
  // Derived, never the raw key; rotating either env var invalidates old tokens.
  return crypto.createHash('sha256').update('sv-contact-token:' + base).digest();
}

function sign(ts) {
  return crypto.createHmac('sha256', secret()).update(String(ts)).digest('base64url');
}

function issue() {
  const ts = Date.now();
  return ts + '.' + sign(ts);
}

// Returns { ok, age } — age in ms since the token was issued.
function verify(tok) {
  const m = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(String(tok || ''));
  if (!m) return { ok: false, age: 0 };
  const expected = Buffer.from(sign(m[1]));
  const given = Buffer.from(m[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return { ok: false, age: 0 };
  return { ok: true, age: Date.now() - Number(m[1]) };
}

module.exports = { issue, verify };
