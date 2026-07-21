const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

const PLATFORM_FEE_PERCENT = 15;

function loadCoachConfig(slug) {
  if (!slug) return null;
  var safe = slug.replace(/[^a-z0-9-]/gi, '');
  try {
    var data = fs.readFileSync(path.join(process.cwd(), 'coaches', safe + '.json'), 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tier, coach } = req.body || {};
  const origin = req.headers.origin || req.headers.referer || 'https://nutritionworkout.app';
  const baseUrl = origin.replace(/\/$/, '');
  const coachParam = coach ? '&coach=' + encodeURIComponent(coach) : '';

  const prices = {
    basic: {
      name: 'Nutrition Plan — Basic',
      description: 'Custom macro calculation + 7-day meal plan as PDF',
      amount: 4999,
      currency: 'chf',
    },
    complete: {
      name: 'Nutrition Plan — Complete',
      description: 'Nutrition + training plan — the full package',
      amount: 6999,
      currency: 'chf',
    },
  };

  const selected = prices[tier];
  if (!selected) return res.status(400).json({ error: 'Invalid tier. Use "basic" or "complete".' });

  const coachConfig = loadCoachConfig(coach);

  try {
    var sessionParams = {
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
      success_url: `${baseUrl}/tool.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}${coachParam}`,
      cancel_url: `${baseUrl}/${coach ? '?coach=' + encodeURIComponent(coach) + '#pricing' : '#pricing'}`,
      metadata: { tier, coach: coach || '' },
    };

    if (coachConfig && coachConfig.stripeAccountId && !coachConfig.isOwner) {
      var fee = Math.round(selected.amount * PLATFORM_FEE_PERCENT / 100);
      sessionParams.payment_intent_data = {
        application_fee_amount: fee,
        transfer_data: {
          destination: coachConfig.stripeAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
