import { calendarLayout, validateCalendar } from './contribution-calendar.mjs';

export function startCalendar() {
  const calendar = document.querySelector<HTMLElement>('[data-calendar]');
  const grid = calendar?.querySelector<HTMLElement>('.calendar-grid');
  const months = calendar?.querySelector<HTMLElement>('.calendar-months');
  const scroll = calendar?.querySelector<HTMLElement>('.calendar-scroll');
  const detail = calendar?.querySelector<HTMLElement>('#calendar-detail');
  const description = calendar?.querySelector<HTMLElement>('#calendar-description');
  if (!calendar || !grid || !months || !scroll || !detail || !description) return;
  const root = calendar, cells = grid, labels = months, region = scroll, output = detail, provenance = description;
  let buttons: HTMLButtonElement[] = [];
  let current: HTMLButtonElement;
  let selected: HTMLButtonElement | undefined;
  const countLabel = (count: string | undefined) => `${count} ${count === '1' ? 'contribution' : 'contributions'}`;
  function show(button?: HTMLButtonElement) { output.textContent = button ? `${button.dataset.date} · ${countLabel(button.dataset.count)} (UTC)` : ''; }
  function rove(button: HTMLButtonElement) { current.tabIndex = -1; button.tabIndex = 0; current = button; }
  function select(button: HTMLButtonElement) { selected?.setAttribute('aria-pressed', 'false'); selected = button; button.setAttribute('aria-pressed', 'true'); rove(button); show(button); }
  function restore() { show(buttons.find(button => button === document.activeElement) ?? selected); }
  function bind(selectedDate?: string, focusedDate?: string) {
    buttons = [...cells.querySelectorAll<HTMLButtonElement>('.calendar-day')];
    if (!buttons.length) return;
    selected = buttons.find(button => button.dataset.date === selectedDate);
    current = buttons.find(button => button.dataset.date === focusedDate) ?? selected ?? buttons[0];
    for (const button of buttons) {
      button.disabled = false; button.tabIndex = button === current ? 0 : -1;
      button.setAttribute('aria-pressed', String(button === selected));
      button.addEventListener('pointerenter', () => show(button));
      button.addEventListener('focus', () => { rove(button); show(button); });
      button.addEventListener('blur', restore);
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', event => {
        const index = buttons.indexOf(button);
        const positions: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, ArrowLeft: index - 7, ArrowRight: index + 7, Home: 0, End: buttons.length - 1 };
        if (!(event.key in positions)) return;
        event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, positions[event.key]))].focus();
      });
    }
    if (focusedDate) current.focus();
  }
  bind(); cells.addEventListener('pointerleave', restore);

  let followingRecent = true;
  const viewportInputs = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'focusin'];
  const inputOptions = { capture: true, passive: true };
  function exposeRecentDates() {
    if (followingRecent) region.scrollTo({ left: region.scrollWidth - region.clientWidth, behavior: 'instant' });
  }
  const viewportObserver = new ResizeObserver(exposeRecentDates);
  function releaseViewport() {
    followingRecent = false;
    viewportObserver.disconnect();
    for (const event of viewportInputs) region.removeEventListener(event, releaseViewport, inputOptions);
  }
  // Follow initial layout and refreshes only until the visitor takes control.
  for (const event of viewportInputs) region.addEventListener(event, releaseViewport, inputOptions);
  if (region.contains(document.activeElement)) releaseViewport();
  else {
    viewportObserver.observe(region);
    viewportObserver.observe(cells);
    exposeRecentDates();
  }

  function markStale() {
    if (root.dataset.calendarSource !== 'github-graphql') return;
    root.dataset.calendarMode = 'stale';
    const warning = ' Refresh unavailable; retaining the last received calendar.';
    if (!provenance.textContent?.includes(warning)) provenance.textContent += warning;
  }
  function apply(payload: { calendar: unknown; meta: { mode: string; fetchedAt: string; stale: boolean; source: string } }) {
    const data = validateCalendar(payload.calendar);
    const meta = payload.meta;
    if (data.days.length !== 365 || !meta || !['fresh', 'cache', 'stale', 'snapshot'].includes(meta.mode) || !['github-graphql', 'public-profile-snapshot'].includes(meta.source) || !Number.isFinite(Date.parse(meta.fetchedAt)) || typeof meta.stale !== 'boolean') throw new Error('Invalid calendar response');
    if (meta.mode === 'snapshot') { markStale(); return; }
    const layout = calendarLayout(data);
    const selectedDate = selected?.dataset.date;
    const focusedDate = buttons.find(button => button === document.activeElement)?.dataset.date;
    const sameDates = buttons.length === data.days.length && buttons.every((button, index) => button.dataset.date === data.days[index].date);
    function update(button: HTMLButtonElement, day: (typeof data.days)[number]) {
      button.dataset.date = day.date; button.dataset.count = String(day.count); button.dataset.level = String(day.level);
      const name = `${day.date}: ${countLabel(String(day.count))} (UTC)`; button.setAttribute('aria-label', name); button.title = name;
    }
    if (sameDates) data.days.forEach((day, index) => update(buttons[index], day));
    else {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < layout.offset; i++) { const blank = document.createElement('span'); blank.className = 'calendar-empty'; blank.setAttribute('aria-hidden', 'true'); fragment.append(blank); }
      for (const day of data.days) { const button = document.createElement('button'); button.type = 'button'; button.className = 'calendar-day'; update(button, day); fragment.append(button); }
      cells.replaceChildren(fragment);
      labels.replaceChildren(...layout.months.map(month => { const span = document.createElement('span'); span.style.gridColumn = String(month.column); span.textContent = month.label; return span; }));
      region.style.setProperty('--weeks', String(layout.weeks)); bind(selectedDate, focusedDate);
    }
    root.dataset.calendarMode = meta.mode; root.dataset.calendarSource = meta.source; root.dataset.calendarFetchedAt = meta.fetchedAt;
    provenance.textContent = `${data.from}–${data.through}: ${data.total.toLocaleString('en-US')} public profile contributions, not commits-only or completed work. Dates are UTC. Fetched ${meta.fetchedAt} using the official GitHub API with a 15-minute server cache; ${meta.stale ? 'showing stale last-good data' : 'auto-updated, not instant realtime'}. Source: ${data.source}.`;
    restore();
    exposeRecentDates();
  }
  const interval = 15 * 60 * 1000;
  let timer: number | undefined, controller: AbortController | undefined, busy = false, lastAttempt = 0, stopped = false;
  function schedule() { window.clearTimeout(timer); if (!stopped && !document.hidden) timer = window.setTimeout(refresh, Math.max(0, interval - (Date.now() - lastAttempt))); }
  async function refresh() {
    if (stopped || document.hidden || busy) return;
    busy = true; lastAttempt = Date.now(); controller = new AbortController();
    const deadline = window.setTimeout(() => controller?.abort(), 10_000);
    try {
      const response = await fetch('/api/github-calendar', { credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (!response.ok || Number(response.headers.get('content-length')) > 128 * 1024) throw new Error('Calendar unavailable');
      const text = await response.text(); if (text.length > 128 * 1024) throw new Error('Calendar too large');
      apply(JSON.parse(text));
    } catch { markStale(); /* Keep valid data; never log transport bodies. */ }
    finally { window.clearTimeout(deadline); busy = false; schedule(); }
  }
  document.addEventListener('visibilitychange', () => { window.clearTimeout(timer); if (!document.hidden) { if (Date.now() - lastAttempt >= interval) void refresh(); else schedule(); } });
  window.addEventListener('pagehide', () => { stopped = true; releaseViewport(); window.clearTimeout(timer); controller?.abort(); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    stopped = false;
    if (Date.now() - lastAttempt >= interval) void refresh(); else schedule();
  });
  void refresh();
}
