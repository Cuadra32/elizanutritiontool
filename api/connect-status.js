const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const accountId = req.query.account;
  if (!accountId) return res.status(400).json({ error: 'account parameter required' });

  try {
    const account = await stripe.accounts.retrieve(accountId);

    res.status(200).json({
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      email: account.email,
      business_name: account.business_profile?.name || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
