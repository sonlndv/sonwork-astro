#!/usr/bin/env node
// Push every report (and, optionally, a notes export) into gbrain so the fleet
// remembers the documents, not just its atoms about them.
//
//   node scripts/sync-gbrain.mjs             # all reports
//   node scripts/sync-gbrain.mjs --dry-run   # show what would be sent
//   node scripts/sync-gbrain.mjs --notes notes.md   # also push a notes export
//
// Auth: GBRAIN_URL + GBRAIN_TOKEN env (a bearer issued by the gbrain CLI on the
// VPS), or a gbrain entry in ~/.claude.json that still carries a static header.
// The public endpoint https://gbrain-mcp.sonwork.org/mcp uses OAuth; static
// tokens come from the gbrain admin, not from dynamic registration.
// Slug convention: shared/projects/sonwork/reports/<file-slug>

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PREFIX = 'shared/projects/sonwork/reports/';
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const notesPath = args.includes('--notes') ? args[args.indexOf('--notes') + 1] : null;

async function config() {
  let url = process.env.GBRAIN_URL, auth = process.env.GBRAIN_TOKEN;
  if (!url || !auth) {
    try {
      const c = JSON.parse(await readFile(join(homedir(), '.claude.json'), 'utf8'));
      const g = c.mcpServers?.gbrain;
      url ||= g?.url; auth ||= g?.headers?.Authorization;
    } catch {}
  }
  if (!url || !auth) throw new Error('No gbrain config: set GBRAIN_URL and GBRAIN_TOKEN');
  if (!/^Bearer /i.test(auth)) auth = 'Bearer ' + auth;
  return { url, auth };
}

// Minimal MCP streamable-HTTP client. Handles JSON and SSE replies.
class Mcp {
  constructor({ url, auth }) { this.url = url; this.auth = auth; this.sid = null; this.n = 0; }
  async rpc(method, params, notify = false) {
    const body = { jsonrpc: '2.0', method, params };
    if (!notify) body.id = ++this.n;
    const r = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream',
        authorization: this.auth, ...(this.sid ? { 'mcp-session-id': this.sid } : {}) },
      body: JSON.stringify(body),
    });
    const sid = r.headers.get('mcp-session-id'); if (sid) this.sid = sid;
    if (notify) return null;
    if (!r.ok) throw new Error(`${method}: HTTP ${r.status} ${await r.text()}`);
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    let msg;
    if (ct.includes('text/event-stream')) {
      const data = text.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).filter(Boolean);
      msg = JSON.parse(data[data.length - 1]);
    } else msg = JSON.parse(text);
    if (msg.error) throw new Error(`${method}: ${msg.error.message}`);
    return msg.result;
  }
  async init() {
    await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'sonwork-sync', version: '0.1' } });
    await this.rpc('notifications/initialized', {}, true);
  }
  put(slug, content) { return this.rpc('tools/call', { name: 'put_page', arguments: { slug, content } }); }
}

if (args.includes('--ping')) {
  // Read-only connectivity check: initialize, list tools, confirm put_page exists.
  const mcp = new Mcp(await config());
  await mcp.init();
  const tools = (await mcp.rpc('tools/list', {}))?.tools || [];
  console.log(`gbrain reachable: ${tools.length} tools; put_page ${tools.some(t => t.name === 'put_page') ? 'available' : 'MISSING'}`);
  process.exit(0);
}

const dir = 'src/content/reports';
const files = (await readdir(dir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
const jobs = [];
for (const f of files) {
  const content = await readFile(join(dir, f), 'utf8');
  jobs.push({ slug: PREFIX + f.replace(/\.md$/, ''), content });
}
if (notesPath) jobs.push({ slug: 'shared/projects/sonwork/notes', content: await readFile(notesPath, 'utf8') });

if (dry) { for (const j of jobs) console.log(`would put ${j.slug} (${j.content.length} chars)`); process.exit(0); }

const mcp = new Mcp(await config());
await mcp.init();
for (const j of jobs) {
  const res = await mcp.put(j.slug, j.content);
  const t = res?.content?.[0]?.text ?? JSON.stringify(res);
  console.log(`put ${j.slug} → ${t.slice(0, 120).replace(/\n/g, ' ')}`);
}
