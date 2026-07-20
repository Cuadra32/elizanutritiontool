const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tier } = req.body || {};
  const origin = req.headers.origin || req.headers.referer || 'https://nutritionworkout.app';
  const baseUrl = origin.replace(/\/$/, '');

  const prices = {
    basic: {
      name: 'Nutrition Plan — Basic',
      description: 'Custom macro calculation + 7-day meal plan as PDF',
      amount: 900,
      currency: 'chf',
    },
    complete: {
      name: 'Nutrition Plan — Complete',
      description: 'Nutrition + training plan — the full package',
      amount: 1900,
      currency: 'chf',
    },
  };

  const selected = prices[tier];
  if (!selected) return res.status(400).json({ error: 'Invalid tier. Use "basic" or "complete".' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: selected.currency,
            product_data: {
              name: selected.name,
              description: selected.description,
            },
            unit_amount: selected.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/tool.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${baseUrl}/#pricing`,
      metadata: { tier },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
