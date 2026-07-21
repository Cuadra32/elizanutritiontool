const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { session_id, coach } = req.query;
  if (!session_id) return res.status(400).json({ access: false, error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      var paidCoach = session.metadata.coach || '';

      if (coach && paidCoach && coach !== paidCoach) {
        return res.status(403).json({
          access: false,
          error: 'Payment was for a different coach',
          paidCoach: paidCoach,
        });
      }

      return res.status(200).json({
        access: true,
        tier: session.metadata.tier || 'basic',
        coach: paidCoach,
        customerName: session.customer_details?.name || '',
        customerEmail: session.customer_details?.email || '',
      });
    }

    return res.status(403).json({ access: false, error: 'Payment not completed' });
  } catch (err) {
    return res.status(400).json({ access: false, error: 'Invalid session' });
  }
};
