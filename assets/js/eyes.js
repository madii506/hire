// HIRE · the watchers. A field of closed eyes behind the whole site: the ones near you open and follow you, a few
// wake up on their own, scrolling stirs them. And every agent face on the page turns its eyes toward your cursor.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const pointer = { x: -1e4, y: -1e4, at: 0, touch: false };
addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.at = performance.now(); pointer.touch = e.pointerType === 'touch'; }, { passive: true });
addEventListener('pointerdown', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.at = performance.now(); pointer.touch = e.pointerType === 'touch'; }, { passive: true });

export function eyeField(canvas) {
  if (reduced) return { destroy() {} };
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, eyes = [], raf = 0, last = 0, stir = 0, lastY = scrollY;
  const R = (a, b) => a + Math.random() * (b - a);
  function layout() {
    dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const sp = W < 700 ? 50 : 44; eyes = [];
    for (let r = 0, y = sp * .5; y < H + sp; y += sp * .86, r++)
      for (let x = (r % 2 ? sp * .5 : 0) + sp * .25; x < W + sp; x += sp)
        eyes.push({ x: x + R(-7, 7), y: y + R(-6, 6), s: R(.75, 1.15), open: 0, tgt: 0, wake: 0, blink: 0, lx: 0, ly: 0, ph: Math.random() * 6.28 });
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 32 || document.body.classList.contains('intro-on')) return;   // ~30 fps is plenty for eyes
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const active = now - pointer.at < 2600, px = pointer.x, py = pointer.y, rad = pointer.touch ? 210 : 165;
    stir = Math.max(0, stir - dt * 1.6);
    // a few wake on their own; scrolling wakes more
    const wakes = (Math.random() < dt * 2.2 ? 1 : 0) + (stir > .2 && Math.random() < stir * .6 ? 2 : 0);
    for (let i = 0; i < wakes; i++) { const e = eyes[(Math.random() * eyes.length) | 0]; if (e) e.wake = now + R(1400, 4200); }
    for (const e of eyes) {
      let t = 0, ax = e.x, ay = e.y;
      if (active) { const d = Math.hypot(px - e.x, py - e.y); if (d < rad) t = Math.pow(1 - d / rad, .6); ax = px; ay = py; }
      if (e.wake > now) { t = Math.max(t, .92); if (!active) { ax = W / 2; ay = H * .45; } }
      e.tgt = t;
      e.open += (e.tgt - e.open) * (e.tgt > e.open ? .22 : .07);
      if (e.open > .55 && !e.blink && Math.random() < .004) e.blink = 1;
      if (e.blink) { e.blink += dt * 9; if (e.blink > 2) e.blink = 0; }
      const o = e.open * (e.blink ? Math.abs(1 - (e.blink - 1)) : 1), w = 8.5 * e.s;
      if (o < .06) {                                                // closed: a lash line
        g.strokeStyle = 'rgba(243,241,236,.075)'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(e.x - w * .8, e.y); g.quadraticCurveTo(e.x, e.y + 2.2 * e.s, e.x + w * .8, e.y); g.stroke();
        continue;
      }
      const h = 5.4 * e.s * o, dx = ax - e.x, dy = ay - e.y, dl = Math.hypot(dx, dy) || 1;
      e.lx += ((dx / dl) * Math.min(1, dl / 60) * w * .38 - e.lx) * .3; e.ly += ((dy / dl) * Math.min(1, dl / 60) * h * .35 - e.ly) * .3;
      g.save();
      g.beginPath(); g.moveTo(e.x - w, e.y); g.quadraticCurveTo(e.x, e.y - h * 2, e.x + w, e.y); g.quadraticCurveTo(e.x, e.y + h * 2, e.x - w, e.y); g.closePath();
      g.fillStyle = `rgba(236,231,220,${(.16 + o * .5).toFixed(3)})`; g.fill();
      g.clip();
      const ir = 3.6 * e.s, cx = e.x + e.lx, cy = e.y + e.ly;
      g.fillStyle = '#250709'; g.beginPath(); g.arc(cx, cy, ir, 0, 6.283); g.fill();
      g.strokeStyle = `rgba(255,59,59,${(.35 + o * .5).toFixed(3)})`; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, ir * .48, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx - ir * .35, cy - ir * .4, ir * .2, 0, 6.283); g.fill();
      g.restore();
      g.strokeStyle = `rgba(243,241,236,${(.12 + o * .4).toFixed(3)})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(e.x - w, e.y); g.quadraticCurveTo(e.x, e.y - h * 2, e.x + w, e.y); g.stroke();
    }
  }
  const onScroll = () => { const d = Math.abs(scrollY - lastY); lastY = scrollY; stir = Math.min(1.5, stir + d / 600); };
  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  layout(); raf = requestAnimationFrame(frame);
  addEventListener('resize', layout); addEventListener('scroll', onScroll, { passive: true }); document.addEventListener('visibilitychange', onVis);
  return { destroy() { cancelAnimationFrame(raf); removeEventListener('resize', layout); removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', onVis); } };
}

// every agent face on the page (.look groups inside .ava / .face svgs) and every watcher eye looks at your cursor
let lookRaf = 0, idleAt = 0;
function lookFrame() {
  lookRaf = 0;
  const els = document.querySelectorAll('svg.ava .look, svg.face .look, .weye .wi');
  if (!els.length) return;
  const active = performance.now() - pointer.at < 6000, rects = [];
  for (const el of els) { const svg = el.ownerSVGElement || el.closest('svg') || el; rects.push(svg.getBoundingClientRect()); }
  els.forEach((el, i) => {
    const r = rects[i]; if (r.bottom < -50 || r.top > innerHeight + 50 || !r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * (el.classList.contains('wi') ? .5 : .42);
    let dx = 0, dy = 0;
    if (active) { const vx = pointer.x - cx, vy = pointer.y - cy, d = Math.hypot(vx, vy) || 1, k = Math.min(1, d / 220); dx = vx / d * k; dy = vy / d * k; }
    if (el.classList.contains('wi')) el.style.transform = `translate(${(dx * 26).toFixed(1)}%,${(dy * 22).toFixed(1)}%)`;
    else el.setAttribute('transform', `translate(${(dx * 3.2).toFixed(2)},${(dy * 2.4).toFixed(2)})`);
  });
}
export function lookAll() { if (!lookRaf) lookRaf = requestAnimationFrame(lookFrame); }
if (!reduced) {
  addEventListener('pointermove', lookAll, { passive: true });
  addEventListener('scroll', lookAll, { passive: true });
  setInterval(() => { if (performance.now() - pointer.at > 6000 && performance.now() - idleAt > 6000) { idleAt = performance.now(); lookAll(); } }, 3000);
}
