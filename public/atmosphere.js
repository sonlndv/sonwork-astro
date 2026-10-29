(() => {
  // Existing preference/eligibility owner, connected to the one mountains.js progress frame.
  // Mist has a genuine finite CSS completion. No interval, recurring delay, polling or rAF.
  const scene = document.querySelector('.mtn-scene');
  const mist = scene && scene.querySelector('.mtn-mist');
  const ribbon = mist && mist.querySelector('.mtn-mist-ribbon');
  const landscape = window.sonworkLandscape;
  if (!scene || !mist || !ribbon || !landscape) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const button = document.querySelector('.atmosphere-toggle');
  const status = document.getElementById('atmosphere-status');
  const KEY = 'sonwork-atmosphere';
  const expressive = scene.dataset.mode === 'home' || scene.dataset.mode === 'index';
  let paused = false;
  let running = false;
  let passes = 0;
  let active = null;
  try { paused = localStorage.getItem(KEY) === 'paused'; }
  catch { /* Denied storage keeps this preference in page memory. */ }
  const canRun = () => !paused && !reduce.matches && !forced.matches && !document.hidden;
  const reading = () => {
    const focus = document.activeElement;
    return !!focus && !!focus.closest('main') && focus.matches(':focus-visible');
  };
  const canAnswer = () => expressive && canRun() && landscape.isActive() && scrollY <= 8 && !reading();
  function paint() {
    mist.dataset.state = running ? 'running' : paused ? 'paused' : 'idle';
    mist.dataset.passes = String(passes);
    const off = reduce.matches || forced.matches;
    if (status) status.textContent = off ? '' : paused ? 'Atmosphere paused' : 'Atmosphere running';
    if (button) {
      button.hidden = off;
      button.textContent = paused ? 'Resume atmosphere' : 'Pause atmosphere';
    }
  }
  function cancel() {
    if (!running && !active) return;
    const effect = active;
    active = null;
    running = false;
    mist.removeAttribute('data-run');
    effect?.cancel();
    paint();
  }
  function start(source) {
    if (running || !canAnswer()) return;
    mist.dataset.source = source;
    mist.setAttribute('data-run', '');
    const effect = ribbon.getAnimations().find(animation => animation instanceof CSSAnimation && animation.animationName === 'mtn-mist-pass');
    if (!effect) { mist.removeAttribute('data-run'); return; }
    active = effect;
    running = true;
    passes += 1;
    if (source === 'greeting') mist.dataset.greetings = String(Number(mist.dataset.greetings || 0) + 1);
    paint();
    // Compare the actual producer's effect identity: a late cancelled old pass cannot end a new one.
    const finish = () => { if (active === effect) cancel(); };
    effect.addEventListener('finish', finish, { once: true });
    effect.addEventListener('cancel', finish, { once: true });
  }
  landscape.connect({
    canRun, canAnswer, cancel, paint,
    arrival() {
      if (!canAnswer()) return;
      start('ambient'); // one earned arrival, never a permanent idle recurrence
      landscape.auroraAnswer();
    },
  });
  document.addEventListener('sonwork:greet', () => {
    if (!canAnswer()) return;
    document.dispatchEvent(new CustomEvent('sonwork:ridge-answer'));
    if (!running) start('greeting'); // an active pass is neither restarted nor recounted
  });
  button?.addEventListener('click', () => {
    paused = !paused;
    try {
      if (paused) localStorage.setItem(KEY, 'paused');
      else localStorage.removeItem(KEY);
    } catch { /* Memory still carries the chosen state. */ }
    cancel();
    paint();
    document.dispatchEvent(new CustomEvent('sonwork:atmosphere', { detail: { paused } }));
    // Resume aligns the existing frame to actual geometry, without replaying an entrance/pass.
  });
  paint();
})();
