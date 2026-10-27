(() => {
  const btn = document.querySelector('.companion');
  if (!btn) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const GREETING_MS = 700;
  const FADE_OUT_MS = 120;
  const FADE_IN_MS = 140;
  const RETURN_MS = 1500;
  const HW = 68; // reserved native target: 68px wide ...
  const HH = 44; // ... by 44px high (the extra width is invisible room for the stroll)
  const GAP = 12;

  const header = document.querySelector('.site-header');
  const slot = document.querySelector('.footer-slot');
  const topBtn = document.querySelector('.footer-top');
  const projects = (document.getElementById('home-projects') || document.getElementById('work-live'))?.closest('section') ?? null;

  // ---- pointer gaze (event-driven; one pending frame; fine hover mouse only) -----------------
  // Declared first so every reset/park path, even on an initial reduced-motion load, can use it.
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const LOOK_X = 16; // max eye shift, SVG user units
  const LOOK_Y = 10;
  const LOOK_R = 3; // max body tilt, degrees
  const LOOK_GAIN = 90; // px: small distances already read, far ones saturate
  let gazeRaf = 0;
  let gazeX = 0;
  let gazeY = 0;

  function resetGaze() {
    if (gazeRaf) cancelAnimationFrame(gazeRaf);
    gazeRaf = 0;
    gazeX = 0;
    gazeY = 0;
    if (!btn.hasAttribute('data-look')) return;
    btn.removeAttribute('data-look');
    btn.style.removeProperty('--look-x');
    btn.style.removeProperty('--look-y');
    btn.style.removeProperty('--look-r');
  }

  function gazeBusy() {
    return !!(
      blinkTimer || poseTimer || strollTimer || moving || hopTimer || open || returning || btn.disabled ||
      btn.dataset.fade || reduce.matches || document.hidden || !fine.matches || frozen()
    );
  }

  function paintGaze() {
    gazeRaf = 0;
    if (gazeBusy()) return resetGaze();
    const svg = btn.querySelector('svg');
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const dx = gazeX - (r.left + r.width / 2);
    const dy = gazeY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (!d) return resetGaze();
    const k = d / (d + LOOK_GAIN);
    const ux = dx / d;
    const uy = dy / d;
    btn.style.setProperty('--look-x', `${(ux * k * LOOK_X).toFixed(2)}px`);
    btn.style.setProperty('--look-y', `${(uy * k * LOOK_Y).toFixed(2)}px`);
    btn.style.setProperty('--look-r', `${(ux * k * LOOK_R).toFixed(2)}deg`);
    btn.dataset.look = 'true';
  }

  // ---- original finite blink -------------------------------------------------
  let blinkTimer = 0;

  function stopBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = 0;
    btn.removeAttribute('data-greeting');
    btn.dataset.greetingState = 'idle';
  }

  // ---- finite landing / nod poses (CSS-driven; one timer, coalesced) ------------------
  const LAND_MS = 450;
  const NOD_MS = 360;
  let poseTimer = 0;

  function clearPose() {
    clearTimeout(poseTimer);
    poseTimer = 0;
    btn.removeAttribute('data-pose');
  }

  function setPose(name, ms) {
    if (reduce.matches || document.hidden || blinkTimer || poseTimer) return;
    resetGaze();
    btn.dataset.pose = name;
    if (name === 'land') btn.dataset.landings = String(Number(btn.dataset.landings || 0) + 1);
    poseTimer = setTimeout(clearPose, ms);
  }

  // ---- finite SVG stroll inside the stationary 68x44 target ------------------------------
  // The native button never moves; only the 38px drawing travels (CSS, one iteration).
  const STROLL_MS = 900;
  const START_MS = 650;
  let strollTimer = 0;
  let starter = 0;

  function clearStroll() {
    clearTimeout(strollTimer);
    strollTimer = 0;
    btn.removeAttribute('data-stroll');
  }

  function cancelStarter() {
    clearTimeout(starter);
    starter = 0;
  }

  function setStroll() {
    if (reduce.matches || document.hidden || strollTimer || moving || station === 'footer' || frozen()) return;
    resetGaze();
    btn.dataset.stroll = 'true';
    btn.dataset.strolls = String(Number(btn.dataset.strolls || 0) + 1);
    strollTimer = setTimeout(clearStroll, STROLL_MS);
  }

  // Every expression (hello blink + body, landing, nod, stroll, pending first stroll) ends here.
  function cancelExpressions() {
    resetGaze();
    cancelStarter();
    stopBlink();
    clearPose();
    clearStroll();
  }

  function greet() {
    if (reduce.matches || document.hidden || blinkTimer) return;
    resetGaze();
    clearPose();
    setStroll();
    btn.dataset.greeting = 'true';
    btn.dataset.greetingState = 'greeting';
    btn.dataset.greetings = String(Number(btn.dataset.greetings || 0) + 1);
    blinkTimer = setTimeout(stopBlink, GREETING_MS);
  }

  // ---- perches ---------------------------------------------------------------
  // The one native button never leaves the DOM. It is translated (not fixed) away from its
  // reserved header seat; the sticky header keeps that seat at a known viewport position.
  let station = 'header';
  let cx = 0;
  let cy = 0;
  let moving = false;
  let hopTo = '';
  let hopTimer = 0;
  let open = false;
  let utility = false;
  let returning = false;
  let returnTimer = 0;
  let raf = 0;

  const frozen = () => document.activeElement === btn && btn.matches(':focus-visible');

  function home() {
    const r = btn.getBoundingClientRect();
    return { x: r.left - cx, y: r.top - cy };
  }

  function buildSeat(h, hb) {
    if (!projects) return null;
    const p = projects.getBoundingClientRect();
    const x = p.left - GAP - HW;
    if (x < 8 || p.top > innerHeight * 0.5) return null;
    const y = Math.max(p.top, hb + GAP);
    if (y + HH > p.bottom - 8 || y + HH > innerHeight - 8) return null;
    return { x: x - h.x, y: y - h.y };
  }

  function footerSeat(h, hb) {
    if (!slot) return null;
    const s = slot.getBoundingClientRect();
    if (s.width < HW - 1 || s.height < HH - 1) return null;
    if (s.top < hb + 4 || s.bottom > innerHeight - 4 || s.left < 0 || s.right > innerWidth) return null;
    return { x: s.left - h.x, y: s.top - h.y };
  }

  function seatFor(st) {
    if (st === 'header') return { x: 0, y: 0 };
    const h = home();
    const hb = header.getBoundingClientRect().bottom;
    return st === 'footer' ? footerSeat(h, hb) : buildSeat(h, hb);
  }

  function desired() {
    if (reduce.matches || document.hidden || returning || scrollY <= 8) return 'header';
    // A keyboard-focused friend keeps its current seat for as long as that seat is valid.
    if (frozen()) return seatFor(station) ? station : 'header';
    const h = home();
    const hb = header.getBoundingClientRect().bottom;
    if (footerSeat(h, hb)) return 'footer';
    if (buildSeat(h, hb)) return 'build';
    return 'header';
  }

  function paintLabel() {
    if (station === 'footer') {
      btn.setAttribute('aria-label', 'Show Back to top');
      btn.setAttribute('aria-expanded', String(open));
      if (topBtn) btn.setAttribute('aria-controls', topBtn.id);
    } else {
      btn.setAttribute('aria-label', 'Say hello to the mountain');
      btn.removeAttribute('aria-expanded');
      btn.removeAttribute('aria-controls');
    }
  }

  function place(st) {
    const t = seatFor(st) || (st = 'header', { x: 0, y: 0 });
    const changed = st !== station;
    station = st;
    if (t.x !== cx || t.y !== cy) {
      resetGaze();
      cx = t.x;
      cy = t.y;
      btn.style.setProperty('--cx', `${cx}px`);
      btn.style.setProperty('--cy', `${cy}px`);
    }
    if (btn.dataset.perch !== station) btn.dataset.perch = station;
    if (changed) paintLabel();
  }

  function cancelHop() {
    clearTimeout(hopTimer);
    hopTimer = 0;
    hopTo = '';
    moving = false;
    btn.removeAttribute('data-moving');
    btn.removeAttribute('data-fade');
  }

  function settle(st) {
    cancelHop();
    cancelExpressions();
    place(st);
  }

  function hop(to) {
    resetGaze();
    cancelExpressions();
    moving = true;
    hopTo = to;
    btn.dataset.moving = 'true';
    btn.dataset.fade = 'out';
    hopTimer = setTimeout(() => {
      place(to);
      btn.dataset.fade = 'in';
      hopTimer = setTimeout(() => {
        cancelHop();
        setPose('land', LAND_MS); // only genuine arrivals; never on scroll/position updates
        if (to === 'build') setStroll();
        schedule();
      }, FADE_IN_MS);
    }, FADE_OUT_MS);
  }

  function setOpen(v) {
    if (open === v) return;
    open = v;
    if (topBtn) {
      const hadFocus = document.activeElement === topBtn;
      topBtn.hidden = !(v || utility);
      if (v) topBtn.focus({ preventScroll: true });
      else if (hadFocus && topBtn.hidden) btn.focus({ preventScroll: true });
    }
    paintLabel();
  }

  // Reduced motion: the friend stays at the header, but the native Back to top stays available
  // in the reserved footer space whenever that space is visible. Not the friend's menu.
  function setUtility(v) {
    if (utility === v) return;
    utility = v;
    if (!topBtn) return;
    const hadFocus = document.activeElement === topBtn;
    topBtn.hidden = !(open || utility);
    if (hadFocus && topBtn.hidden) btn.focus({ preventScroll: true });
  }

  function update() {
    if (returning && scrollY <= 1) {
      returning = false;
      clearTimeout(returnTimer);
    }
    if (open && scrollY <= 8) setOpen(false);
    setUtility(
      reduce.matches && !document.hidden && !returning && scrollY > 8 && !!footerSeat(home(), header.getBoundingClientRect().bottom),
    );

    // Safety first, even mid-hop: never fade at a seat that is no longer valid. If the current
    // seat (or the hop's destination) went stale, drop the hop and settle on a valid seat now.
    const stale = station !== 'header' && (scrollY <= 8 || !seatFor(station));
    const staleTarget = moving && hopTo && hopTo !== 'header' && (scrollY <= 8 || !seatFor(hopTo));
    if (stale || staleTarget) {
      if (open) setOpen(false);
      settle(desired());
      return;
    }

    if (moving) {
      // Mid hand-off the current station stays physically attached to its live, still-valid seat
      // (even while transparent). Timers, station, ARIA, focus and expressions are not touched.
      if (station !== 'header') place(station);
      return;
    }
    const want = desired();
    if (want !== station) {
      if (open) setOpen(false);
      if (reduce.matches || document.hidden) settle(want);
      else hop(want);
      return;
    }
    place(station);
  }

  function cancelRaf() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Cancels every pending timer/frame and parks the friend at the header seat.
  function parkHome() {
    cancelHop();
    cancelRaf();
    cancelExpressions();
    clearTimeout(returnTimer);
    returnTimer = 0;
    returning = false;
    setUtility(false);
    setOpen(false);
    settle('header');
  }

  function schedule() {
    if (document.hidden) return;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    }
  }

  // ---- events ----------------------------------------------------------------
  addEventListener('scroll', () => {
    cancelStarter();
    resetGaze();
    schedule();
  }, { passive: true });

  // Gaze: native fine-hover mouse only; coordinates are held only until the next frame/reset.
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !e.isTrusted) return;
    if (gazeBusy()) {
      resetGaze();
      return;
    }
    cancelStarter();
    gazeX = e.clientX;
    gazeY = e.clientY;
    if (!gazeRaf) gazeRaf = requestAnimationFrame(paintGaze);
  }, { passive: true });
  const stopGaze = () => resetGaze();
  document.documentElement.addEventListener('pointerleave', stopGaze);
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) resetGaze(); });
  addEventListener('blur', stopGaze);
  addEventListener('pagehide', stopGaze);
  addEventListener('pointerdown', stopGaze, { passive: true, capture: true });
  addEventListener('keydown', stopGaze, { passive: true, capture: true });
  btn.addEventListener('focus', stopGaze);
  fine.addEventListener('change', stopGaze);
  // The first stroll is a one-off greeting for a visitor who has not touched anything yet.
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    addEventListener(type, cancelStarter, { passive: true, capture: true });
  }
  addEventListener('resize', () => {
    resetGaze();
    cancelHop();
    cancelExpressions();
    if (open) setOpen(false);
    settle(desired());
    schedule();
  });

  document.addEventListener('visibilitychange', () => {
    resetGaze();
    if (document.hidden) parkHome();
    else schedule();
  });

  reduce.addEventListener('change', () => {
    resetGaze();
    if (reduce.matches) parkHome();
    schedule();
  });

  // Receiving focus never relocates the button; only an interrupted hop is cancelled.
  btn.addEventListener('focus', () => {
    cancelStarter();
    clearStroll();
    if (moving) {
      cancelHop();
      cancelExpressions();
    }
  });
  btn.addEventListener('blur', schedule);

  btn.addEventListener('click', () => {
    if (moving) return;
    if (station === 'footer') {
      setOpen(!open);
      setPose('nod', NOD_MS); // soft acknowledgement; focus already moved to Back to top
    } else greet();
  });

  topBtn?.addEventListener('click', () => {
    setUtility(false);
    setOpen(false);
    returning = true;
    clearTimeout(returnTimer);
    returnTimer = setTimeout(() => {
      returning = false;
      schedule();
    }, RETURN_MS);
    settle('header');
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
    btn.focus({ preventScroll: true });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open) return;
    const inside = topBtn?.contains(document.activeElement) || document.activeElement === btn;
    setOpen(false);
    if (inside) btn.focus({ preventScroll: true });
  });

  // ---- enable ----------------------------------------------------------------
  btn.dataset.greetingState = 'idle';
  btn.dataset.greetings = '0';
  btn.dataset.landings = '0';
  btn.dataset.strolls = '0';
  if (!reduce.matches && !document.hidden) {
    starter = setTimeout(() => {
      starter = 0;
      if (station === 'header' && !moving && scrollY <= 8 && !frozen()) setStroll();
    }, START_MS);
  }
  btn.dataset.perch = 'header';
  paintLabel();
  btn.disabled = false;
  schedule();
})();
