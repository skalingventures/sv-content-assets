// Issues the short-lived signed token the contact form must carry. See api/_token.js.
const { issue } = require('./_token');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false });
  }
  return res.status(200).json({ ok: true, tok: issue() });
};
