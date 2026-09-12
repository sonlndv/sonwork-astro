// Meeting-request tests. Pure logic plus an in-memory KV standing in for the
// Worker binding, so the whole request path runs without network or credentials.
//   node --test test/booking.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRequest, newRecord, publicView, clean, escapeHtml,
  rateCheck, sendMail, ownerNotice, visitorAck, sha, token, LIMITS, STATUSES,
} from '../src/booking.js';

// --- in-memory KV with the subset of the API the code uses ---
function fakeKV() {
  const m = new Map();
  return {
    m,
    async get(k) { const e = m.get(k); if (!e) return null; if (e.exp && e.exp < Date.now()) { m.delete(k); return null; } return e.v; },
    async put(k, v, o = {}) { m.set(k, { v, exp: o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : null }); },
    async delete(k) { m.delete(k); },
    async list({ prefix = '', cursor } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}

const good = () => ({
  name: 'Mai Chi',
  email: 'Mai.Chi@Example.com',
  purpose: 'I would like to talk about automating our back-office reporting.',
  context: 'We run about 200 invoices a month by hand.',
  topic: 'operations',
  duration: 30,
  timezone: 'Asia/Ho_Chi_Minh',
  windows: 'Weekday mornings',
  consent: true,
  startedAt: Date.now() - 20000,
});

// ---------------- validation ----------------

test('accepts a well-formed request and normalises it', () => {
  const r = validateRequest(good());
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
  assert.equal(r.value.email, 'mai.chi@example.com', 'email is lowercased');
  assert.equal(r.value.duration, 30);
});

test('rejects a missing or malformed email', () => {
  for (const bad of ['', 'nope', 'a@b', 'two@@at.com']) {
    const r = validateRequest({ ...good(), email: bad });
    assert.equal(r.ok, false, `should reject ${JSON.stringify(bad)}`);
    assert.ok(r.problems.some((p) => p.startsWith('email:')));
  }
});

test('requires a real purpose, not a greeting', () => {
  const r = validateRequest({ ...good(), purpose: 'hi' });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.startsWith('purpose:')));
});

test('requires consent to reply by email', () => {
  const r = validateRequest({ ...good(), consent: false });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.startsWith('consent:')));
});

test('rejects a duration that is not offered', () => {
  assert.equal(validateRequest({ ...good(), duration: 240 }).ok, false);
  assert.equal(validateRequest({ ...good(), duration: 45 }).ok, true);
});

test('honeypot field rejects silently and alone', () => {
  const r = validateRequest({ ...good(), company: 'Acme Ltd' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, ['rejected'], 'honeypot must be the only problem so the API can 200 it');
});

test('rejects a submission filled faster than a human can type', () => {
  const r = validateRequest({ ...good(), startedAt: Date.now() - 500 });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes('too fast')));
});

test('rejects a stale form', () => {
  const r = validateRequest({ ...good(), startedAt: Date.now() - (LIMITS.maxFillSeconds + 60) * 1000 });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes('stale')));
});

test('truncates oversized input instead of storing it', () => {
  const r = validateRequest({ ...good(), purpose: 'x'.repeat(9000), context: 'y'.repeat(9000) });
  assert.equal(r.ok, true);
  assert.equal(r.value.purpose.length, LIMITS.purpose);
  assert.equal(r.value.context.length, LIMITS.context);
});

test('strips control characters from untrusted text', () => {
  assert.equal(clean('a\u0000b\u0007c', 100), 'abc');
  assert.equal(clean('line\n\n\n\n\nline', 100), 'line\n\nline');
});

test('escapes HTML for any surface that renders a request', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;');
});

test('a non-object body is rejected, not thrown on', () => {
  for (const b of [null, undefined, 'string', 42, []]) {
    assert.equal(validateRequest(b).ok, false);
  }
});

// ---------------- record shape ----------------

test('a new record starts pending with nothing booked', () => {
  const v = validateRequest(good()).value;
  const rec = newRecord(v, { id: 'abc', tokenHash: 'hash' });
  assert.equal(rec.status, 'pending');
  assert.equal(rec.proposedSlot, null);
  assert.equal(rec.confirmedSlot, null);
  assert.equal(rec.history.length, 1);
  assert.ok(STATUSES.includes(rec.status));
});

test('the visitor view leaks no private field', () => {
  const v = validateRequest(good()).value;
  const rec = newRecord(v, { id: 'abc', tokenHash: 'secret-hash' });
  rec.adminNotes = 'not for them';
  const pub = publicView(rec);
  for (const forbidden of ['tokenHash', 'adminNotes', 'email', 'purpose', 'context', 'history', 'id']) {
    assert.equal(pub[forbidden], undefined, `publicView must not expose ${forbidden}`);
  }
  assert.equal(pub.status, 'pending');
});

// ---------------- tokens ----------------

test('status tokens are unguessable and distinct', () => {
  const a = token(24), b = token(24);
  assert.match(a, /^[a-f0-9]{48}$/);
  assert.notEqual(a, b);
});

test('a token is stored only as a hash', async () => {
  const t = token(24);
  const h = await sha(t);
  assert.match(h, /^[a-f0-9]{64}$/);
  assert.notEqual(h, t);
  assert.equal(h, await sha(t), 'hashing is stable');
});

// ---------------- rate limiting ----------------

test('rate limit allows up to the cap then refuses', async () => {
  const kv = fakeKV();
  for (let i = 0; i < LIMITS.perEmailPerHour; i++) {
    const r = await rateCheck(kv, 'email:a@b.com', LIMITS.perEmailPerHour);
    assert.equal(r.ok, true, `attempt ${i + 1} should pass`);
  }
  const over = await rateCheck(kv, 'email:a@b.com', LIMITS.perEmailPerHour);
  assert.equal(over.ok, false, 'the attempt past the cap must be refused');
});

test('rate limits are per identity, not global', async () => {
  const kv = fakeKV();
  for (let i = 0; i < LIMITS.perEmailPerHour; i++) await rateCheck(kv, 'email:a@b.com', LIMITS.perEmailPerHour);
  const other = await rateCheck(kv, 'email:c@d.com', LIMITS.perEmailPerHour);
  assert.equal(other.ok, true, 'a different sender is unaffected');
});

// ---------------- email ----------------

test('with no provider configured nothing is sent and nothing is lost', async () => {
  const kv = fakeKV();
  const v = validateRequest(good()).value;
  const rec = newRecord(v, { id: 'req1', tokenHash: 'h' });
  const res = await sendMail({}, kv, ownerNotice(rec, {}), 'req1');
  assert.equal(res.sent, false);
  assert.equal(res.mode, 'no-send');
  const queued = await kv.get('mr:mail:req1:owner');
  assert.ok(queued, 'the message is queued in KV instead of vanishing');
  assert.match(queued, /Mai Chi/);
});

test('the owner notice carries the request and replies to the visitor', () => {
  const v = validateRequest(good()).value;
  const rec = newRecord(v, { id: 'req1', tokenHash: 'h' });
  const msg = ownerNotice(rec, { BOOKING_EMAIL: 'me@example.com' });
  assert.equal(msg.to, 'me@example.com');
  assert.equal(msg.replyTo, 'mai.chi@example.com');
  assert.match(msg.text, /automating our back-office reporting/);
  assert.match(msg.subject, /30m/);
});

test('the visitor acknowledgement promises nothing and never leaks the raw token to the owner copy', () => {
  const v = validateRequest(good()).value;
  const rec = newRecord(v, { id: 'req1', tokenHash: 'h' });
  const t = token(24);
  const ack = visitorAck(rec, t, { SITE_ORIGIN: 'https://sonwork.org' });
  assert.equal(ack.to, 'mai.chi@example.com');
  assert.match(ack.text, /Nothing is booked yet/);
  assert.ok(ack.text.includes(t), 'the visitor gets their own status link');
  const owner = ownerNotice(rec, {});
  assert.equal(owner.text.includes(t), false, 'the owner mail must not contain the visitor token');
});

test('an unknown provider errors rather than silently dropping mail', async () => {
  const res = await sendMail({ EMAIL_PROVIDER: 'carrier-pigeon', EMAIL_API_KEY: 'k', EMAIL_FROM: 'a@b.com' }, fakeKV(), { kind: 'owner' }, 'x');
  assert.equal(res.sent, false);
  assert.equal(res.mode, 'error');
});
