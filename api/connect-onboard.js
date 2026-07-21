const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { coach_slug, email, name } = req.body || {};
  if (!coach_slug || !email) return res.status(400).json({ error: 'coach_slug and email required' });

  const origin = req.headers.origin || req.headers.referer || 'https://nutritionworkout.app';
  const baseUrl = origin.replace(/\/$/, '');

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      business_profile: {
        name: name || coach_slug,
        product_description: 'Personalised nutrition and training plans',
      },
      metadata: { coach_slug },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard?coach=${coach_slug}&stripe=retry`,
      return_url: `${baseUrl}/dashboard?coach=${coach_slug}&stripe=success&account=${account.id}`,
      type: 'account_onboarding',
    });

    res.status(200).json({
      url: accountLink.url,
      accountId: account.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
