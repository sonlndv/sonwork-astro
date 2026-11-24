const DAY = 86_400_000;
const SOURCE = 'https://github.com/users/sonlndv/contributions';
const monthName = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });

function utcDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError('Expected an ISO UTC calendar date');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new TypeError('Invalid UTC calendar date');
  return date;
}

export function validateCalendar(snapshot) {
  const fields = ['source', 'visibility', 'metric', 'retrievedAt', 'from', 'through', 'days', 'total'];
  if (!snapshot || Object.keys(snapshot).length !== fields.length || fields.some(key => !Object.hasOwn(snapshot, key))) throw new TypeError('Only allowlisted public calendar fields are accepted');
  if (snapshot.source !== SOURCE || typeof snapshot.visibility !== 'string' || typeof snapshot.metric !== 'string' || !Number.isFinite(Date.parse(snapshot.retrievedAt))) throw new TypeError('Invalid public snapshot provenance');
  const first = utcDate(snapshot.from).valueOf();
  const last = utcDate(snapshot.through).valueOf();
  if (!Array.isArray(snapshot.days) || !snapshot.days.length || last < first || snapshot.days.length !== (last - first) / DAY + 1) throw new TypeError('Snapshot must cover every UTC date exactly once');
  let total = 0;
  snapshot.days.forEach((day, index) => {
    if (!day || Object.keys(day).sort().join(',') !== 'count,date,level' || utcDate(day.date).valueOf() !== first + index * DAY) throw new TypeError('Only contiguous allowlisted public calendar days are accepted');
    if (!Number.isSafeInteger(day.count) || day.count < 0 || !Number.isInteger(day.level) || day.level < 0 || day.level > 4) throw new TypeError('Invalid contribution count or original GitHub intensity');
    total += day.count;
  });
  if (!Number.isSafeInteger(total) || total !== snapshot.total) throw new TypeError('Contribution counts do not reconcile to the supplied total');
  return snapshot;
}

export function calendarLayout(snapshot) {
  validateCalendar(snapshot);
  const offset = utcDate(snapshot.from).getUTCDay();
  const months = snapshot.days.flatMap((day, index) => index === 0 || day.date.endsWith('-01') ? [{ label: monthName.format(utcDate(day.date)), column: Math.floor((index + offset) / 7) + 1 }] : []);
  return { days: snapshot.days, total: snapshot.total, offset, weeks: Math.ceil((snapshot.days.length + offset) / 7), months };
}

export function calendarSummary(snapshot, lang = 'en') {
  validateCalendar(snapshot);
  if (snapshot.days.length !== 365) throw new TypeError('Annual total requires the full 365-day calendar');
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  const count = new Intl.NumberFormat(locale).format(snapshot.total);
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return {
    label: lang === 'vi' ? `${count} lượt đóng góp trong năm qua` : `${count} ${snapshot.total === 1 ? 'contribution' : 'contributions'} in the last year`,
    range: `${date.format(utcDate(snapshot.from))} – ${date.format(utcDate(snapshot.through))} (UTC)`,
  };
}
