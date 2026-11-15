import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDedicatedCalendarToken } from '../../scripts/calendar-credential.mjs';

test('dedicated runtime reader accepts approved opaque token formats; refuses symlink/broad permissions/invalid/missing/oversized values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'calendar-credential-test-'));
  const file = join(dir, 'synthetic-token');
  const synthetic = ['github', 'pat', 'not_a_real_credential'].join('_');
  try {
    writeFileSync(file, synthetic, { mode: 0o600 }); assert.equal(readDedicatedCalendarToken(file), synthetic);
    const opaque = ['approved', 'opaque', 'runtime', 'credential'].join('_');
    writeFileSync(file, opaque); assert.equal(readDedicatedCalendarToken(file), opaque);
    symlinkSync(file, join(dir, 'link')); assert.throws(() => readDedicatedCalendarToken(join(dir, 'link')), /unavailable/);
    chmodSync(file, 0o644); assert.throws(() => readDedicatedCalendarToken(file), /unavailable/); chmodSync(file, 0o600);
    writeFileSync(file, 'invalid credential with whitespace'); assert.throws(() => readDedicatedCalendarToken(file), /unavailable/);
    writeFileSync(file, 'x'.repeat(1025)); assert.throws(() => readDedicatedCalendarToken(file), /unavailable/);
    assert.throws(() => readDedicatedCalendarToken(join(dir, 'missing')), /unavailable/);
  } finally { rmSync(dir, { recursive: true }); }
});
