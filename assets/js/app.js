// HIRE · the app: one shared poll of the company's state, a tiny router, the header, and the clocks.
import { markSvg, face } from './blob.js?v=2';
import { eyeField, lookAll } from './eyes.js?v=2';
import * as W from './wallet.js?v=2';
import { $, $$, api, post, short, until, copy, ensureWallet, esc } from './ui.js?v=2';
import * as P from './pages.js?v=2';

const main = $('#main');

// ---- the intro: a walk into HIRE HQ, once per visit, on the home page. click or any key skips it
(() => {
  const intro = document.getElementById('intro'); if (!intro) return;
  let seen = false; try { seen = sessionStorage.getItem('hire:intro') === '1'; } catch {}
  const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (seen || location.pathname !== '/' || !gl || matchMedia('(prefers-reduced-motion: reduce)').matches) { intro.remove(); return; }
  try { sessionStorage.setItem('hire:intro', '1'); } catch {}
  document.body.classList.add('intro-on');
  let started = false;
  const end = () => { document.body.classList.remove('intro-on'); if (intro.isConnected) { intro.classList.add('skip'); setTimeout(() => intro.remove(), 320); } };
  const giveUp = setTimeout(() => { if (!started) end(); }, 7000);          // slow connection: straight to the site
  intro.addEventListener('click', () => { if (!started) { clearTimeout(giveUp); end(); } });
  import('./intro3d.js?v=2').then(m => { if (!intro.isConnected) return; started = true; clearTimeout(giveUp); m.play(intro, () => document.body.classList.remove('intro-on')); })
    .catch(() => { clearTimeout(giveUp); end(); });
})();
let S = null, view = null, pollT = 0;
const ctx = { S: () => S, go, reveal };

// ---- the state everyone reads
let lastPay = null;
function payPill(S) {
  const p = S.log.find(l => l.kind === 'pays');
  if (!p) return; if (lastPay === null) { lastPay = p.id; return; }
  if (p.id <= lastPay) return; lastPay = p.id;
  if (location.pathname === '/') return;                     // the building already shows it at home
  const old = $('.paypill'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'paypill'; d.setAttribute('role', 'status');
  const amt = (/([0-9.]+) SOL/.exec(p.text) || [])[1] || '';
  d.innerHTML = `${face(p.agent, 34)}<div style="min-width:0"><b>+${esc(amt)} SOL paid to a human</b><span>${esc(p.text)}</span></div>`;
  d.addEventListener('click', () => { d.remove(); go('/payouts'); });
  document.body.appendChild(d);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 420); }, 6500);
}
async function poll() {
  clearTimeout(pollT);
  try { S = await api('state'); if (view && view.update) view.update(S); live(true); payPill(S); lookAll(); }
  catch { live(false); }
  pollT = setTimeout(poll, document.hidden ? 30000 : 5000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
function live(ok) { $$('.live .dot, .hqbar .dot').forEach(d => d.classList.toggle('off', !ok)); const l = $('.live span'); if (l) l.textContent = ok ? 'LIVE' : 'OFFLINE'; }

// ---- "someone is here": the agents only work while someone watches
let tab = ''; try { tab = sessionStorage.getItem('hire:tab') || ''; } catch {}
if (!tab) { tab = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8); try { sessionStorage.setItem('hire:tab', tab); } catch {} }
const here = () => { if (!document.hidden) post('here', { id: tab }).catch(() => {}); };
here(); setInterval(here, 45000);

// ---- routes
const ROUTES = [
  [/^\/$/, P.home, 'HIRE'],
  [/^\/jobs\/?$/, P.jobsPage, 'Jobs · HIRE'],
  [/^\/job\/([\w-]+)\/?$/, P.jobPage, 'Job · HIRE'],
  [/^\/payouts\/?$/, P.payoutsPage, 'Payouts · HIRE'],
  [/^\/wallet\/?$/, (m, c) => P.payoutsPage(m, c, null, true), 'Public wallet · HIRE'],
  [/^\/humans\/?$/, P.humansPage, 'Humans · HIRE'],
  [/^\/agents\/?$/, P.agentsPage, 'Agents · HIRE'],
  [/^\/agent\/(\w+)\/?$/, P.agentPage, 'Agent · HIRE'],
  [/^\/proofs\/?$/, P.proofsPage, 'Proofs · HIRE'],
  [/^\/docs\/?$/, P.docsPage, 'Docs · HIRE'],
  [/^\/me\/?$/, P.mePage, 'Your jobs · HIRE'],
];
function render() {
  if (view && view.destroy) try { view.destroy(); } catch {}
  const path = location.pathname;
  let hit = null;
  for (const [re, fn, title] of ROUTES) { const m = re.exec(path); if (m) { hit = { fn, args: m.slice(1), title }; break; } }
  main.innerHTML = '';
  view = hit ? hit.fn(main, ctx, ...hit.args) : P.notFound(main);
  document.title = hit ? hit.title : 'HIRE';
  $$('.nav a, .navm a').forEach(a => { const h = a.getAttribute('href'); a.classList.toggle('on', h === '/' ? path === '/' : path.startsWith(h.replace(/s$/, ''))); });
  if (S && view && view.update) view.update(S);
  reveal();
  if (location.hash) setTimeout(() => { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }, 60);
}
function go(path) {
  if (path === location.pathname + location.hash) return;
  history.pushState(null, '', path); render();
  if (!location.hash) scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-copy]'); if (c) { e.preventDefault(); copy(c); return; }
  const a = e.target.closest('a[href]'); if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  const href = a.getAttribute('href');
  if (href.startsWith('#')) { const t = document.getElementById(href.slice(1)); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); history.replaceState(null, '', href); } return; }
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
  e.preventDefault(); go(href);
});
addEventListener('popstate', render);

// ---- reveal on scroll, and every countdown on the page
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
function reveal() { $$('.rv:not(.vis)').forEach(el => io.observe(el)); }
setInterval(() => { $$('[data-until]').forEach(el => { const v = until(el.dataset.until); if (el.textContent !== v) el.textContent = v; }); }, 1000);

// ---- header: the wallet button
function wbtn() {
  const b = $('#wbtn'), c = W.current();
  if (c) { b.classList.add('on'); b.innerHTML = `${c.icon ? `<img src="${esc(c.icon)}" alt="">` : ''}<span class="mono">${esc(short(c.address))}</span>`; b.title = 'Your jobs'; }
  else { b.classList.remove('on'); b.textContent = 'Connect'; b.title = 'Connect a wallet'; }
}
$('#wbtn').addEventListener('click', async () => { if (W.current()) return go('/me'); try { await ensureWallet(); go('/me'); } catch {} });
W.onChange(wbtn); W.onWallets(() => { W.resume(); });
$('.brand').insertAdjacentHTML('afterbegin', markSvg(34));
wbtn(); render(); poll(); setTimeout(() => W.resume(), 400);
{ const ef = document.getElementById('eyefield'); if (ef) eyeField(ef); }
