#!/usr/bin/env node
// One-shot, idempotent setup of the Cloudflare Access door for sonwork.org.
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/setup-access.mjs
// Token needs: Access: Apps and Policies (Edit), Access: Organizations (Edit), Zone (Read).
//
// Layout (most specific first; Access matches the longest path):
//   sonwork.org/p           bypass   public reports
//   sonwork.org/_astro      bypass   built assets (public pages need CSS)
//   sonwork.org/favicon.svg bypass
//   sonwork.org/robots.txt  bypass
//   sonwork.org             allow    ALLOWED emails only (everything else)
//   <workers.dev preview>   allow    same emails (never leave the preview open)

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const HOST = process.env.SONWORK_HOST || 'sonwork.org';
const PREVIEW = process.env.SONWORK_PREVIEW || 'sonwork.tuanson-le03.workers.dev';
const EMAILS = (process.env.ALLOWED_EMAILS || 'tuanson.le03@gmail.com,tuanson1200@gmail.com').split(',').map(s => s.trim()).filter(Boolean);
if (!TOKEN || !ACCT) { console.error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID'); process.exit(1); }

const api = async (method, path, body) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}${path}`, {
    method, headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${method} ${path}: ${JSON.stringify(j.errors)}`);
  return j.result;
};

// 1. A Zero Trust organization must exist before any app can.
try {
  const org = await api('GET', '/access/organizations');
  console.log(`org: ${org.auth_domain}`);
} catch {
  const org = await api('POST', '/access/organizations', { name: 'sonwork', auth_domain: 'sonwork.cloudflareaccess.com' });
  console.log(`org created: ${org.auth_domain}`);
}

// 2. Apps, upserted by name.
const allow = { name: 'Sơn and invited readers', decision: 'allow', include: EMAILS.map(email => ({ email: { email } })) };
const bypass = { name: 'Public', decision: 'bypass', include: [{ everyone: {} }] };
const apps = [
  { name: 'sonwork · public reports', domain: `${HOST}/p`, policies: [bypass] },
  { name: 'sonwork · assets', domain: `${HOST}/_astro`, policies: [bypass] },
  { name: 'sonwork · favicon', domain: `${HOST}/favicon.svg`, policies: [bypass] },
  { name: 'sonwork · robots', domain: `${HOST}/robots.txt`, policies: [bypass] },
  { name: 'sonwork · private', domain: HOST, policies: [allow] },
  { name: 'sonwork · preview', domain: PREVIEW, policies: [allow] },
];
const existing = await api('GET', '/access/apps');
for (const a of apps) {
  const body = { type: 'self_hosted', session_duration: '720h', app_launcher_visible: false, ...a };
  const found = existing.find(x => x.name === a.name);
  const res = found ? await api('PUT', `/access/apps/${found.id}`, body) : await api('POST', '/access/apps', body);
  console.log(`${found ? 'updated' : 'created'}  ${a.domain.padEnd(44)} ${a.policies[0].decision}`);
}
console.log('done. Only listed emails can open the site; /p/* is public.');
