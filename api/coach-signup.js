const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'Cuadra32';
const REPO_NAME = 'elizanutritiontool';
const BRANCH = 'main';
const NOTIFY_EMAIL = 'elizaskander@yahoo.com';

function githubRequest(method, apiPath, body) {
  return new Promise(function (resolve, reject) {
    var data = body ? JSON.stringify(body) : null;
    var opts = {
      hostname: 'api.github.com',
      path: apiPath,
      method: method,
      headers: {
        'User-Agent': 'NutritionWorkout-Bot',
        Authorization: 'token ' + GITHUB_TOKEN,
        Accept: 'application/vnd.github.v3+json',
      },
    };
    if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    var req = https.request(opts, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        var text = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
        catch (e) { resolve({ status: res.statusCode, data: text }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server not configured for auto-signup' });
  }

  var b = req.body || {};
  var name = (b.name || '').trim();
  var email = (b.email || '').trim();
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  var slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'Invalid name' });

  var filePath = 'coaches/' + slug + '.json';

  var existing = await githubRequest('GET',
    '/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + filePath + '?ref=' + BRANCH);
  if (existing.status === 200) {
    return res.status(409).json({ error: 'A coach with this name already exists. Try a different name or contact us.', slug: slug });
  }

  var config = {
    slug: slug,
    name: name,
    tagline: b.tagline || 'Nutrition & Performance',
    location: b.location || '',
    email: email,
    website: (b.website || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    websiteUrl: b.website || '',
    color: b.color || '#2E7D32',
    colorDark: b.colorDark || '#1b5e20',
    colorLight: b.colorLight || '#e8f5e9',
    colorBg: b.colorBg || '#f0faf0',
    colorAccent: b.colorAccent || '#c8e6c9',
    colorBorder: b.colorBorder || '#a5d6a7',
    colorMid: b.colorMid || '#81c784',
    stripeAccountId: '',
    isOwner: false,
  };

  var content = Buffer.from(JSON.stringify(config, null, 2) + '\n').toString('base64');

  var commit = await githubRequest('PUT',
    '/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + filePath, {
      message: 'Add coach: ' + name,
      content: content,
      branch: BRANCH,
    });

  if (commit.status !== 201) {
    return res.status(500).json({ error: 'Failed to create coach profile. Please try again.' });
  }

  return res.status(201).json({
    success: true,
    slug: slug,
    url: 'https://nutritionworkout.app/c/' + slug,
  });
};
