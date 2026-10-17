// Private-conversation form handler for skalingventures.com
// Sends each submission to the inbox via Resend. The destination address lives
// only here (server-side), never in the public page.
//
// Required env (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   Resend API key
// Optional:
//   CONTACT_TO       defaults to kjael@skalingventures.com
//   CONTACT_FROM     e.g. "Skaling Ventures <hello@skalingventures.com>" once the
//                    domain is verified in Resend; defaults to Resend's test sender

const ROLES = {
  founder: 'Founder considering a next chapter',
  operator: 'Operator',
  investor: 'Investor',
  other: 'Other'
};

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Native (no-JS) form posts get a branded page instead of raw JSON.
  const isJson = String(req.headers['content-type'] || '').includes('application/json');
  const done = (status, payload) => {
    if (isJson) return res.status(status).json(payload);
    res.statusCode = 303;
    res.setHeader('Location', payload.ok ? '/thanks' : '/talk-error');
    return res.end();
  };

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Bot traps: hidden field must stay empty; humans take more than ~3s to fill the form.
  if (clean(body.website, 200)) return done(200, { ok: true });
  // Timing check only applies to the JS path (native posts carry no timer).
  if (isJson && !(Number(body.t || 0) >= 3000)) return done(200, { ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const company = clean(body.company, 200);
  const roleKey = clean(body.role, 20);
  const message = String(body.message == null ? '' : body.message).slice(0, 2000).trim();
  const wantsDeck = body.deck === true || body.deck === 'on' || body.deck === 'true';

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !ROLES[roleKey]) {
    return done(400, { ok: false, error: 'invalid' });
  }

  const key = process.env.RESEND_API_KEY || process.env.Resend_email;
  if (!key) return done(503, { ok: false, error: 'not_configured' });

  const role = ROLES[roleKey];
  const to = process.env.CONTACT_TO || 'kjael@skalingventures.com';
  const from = process.env.CONTACT_FROM || 'Skaling Ventures <onboarding@resend.dev>';
  const subject = `[skalingventures.com] ${role}: ${name}${company ? ' · ' + company : ''}${wantsDeck ? ' (deck requested)' : ''}`;

  const lines = [
    ['Name', name], ['Email', email], ['Company', company || '—'], ['Describes them', role],
    ['Deck requested', wantsDeck ? 'Yes' : 'No'], ['What they’ve built', message || '—']
  ];
  const text = lines.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = '<table style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;border-collapse:collapse">' +
    lines.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5E5C58;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;color:#1F1F1F;white-space:pre-wrap">${esc(v)}</td></tr>`).join('') +
    '</table>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject, text, html })
    });
    if (!r.ok) {
      console.error('resend_failed', r.status, await r.text().catch(() => ''));
      return done(502, { ok: false, error: 'send_failed' });
    }
    return done(200, { ok: true });
  } catch (e) {
    console.error('resend_error', e && e.message);
    return done(502, { ok: false, error: 'send_failed' });
  }
};
