// Meeting requests — sonwork.org
//
// A visitor asks for time; Sơn decides. Nothing here books anything: a request
// is recorded, Sơn is notified, and only Sơn moves it forward. That is the whole
// design. No calendar credentials, no slot held, no promise made by a machine.
//
// Storage is the existing KV namespace (binding COMMENTS), keyed:
//   mr:req:<id>        the request record, TTL RETENTION_DAYS
//   mr:tok:<hash>      status-token hash -> id, same TTL
//   mr:dupe:<hash>     email+purpose fingerprint -> id, TTL DEDUPE_HOURS
//   mr:rate:<hash>:<b> per-identity counter in an hourly bucket, TTL 1h
//   mr:mail:<id>:<k>   outbox record when no sender is configured (no-send mode)
//
// Email is a notification channel only. Replies are read by a human.

export const STATUSES = ['pending', 'needs_info', 'proposed', 'confirmed', 'declined', 'cancelled', 'completed'];
export const DURATIONS = [15, 30, 45, 60];
export const TOPICS = ['agents', 'operations', 'research', 'intro', 'other'];

export const LIMITS = {
  name: 80,
  email: 200,
  purpose: 1200,
  context: 1500,
  windows: 400,
  timezone: 64,
  perEmailPerHour: 3,
  perIpPerHour: 6,
  minFillSeconds: 3,
  maxFillSeconds: 60 * 60 * 6,
  retentionDays: 90,
  dedupeHours: 24,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- small helpers ----------

const enc = new TextEncoder();

export async function sha(input) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(String(input)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function token(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function clean(s, max) {
  // Untrusted text. Strip control characters, collapse runs of blank lines, cap length.
  return String(s ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- validation ----------

// Pure: no KV, no network. Returns { ok, problems, value }.
export function validateRequest(body, now = Date.now()) {
  const problems = [];
  const b = body && typeof body === 'object' ? body : {};

  // Honeypot: a real person never fills a hidden field.
  if (clean(b.company, 100)) problems.push('rejected');

  // Timing: instant submissions are scripts; ancient ones are stale tabs.
  const startedAt = Number(b.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const seconds = (now - startedAt) / 1000;
    if (seconds < LIMITS.minFillSeconds) problems.push('too fast — take a moment and send again');
    if (seconds > LIMITS.maxFillSeconds) problems.push('this form went stale — please reload and resend');
  }

  const name = clean(b.name, LIMITS.name);
  if (name.length < 2) problems.push('name: tell me what to call you');

  const email = clean(b.email, LIMITS.email).toLowerCase();
  if (!EMAIL_RE.test(email)) problems.push('email: that does not look like an address I can reply to');

  const purpose = clean(b.purpose, LIMITS.purpose);
  if (purpose.length < 20) problems.push('purpose: a sentence or two about what you want to discuss');

  const context = clean(b.context, LIMITS.context);

  const topic = clean(b.topic, 40) || 'other';
  if (!TOPICS.includes(topic)) problems.push('topic: not one I offer');

  const duration = Number(b.duration ?? 30);
  if (!DURATIONS.includes(duration)) problems.push('duration: ' + DURATIONS.join(', ') + ' minutes');

  const timezone = clean(b.timezone, LIMITS.timezone);
  const windows = clean(b.windows, LIMITS.windows);

  if (b.consent !== true && b.consent !== 'true' && b.consent !== 'on') {
    problems.push('consent: I need permission to email you back');
  }

  if (problems.length) return { ok: false, problems, value: null };
  return {
    ok: true,
    problems: [],
    value: { name, email, purpose, context, topic, duration, timezone, windows },
  };
}

// ---------- record shape ----------

export function newRecord(value, meta = {}) {
  const now = new Date().toISOString();
  return {
    id: meta.id,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    name: value.name,
    email: value.email,
    purpose: value.purpose,
    context: value.context,
    topic: value.topic,
    duration: value.duration,
    timezone: value.timezone,
    windows: value.windows,
    proposedSlot: null,
    confirmedSlot: null,
    adminNotes: '',
    tokenHash: meta.tokenHash,
    source: meta.source || 'web',
    history: [{ at: now, from: null, to: 'pending', by: 'visitor' }],
  };
}

// What a visitor is allowed to see about their own request.
export function publicView(rec) {
  return {
    status: rec.status,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    duration: rec.duration,
    topic: rec.topic,
    proposedSlot: rec.proposedSlot,
    confirmedSlot: rec.confirmedSlot,
  };
}

// ---------- email ----------

// Vendor-neutral. With no provider configured the message is stored in KV and
// reported as deferred — the request is never lost and nothing is silently sent.
export async function sendMail(env, kv, msg, refId) {
  const provider = String(env.EMAIL_PROVIDER || '').toLowerCase();
  const key = String(env.EMAIL_API_KEY || '');
  const from = String(env.EMAIL_FROM || '');

  if (!provider || !key || !from) {
    if (kv && refId) {
      await kv.put(`mr:mail:${refId}:${msg.kind}`, JSON.stringify({ ...msg, queuedAt: new Date().toISOString() }), {
        expirationTtl: LIMITS.retentionDays * 86400,
      });
    }
    return { sent: false, mode: 'no-send', reason: 'no sender configured' };
  }

  if (provider === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, reply_to: msg.replyTo }),
    });
    const out = await r.json().catch(() => ({}));
    return r.ok ? { sent: true, id: out.id } : { sent: false, mode: 'error', status: r.status, detail: out.message || null };
  }

  return { sent: false, mode: 'error', reason: 'unknown EMAIL_PROVIDER: ' + provider };
}

export function ownerNotice(rec, env) {
  const site = String(env.SITE_ORIGIN || 'https://sonwork.org');
  return {
    kind: 'owner',
    to: String(env.BOOKING_EMAIL || env.OWNER_EMAIL || ''),
    replyTo: rec.email,
    subject: `Meeting request · ${rec.name} · ${rec.topic} · ${rec.duration}m`,
    text: [
      `${rec.name} <${rec.email}> asked for ${rec.duration} minutes.`,
      ``,
      `Topic:    ${rec.topic}`,
      `Timezone: ${rec.timezone || '(not given)'}`,
      `Windows:  ${rec.windows || '(none given)'}`,
      ``,
      `What they want to discuss:`,
      rec.purpose,
      ``,
      rec.context ? `Context:\n${rec.context}\n` : '',
      `Request ${rec.id} · filed ${rec.createdAt}`,
      `Review: ${site}/api/meeting-requests (filing token)`,
    ].join('\n'),
  };
}

export function visitorAck(rec, statusToken, env) {
  const site = String(env.SITE_ORIGIN || 'https://sonwork.org');
  const reply = String(env.REPLY_WINDOW || 'within a few days');
  return {
    kind: 'ack',
    to: rec.email,
    replyTo: String(env.BOOKING_EMAIL || env.OWNER_EMAIL || ''),
    subject: 'Your request reached Sơn',
    text: [
      `${rec.name},`,
      ``,
      `Your request for ${rec.duration} minutes is recorded. Sơn reads these himself and replies ${reply}.`,
      `Nothing is booked yet — he will either propose a time or tell you it is not a fit.`,
      ``,
      `Follow it here: ${site}/book/status/?t=${statusToken}`,
      ``,
      `You wrote:`,
      rec.purpose,
      ``,
      `If you did not send this, ignore it and the record expires on its own.`,
    ].join('\n'),
  };
}

// ---------- rate limiting ----------

export async function rateCheck(kv, keyMaterial, limit) {
  const bucket = Math.floor(Date.now() / 3600000);
  const k = `mr:rate:${await sha(keyMaterial)}:${bucket}`;
  const n = Number((await kv.get(k)) || 0);
  if (n >= limit) return { ok: false };
  await kv.put(k, String(n + 1), { expirationTtl: 3700 });
  return { ok: true, count: n + 1 };
}
