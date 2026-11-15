import { startServer } from './serve-dist.mjs';
import { resolve } from 'node:path';
import { existsSync, lstatSync } from 'node:fs';
import { createCalendarService } from '../src/lib/github-calendar-api.mjs';
import { readDedicatedCalendarToken } from './calendar-credential.mjs';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4371);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use an unprivileged TCP port');
if (!existsSync(`${root}/index.html`) || !existsSync(`${root}/release.json`) || existsSync(`${root}/.git`) || existsSync(`${root}/package.json`) || lstatSync(root).isSymbolicLink()) throw new Error('Only an actual built-asset directory may be served');
let token;
// Explicit dedicated file reference only; never fall back to gh auth or token env.
const credentialFile = process.env.SONWORK_CALENDAR_TOKEN_FILE;
if (credentialFile) {
  token = readDedicatedCalendarToken(credentialFile);
}
const server = await startServer(root, port, { noIndex: true, calendarService: createCalendarService({ token }) });
console.log(JSON.stringify({ preview: `http://127.0.0.1:${port}`, root, pid: process.pid, noindex: true, bound: server.address() }));
function stop() { server.close(() => process.exit(0)); server.closeAllConnections(); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
// One bounded review process, not a daemon/recurring job. No public interface or tunnel.
setTimeout(stop, 8 * 60 * 60 * 1000).unref();
