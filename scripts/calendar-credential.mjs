import { openSync, fstatSync, readFileSync, closeSync, constants } from 'node:fs';

// Only an explicitly supplied dedicated reference is read, never CLI auth/.env.
export function readDedicatedCalendarToken(file) {
  let fd;
  try {
    fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = fstatSync(fd);
    if (!info.isFile() || (info.mode & 0o777) !== 0o600 || info.uid !== process.getuid() || info.size > 1024) throw new Error('Invalid file');
    const token = readFileSync(fd, 'utf8').trim();
    if (!/^[A-Za-z0-9._~+/=-]+$/.test(token)) throw new Error('Invalid credential');
    return token;
  } catch { throw new Error('Dedicated calendar credential unavailable; no alternative credential is used'); }
  finally { if (fd !== undefined) closeSync(fd); }
}
