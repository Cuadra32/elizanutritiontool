const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var slug = (req.query.slug || '').replace(/[^a-z0-9-]/gi, '');
  if (!slug) return res.status(400).json({ error: 'Missing coach slug' });

  var filePath = path.join(process.cwd(), 'coaches', slug + '.json');

  try {
    var data = fs.readFileSync(filePath, 'utf8');
    res.status(200).json(JSON.parse(data));
  } catch (e) {
    res.status(404).json({ error: 'Coach not found' });
  }
};
