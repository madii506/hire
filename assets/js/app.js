// HIRE · the terminal: the intro, one shared poll of the state, the router, the windows (tabs), the panes and
// the keys that move between them, the command line (with completion and scrollback), the status line and the clocks.
import * as W from './wallet.js?v=6';
import { AG, label, find } from './agents.js?v=6';
import { $, $$, api, post, short, sol, until, ago, copy, ensureWallet, esc, toast, modal, catalog, KIND, KINDL, showVal, lineText, txLink } from './ui.js?v=6';
import * as P from './pages.js?v=6';

const main = $('#main');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- the intro: a walk into HIRE HQ, once per visit, on the home page. click or any key skips it
let introDone = Promise.resolve(), introPlayed = false;
(() => {
  const intro = document.getElementById('intro'); if (!intro) return;
  let seen = false; try { seen = sessionStorage.getItem('hire:intro') === '1'; } catch {}
  const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (seen || location.pathname !== '/' || !gl || reduced) { intro.remove(); return; }
  try { sessionStorage.setItem('hire:intro', '1'); } catch {}
  document.body.classList.add('intro-on'); introPlayed = true;
  let started = false, resolve;
  introDone = new Promise(r => { resolve = r; });
  const end = () => { document.body.classList.remove('intro-on'); resolve(); if (intro.isConnected) { intro.classList.add('skip'); setTimeout(() => intro.remove(), 320); } };
  const giveUp = setTimeout(() => { if (!started) end(); }, 7000);          // slow connection: straight to the terminal
  intro.addEventListener('click', () => { if (!started) { clearTimeout(giveUp); end(); } });
  import('./intro3d.js?v=6').then(m => { if (!intro.isConnected) return; started = true; clearTimeout(giveUp); m.play(intro, () => { document.body.classList.remove('intro-on'); resolve(); }); })
    .catch(() => { clearTimeout(giveUp); end(); });
})();

let S = null, view = null, pollT = 0;
const ctx = { S: () => S, go, grep: '' };
let firstState = () => {};

// ---- windows
const TABS = [['/', 'hq'], ['/jobs', 'tasks'], ['/data', 'data'], ['/proofs', 'proofs'], ['/wallet', 'wallet'], ['/agents', 'agents'], ['/humans', 'humans'], ['/docs', 'docs']];
$('#tabs').innerHTML = TABS.map(([h, t], i) => `<a href="${h}"><i>${i + 1}</i>${t}</a>`).join('');
const ROUTES = [
  [/^\/$/, P.home, 'HIRE', '~'],
  [/^\/(?:jobs|tasks)\/?$/, P.jobsPage, 'tasks · HIRE', '~/tasks'],
  [/^\/(?:job|task)\/([\w-]+)\/?$/, P.jobPage, 'task · HIRE', '~/tasks'],
  [/^\/data\/?$/, P.dataPage, 'data · HIRE', '~/data'],
  [/^\/proofs\/?$/, P.proofsPage, 'proofs · HIRE', '~/proofs'],
  [/^\/(?:wallet|payouts)\/?$/, P.walletPage, 'wallet · HIRE', '~/wallet'],
  [/^\/agents\/?$/, P.agentsPage, 'agents · HIRE', '~/agents'],
  [/^\/agent\/([\w-]+)\/?$/, P.agentPage, 'agents · HIRE', '~/agents'],
  [/^\/humans\/?$/, P.humansPage, 'humans · HIRE', '~/humans'],
  [/^\/(?:docs|rules)\/?$/, P.docsPage, 'docs · HIRE', '~/docs'],
  [/^\/me\/?$/, P.mePage, 'me · HIRE', '~/me'],
];
let cwd = '~', enterT = 0;
function drawIn() {                                            // the panes draw in, one after another
  const tui = main.querySelector('.tui'); if (!tui || reduced || document.body.classList.contains('intro-on')) return;
  const k = [...tui.children]; k.forEach((c, i) => c.style.setProperty('--i', i));
  tui.classList.remove('enter'); void tui.offsetWidth; tui.classList.add('enter');
  clearTimeout(enterT); enterT = setTimeout(() => tui.classList.remove('enter'), 420 + k.length * 55);
}
introDone.then(() => { if (introPlayed) setTimeout(drawIn, 30); });                  // after the walk in, you land in the terminal as it draws
function render() {
  if (view && view.destroy) try { view.destroy(); } catch {}
  const path = location.pathname;
  let hit = null;
  for (const [re, fn, title, dir] of ROUTES) { const m = re.exec(path); if (m) { hit = { fn, args: m.slice(1), title, dir }; break; } }
  main.innerHTML = '';
  view = hit ? hit.fn(main, ctx, ...hit.args) : P.notFound(main);
  document.title = hit ? hit.title : 'HIRE';
  drawIn();
  document.body.classList.toggle('tui-on', !!main.querySelector('.tui'));
  cwd = hit ? hit.dir : path; $('#cwd').textContent = cwd;
  const tab = path === '/' ? '/' : (TABS.find(([h]) => h !== '/' && (path === h || path.startsWith(h.replace(/s$/, '')) || (h === '/jobs' && /^\/(tasks?|job)\b/.test(path)) || (h === '/wallet' && path === '/payouts') || (h === '/docs' && path === '/rules'))) || [])[0];
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === tab));
  const on = $('#tabs a.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (S && view && view.update) view.update(S);
  focusPane(null);
  tmux();
  if (path === '/rules' && view && view.scrollTo) setTimeout(() => view.scrollTo('rules'), 60);
  else if (location.hash && !(view && view.scrollTo)) setTimeout(() => { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }, 80);
}
function go(path) {
  if (path === location.pathname + location.hash) return;
  const [p, h] = path.split('#');
  if (p === location.pathname && h) { if (view && view.scrollTo) { view.scrollTo(h); history.replaceState(null, '', path); return; } const t = document.getElementById(h); if (t) { t.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', path); return; } }
  history.pushState(null, '', path); render();
  if (!location.hash) scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}
document.addEventListener('hire:go', e => go(e.detail));
document.addEventListener('click', e => {
  if (e.defaultPrevented) return;
  const c = e.target.closest('[data-copy]'); if (c) { e.preventDefault(); copy(c); return; }
  const a = e.target.closest('a[href]'); if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  const href = a.getAttribute('href');
  if (href.startsWith('#')) { e.preventDefault(); if (view && view.scrollTo) view.scrollTo(href.slice(1)); else { const t = document.getElementById(href.slice(1)); if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); } history.replaceState(null, '', href); return; }
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
  e.preventDefault(); go(href);
});
addEventListener('popstate', render);

// ---- panes: focus one (click it, or tab through them), move through its rows with j / k, open with enter
let focused = null;
function focusPane(p) { $$('.pane.focus').forEach(x => x.classList.remove('focus')); focused = p; if (p) p.classList.add('focus'); }
document.addEventListener('mousedown', e => { const p = e.target.closest('.tui [data-pane]'); if (p) focusPane(p); });
function moveSel(d) {
  const p = focused || $('.tui [data-pane]'); if (!p) return;
  if (!focused) focusPane(p);
  const items = $$('[data-href]', p).filter(x => x.offsetParent !== null);
  if (!items.length) { const pb = $('.pb', p); if (pb) pb.scrollBy({ top: d * 60 }); return; }
  let i = items.findIndex(x => x.classList.contains('sel'));
  i = i < 0 ? (d > 0 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, i + d));
  items.forEach(x => x.classList.remove('sel')); const r = items[i]; r.classList.add('sel'); r.scrollIntoView({ block: 'nearest' });
  if (r.dataset.key) r.dispatchEvent(new CustomEvent('hire:sel', { bubbles: true, detail: r.dataset.key }));
}
function openSel() { const p = focused; if (!p) return; const r = $('[data-href].sel', p); if (r && r.dataset.href && r.dataset.href !== '#sel') go(r.dataset.href); }
function helpKeys() {
  modal('keys', `<div class="keys-help">${[['1 - 8', 'switch window'], ['tab', 'next pane'], ['shift tab', 'previous pane'], ['j  ↓', 'next row'], ['k  ↑', 'previous row'], ['enter', 'open the row'], ['g · G', 'top · bottom of the pane'],
    ['/  :', 'command line'], ['esc', 'close · leave the line'], ['?', 'this list']].map(([k, d]) => `<div><kbd>${k}</kbd><span>${d}</span></div>`).join('')}</div><p class="dim" style="margin:14px 0 0;font-size:12.5px">type <b class="amb">help</b> in the command line for every command.</p>`);
}

// ---- the state everyone reads
let lastPay = null;
function paidBar(S) {
  const p = S.log.find(l => l.kind === 'pays');
  if (!p) return; if (lastPay === null) { lastPay = p.id; return; }
  if (p.id <= lastPay) return; lastPay = p.id;
  const old = $('.paidbar'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'paidbar'; d.setAttribute('role', 'status');
  d.innerHTML = `<span>&gt;&gt;&gt; PAID ${esc(p.text)} · ${esc(label(p.agent))}</span>`;
  d.addEventListener('click', () => { d.remove(); go('/wallet'); });
  document.body.appendChild(d);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 7000);
}
async function poll() {
  clearTimeout(pollT);
  try { S = await api('state'); firstState(S); if (view && view.update) view.update(S); live(true); paidBar(S); tmux(); }
  catch { live(false); }
  pollT = setTimeout(poll, document.hidden ? 30000 : 5000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
let isLive = null;
function live(ok) { isLive = ok; $('#livesq').classList.toggle('off', !ok); $('#livetx').textContent = ok ? 'LIVE' : 'OFFLINE'; }
function tmux() {
  const t = $('#tmux'); if (!t) return;
  const seg = S ? [`wallet<b>${sol(S.wallet.lamports, 4)}</b>`, `open<b>${S.stats.open}</b>`, `paid<b>${sol(S.stats.paidLamports, 3)}</b>`, `values<b>${S.stats.values}</b>`, `obs<b>${Math.max(1, S.stats.watching)}</b>`] : ['connecting…'];
  const nt = S && S.tickAt ? Math.max(0, Math.round((S.tickAt + 60000 - Date.now()) / 1000)) : null;
  t.innerHTML = `<span class="s0">[hire]</span><span>${esc(cwd)}*</span>${ctx.grep ? `<span>grep<b>${esc(ctx.grep)}</b></span>` : ''}<span class="gap"></span>${seg.map((s, i) => `<span class="${i >= 3 ? 'hm' : ''}">${s}</span>`).join('')}<span class="hm">tick<b>${nt == null ? '—' : nt + 's'}</b></span><span class="hm">${isLive === false ? 'offline' : 'live'}</span>`;
}

// ---- "someone is here": the agents only work while someone watches
let tab = ''; try { tab = sessionStorage.getItem('hire:tab') || ''; } catch {}
if (!tab) { tab = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8); try { sessionStorage.setItem('hire:tab', tab); } catch {} }
const here = () => { if (!document.hidden) post('here', { id: tab }).catch(() => {}); };
here(); setInterval(here, 45000);

// ---- the clocks: UTC in the corner, every countdown, the next tick
const pad = n => String(n).padStart(2, '0');
setInterval(() => {
  const d = new Date(); $('#clock').textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  if (S && S.usd) $('#solpx').textContent = `SOL $${(+S.usd).toFixed(2)}`;
  $$('[data-until]').forEach(el => { const v = until(el.dataset.until); if (el.textContent !== v) el.textContent = v; });
  $$('[data-tick]').forEach(el => { const s = Math.round((+el.dataset.tick - Date.now()) / 1000); el.textContent = s > 0 ? s + 's' : 'now'; });
  const now = Date.now();
  $$('[data-tickbar]').forEach(el => {                       // the bar under the log fills toward the next tick
    const i = el.querySelector('.tb i'), b = el.querySelector('b'), at = S && S.tickAt; if (!i || !b) return;
    if (!at) { b.textContent = '—'; i.style.width = '0'; return; }
    const left = Math.max(0, at + 60000 - now), w = (1 - left / 60000) * 100;
    if (w < (+i.dataset.w || 0) - 1) { i.style.transition = 'none'; i.style.width = w.toFixed(1) + '%'; void i.offsetWidth; i.style.transition = ''; } else i.style.width = w.toFixed(1) + '%';
    i.dataset.w = w; b.textContent = left > 0 ? Math.ceil(left / 1000) + 's' : 'now';
  });
  $$('.tl[data-to]').forEach(el => { const a = +new Date(el.dataset.from), z = +new Date(el.dataset.to), f = Math.max(0, Math.min(1, (z - now) / Math.max(1, z - a))); if (el.firstElementChild) el.firstElementChild.style.width = (f * 100).toFixed(1) + '%'; el.classList.toggle('low', f < .15); });
  $$('[data-up]').forEach(el => { if (el.dataset.up) { const v = P.upFor(el.dataset.up); if (el.textContent !== v) el.textContent = v; } });
  tmux();
}, 1000);

// ---- the wallet button
function wbtn() {
  const b = $('#wbtn'), c = W.current();
  if (c) { b.classList.add('on'); b.innerHTML = `${c.icon ? `<img src="${esc(c.icon)}" alt="">` : ''}<span>${esc(short(c.address))}</span>`; b.title = 'your session'; }
  else { b.classList.remove('on'); b.innerHTML = '<span>[ connect ]</span>'; b.title = 'connect a wallet'; }
}
$('#wbtn').addEventListener('click', async () => { if (W.current()) return go('/me'); try { await ensureWallet(); go('/me'); } catch {} });
W.onChange(wbtn); W.onWallets(() => { W.resume(); });

// ---- the command line: commands, completion (ghost text + tab), history, scrollback
const cmd = $('#cmd'), out = $('#cliout');
cmd.insertAdjacentHTML('beforebegin', '<span class="cmdwrap" id="cmdwrap"></span>');
const wrap = $('#cmdwrap'); wrap.appendChild(cmd); wrap.insertAdjacentHTML('afterbegin', '<span class="ghost" id="ghost" aria-hidden="true"></span>');
const ghost = $('#ghost');
let hist = []; try { hist = JSON.parse(sessionStorage.getItem('hire:hist') || '[]'); } catch {}
let hi = hist.length, scroll = '';
const print = html => { scroll += (scroll ? '\n' : '') + html; if (scroll.length > 30000) scroll = scroll.slice(-24000); out.hidden = false; out.innerHTML = `<button class="x" data-x type="button">esc</button>${scroll}`; out.scrollTop = out.scrollHeight; };
const closeOut = () => { out.hidden = true; };
const clearOut = () => { scroll = ''; out.hidden = true; out.innerHTML = ''; };
out.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeOut(); else if (e.target.closest('a[href^="/"]')) closeOut(); });
// windows: type the name, or cd into it
const NAV = { hq: '/', home: '/', '~': '/', tasks: '/jobs', board: '/jobs', data: '/data', map: '/data', proofs: '/proofs', wall: '/proofs', wallet: '/wallet', ledger: '/wallet',
  agents: '/agents', humans: '/humans', docs: '/docs', rules: '/rules', me: '/me', protocol: '/docs#protocol' };
const HELP = [
  ['windows', [['hq · tasks · data · proofs', ''], ['wallet · agents · humans · docs · me', 'or cd <name>']]],
  ['jobs', [['rates', 'the rate card: all 13 jobs and what they pay'], ['job <key>', 'one job in full: job trade, job shill'], ['ls /tasks', 'the tasks open right now'], ['task <no>', 'open a task: task 7']]],
  ['system', [['ps', 'the ten processes, what they are doing'], ['tail [n]', 'the last n log lines'], ['uptime · free · uname', 'clock, today\'s budget, the system'], ['neofetch', 'everything at once'], ['status', 'the full status']]],
  ['money', [['paid [n]', 'the last payouts, with their transactions'], ['values [n]', 'the last verified values'], ['humans', 'who got paid the most']]],
  ['files', [['ls [path]', 'ls /, ls /proc, ls /etc/hire'], ['cat <file>', 'cat /etc/hire/rates, cat /proc/desk'], ['man [topic|job]', 'man jobs, man rules, man trade']]],
  ['you', [['whoami · connect · disconnect', 'your wallet'], ['sim', 'simulate a payout on mainnet. nothing is sent']]],
  ['shell', [['grep <text>', 'filter the hq log (grep alone clears it)'], ['history · clear · date · echo · pwd · exit', '']]],
];
const TOPICS = ['what', 'protocol', 'jobs', 'procs', 'proof', 'wallet', 'budget', 'limits', 'minds', 'sign', 'payout', 'rules', 'api', 'test'];
const FILES = ['/etc/hire/rates', '/etc/hire/never.conf', '/etc/hire/limits.conf', '/var/log/hire', ...AG.map(a => '/proc/' + a.id)];
let SUGG = [...new Set(['help', 'hq', 'tasks', 'rates', 'job ', 'task ', 'ls', 'ls /tasks', 'ls /proc', 'ls /etc/hire', 'cat ', 'ps', 'tail', 'tail 30', 'uptime', 'free', 'uname -a', 'neofetch', 'paid', 'values', 'humans',
  'data', 'map', 'proofs', 'wallet', 'agents', 'agent ', 'docs', 'man', 'grep ', 'status', 'whoami', 'connect', 'disconnect', 'me', 'sim', 'history', 'clear', 'cd ', 'date', 'echo ',
  ...AG.map(a => 'agent ' + a.id), ...TOPICS.map(t => 'man ' + t), ...FILES.map(f => 'cat ' + f)])];
catalog().then(c => { SUGG = [...new Set(SUGG.concat(c.jobs.map(j => 'job ' + j.key), c.jobs.map(j => 'man ' + j.key)))]; }).catch(() => {});
const suggest = v => { if (!v) return ''; const l = v.toLowerCase(); const m = SUGG.find(x => x.startsWith(l) && x !== l); return m ? v + m.slice(v.length) : ''; };
const paint = () => { const v = cmd.value, s = suggest(v); ghost.innerHTML = s ? `<i>${esc(v)}</i>${esc(s.slice(v.length))}` : ''; };
cmd.addEventListener('input', paint); cmd.addEventListener('blur', () => { ghost.innerHTML = ''; });

// printing: fixed columns, real figures only (from the last state the terminal read, or the rate card)
const col = (v, n) => { const t = String(v == null ? '' : v); return t.length > n ? t.slice(0, n - 1) + '…' : t.padEnd(n); };
const rc = (v, n) => String(v == null ? '' : v).padStart(n);
const tb = rows => `<span class="tb">${rows.join('\n')}</span>`;
const hd = t => `<span class="h">${esc(t)}</span>`, am = t => `<span class="a">${esc(t)}</span>`, dm = t => `<span class="dim">${esc(t)}</span>`;
const need = () => S ? null : 'connecting to hire-os… try again in a second.';
const ago2 = at => { const s = Math.max(0, Math.round((Date.now() - new Date(at)) / 1000)); return s < 60 ? s + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd'; };
const procState = a => { const now = Date.now(), w = (S.world || {})[a.id], l = S.log.find(x => x.agent === a.id);
  if (w && ['reviewing', 'paying', 'posting'].includes(w.state) && now - new Date(w.at) < 2 * 60000) return w.state;
  return l && now - new Date(l.at) < 3 * 60000 ? 'active' : 'idle'; };
function psText() {
  const act = S.act15 || {};
  return tb([hd(`${col('PID', 8)}${col('PROC', 10)}${col('STATE', 11)}${rc('OPEN', 5)}${rc('TASKS', 7)}${rc('PAID', 6)}${rc('LINES/15M', 11)}  LAST`),
    ...AG.map(a => { const f = (S.agents || {})[a.id] || { tasks: 0, paid: 0 }, st = procState(a), l = S.log.find(x => x.agent === a.id);
      return `${col(a.label, 8)}${col(a.id, 10)}${st === 'idle' ? dm(col(st, 11)) : am(col(st, 11))}${rc(S.jobs.filter(j => j.agent === a.id).length, 5)}${rc(f.tasks, 7)}${rc(f.paid, 6)}${rc(+act[a.id] || 0, 11)}  ${l ? ago2(l.at) + ' ago' : '—'}`; })])
    + `\n${dm(`${AG.length} processes · ${AG.filter(a => procState(a) !== 'idle').length} active · cd agents for top`)}`;
}
const KT = { posts: 'POST', pays: 'PAID', hires: 'TAKE', boot: 'BOOT', thinks: 'NOTE', says: 'SAYS' };
function tailText(n) {
  const L = S.log.slice(0, n).reverse();
  if (!L.length) return dm('the log is empty.');
  return L.map(l => { const t = new Date(l.at), k = l.kind === 'reviews' ? (/^FAIL/.test(l.text) ? 'FAIL' : 'PASS') : KT[l.kind] || l.kind.slice(0, 4).toUpperCase();
    return `${dm(t.toISOString().slice(11, 19))} ${col(label(l.agent), 6)} ${['PAID', 'POST', 'PASS'].includes(k) ? am(k) : k === 'FAIL' ? `<span class="er">${k}</span>` : dm(k)}  ${l.target ? dm('→' + label(l.target) + ' ') : ''}${esc(lineText(l))}`; }).join('\n');
}
function rateText(c) {
  return tb([hd(`${col('KEY', 10)}${col('JOB', 24)}${rc('SOL', 5)}  ${col('PROC', 9)}${col('PROOF', 24)}REPORT`),
    ...c.jobs.map(j => `${am(col(j.key, 10))}${col(j.title, 24)}${am(rc(j.sol.toFixed(2), 5))}  ${col(j.agent, 9)}${col(KIND[j.kind], 24)}${esc(j.ask)}`)])
    + `\n${dm(`${c.jobs.length} jobs · ${Math.min(...c.jobs.map(j => j.sol))}–${Math.max(...c.jobs.map(j => j.sol))} SOL · posted at random by the process in PROC · job <key> for one in full`)}`;
}
function specText(T) {
  const ind = a => a.map((x, i) => (i ? ' '.repeat(10) : '') + x).join('\n');
  return `${am(T.title.toUpperCase())}  ${dm(`· ${T.sol} SOL a human · ${label(T.agent)} ${T.agent} · up to ${T.slots} humans a post · open ${Math.round(T.minutes / 60)} h`)}\n`
    + `${hd(col('do', 10))}${esc(T.brief)}\n${T.pick && T.pick.length > 1 ? `${hd(col('picked', 10))}${esc(T.pick.join(' · '))}\n` : ''}`
    + `${hd(col('proof', 10))}${esc(T.proof)}\n${' '.repeat(10)}${dm(KINDL[T.kind])}\n${hd(col('report', 10))}${esc(T.ask)}\n`
    + `${hd(col('steps', 10))}${ind(T.steps.map((x, i) => `${i + 1}. ${esc(x)}`))}\n${hd(col('checked', 10))}${ind(T.checks.map(x => '· ' + esc(x)))}\n${hd(col('never', 10))}${ind(T.limits.map(x => '· ' + esc(x)))}\n`
    + `${hd(col('why', 10))}${dm(T.why)}${T.file ? `\n${hd(col('poster', 10))}<a href="${esc(T.file)}" download>download the poster</a>` : ''}${T.text ? `\n${hd(col('pitch', 10))}${esc(T.text)}` : ''}`;
}
function tasksText() {
  if (!S.jobs.length) return dm(S.wallet.funded ? 'no open tasks right now. new ones go up every few minutes while someone is watching.' : 'no open tasks yet. the first one goes up the minute the public wallet is funded. rates shows what they will be.');
  return tb([hd(`${col('#', 6)}${col('TASK', 34)}${rc('SOL', 6)}  ${col('PROC', 7)}${col('SPOTS', 7)}CLOSES`),
    ...S.jobs.map(j => `${dm(col('#' + j.no, 6))}<a href="/job/${esc(j.id)}">${esc(col(j.title, 34))}</a>${am(rc(sol(j.bounty), 6))}  ${col(label(j.agent), 7)}${col(`${Math.max(0, j.slots - j.taken)}/${j.slots}`, 7)}${until(j.expires)}`)])
    + `\n${dm('task <no> to open one')}`;
}
function paidText(n) {
  const P0 = S.payouts.slice(0, n); if (!P0.length) return dm('no payouts yet. the first one prints here the second it lands.');
  return tb([hd(`${col('WHEN', 6)}${rc('SOL', 7)}  ${col('TO', 11)}${col('TASK', 36)}TX`),
    ...P0.map(p => `${col(ago2(p.at), 6)}${am(rc('+' + sol(p.lamports), 7))}  ${col(short(p.wallet), 11)}${esc(col(`#${p.no || ''} ${p.title}`, 36))}${txLink(p.sig)}`)]);
}
function valuesText(n) {
  const D = (S.data || []).slice(0, n); if (!D.length) return dm('no verified values yet. each one prints here the second its proof passes.');
  return tb([hd(`${col('#', 6)}${col('MEASURED', 30)}${col('VALUE', 26)}${col('PLACE', 12)}WHEN`),
    ...D.map(d => `${dm(col('#' + d.no, 6))}${esc(col(d.ask || d.title, 30))}${am(col(showVal(d.answer || '—'), 26))}${esc(col(d.place || '—', 12))}${ago2(d.at)}`)]);
}
function freeText() {
  const w = S.wallet, R = S.rules, used = (w.spent || 0) + (w.owed || 0), f = x => rc(sol(x, 4), 10);
  return tb([hd(`${col('', 10)}${rc('total', 10)}${rc('used', 10)}${rc('free', 10)}`), `${col('today', 10)}${f(w.day)}${f(used)}${am(f(w.left))}  SOL`, `${col('wallet', 10)}${f(w.lamports)}${f(w.day)}${f(Math.max(0, w.lamports - w.day))}  SOL`])
    + `\n${dm(`today = ${Math.round(R.dayPct * 100)}% of the wallet, at most ${R.dayMax} SOL · used today = paid ${sol(w.spent, 3)} + promised ${sol(w.owed, 3)} · the rest of the wallet waits for later days · ${R.reserve} SOL always kept for fees`)}`;
}
const uptimeText = () => `up ${P.upFor(S.stats.since)} · ${AG.length} processes · load average: ${(S.stats.load || [0, 0, 0]).map(x => (+x).toFixed(2)).join(', ')} lines/min`;
const unameText = (all, c) => all ? `hire-os 5 hq solana-mainnet · ${AG.length} processes · rate card ${c ? c.jobs.length : 13} jobs · ${S ? `${S.rules.text} · ${S.rules.vision}` : ''}` : 'hire-os';
function fetchText(c) {
  const w = S.wallet, st = S.stats;
  const logo = ['    ╭──────╮    ', '╭───┴──────┴───╮', '│              │', '├──────▣───────┤', '│              │', '╰──────────────╯', '', ''];
  const kv = [[am('hire@hq'), ''], [dm('───────'), ''], ['os', 'hire-os 5 · solana mainnet'], ['procs', `${AG.length}: ${AG.map(a => a.id).join(' ')}`], ['rate card', c ? `${c.jobs.length} jobs · ${Math.min(...c.jobs.map(j => j.sol))}–${Math.max(...c.jobs.map(j => j.sol))} SOL` : '—'],
    ['tasks', `${st.open} open · ${st.working} working · ${st.review} in review`], ['paid', `${sol(st.paidLamports, 3)} SOL to ${st.humans} humans`], ['wallet', `${sol(w.lamports, 4)} SOL · ${w.funded ? 'funded' : 'waiting for funds'}`],
    ['uptime', P.upFor(st.since)], ['models', `${S.rules.text} · ${S.rules.vision}`]];
  return kv.map((x, i) => `${am(logo[i] || ' '.repeat(16))}   ${x[1] === '' ? x[0] : `${hd(col(x[0], 11))}${esc(x[1])}`}`).join('\n');
}
function statusText() {
  const w = S.wallet, st = S.stats, tk = S.tickAt ? Math.round((Date.now() - S.tickAt) / 1000) + 's ago' : '—';
  return [['hire-os', `up ${P.upFor(st.since)} · ${AG.length}/${AG.length} processes`], ['balance', `${sol(w.lamports, 4)} SOL${S.usd ? ` (≈ $${((w.lamports / 1e9) * S.usd).toFixed(2)})` : ''}`], ['budget', `${sol(w.left, 4)} SOL left today · ${w.funded ? 'funded' : 'waiting for funds'}`],
    ['queue', `${st.open} open · ${st.working} working · ${st.review} in review`], ['paid', `${sol(st.paidLamports, 4)} SOL to ${st.humans} humans`], ['values', `${st.values} verified`], ['pay time', st.medianPay == null ? '—' : `${st.medianPay}s median`],
    ['observers', `${Math.max(1, st.watching)}`], ['last tick', tk], ['models', `${S.rules.text} · ${S.rules.vision}`]].map(([k, v]) => `${hd(k.padEnd(12))}${esc(v)}`).join('\n');
}
async function lsText(path) {
  const p = (path || '/').replace(/\/+$/, '') || '/';
  if (p === '/' || p === '~' || p === '.') return tb([`${am('tasks/')}   ${am('data/')}   ${am('proofs/')}   ${am('wallet/')}   ${am('agents/')}   ${am('humans/')}   ${am('docs/')}   ${am('me/')}`, `${am('etc/hire/')}   ${am('proc/')}   ${am('var/log/')}`])
    + `\n${dm('cd <dir> to open a window · ls /tasks · ls /proc · ls /etc/hire · cat <file>')}`;
  if (/^\/?(tasks|jobs)$/.test(p)) return tasksText();
  if (/^\/?proc$/.test(p)) return tb(AG.map(a => `${am(col(a.id + '/', 10))}${col(a.label, 8)}${dm(a.desc)}`));
  if (/^\/?etc(\/hire)?$/.test(p)) return tb(['rates', 'never.conf', 'limits.conf'].map(f => am(f))) + `\n${dm('cat /etc/hire/<file>')}`;
  if (/^\/?var(\/log)?$/.test(p)) return am('hire') + `\n${dm('cat /var/log/hire, or tail [n]')}`;
  if (NAV[p.replace(/^\//, '')]) return dm(`${p} is a window. cd ${p.replace(/^\//, '')} to open it.`);
  return `<span class="er">ls: ${esc(path)}: no such directory</span>`;
}
async function catText(f) {
  const p = String(f || '').replace(/^~/, '');
  if (/^\/?etc\/hire\/rates?$/.test(p)) return rateText(await catalog());
  if (/^\/?etc\/hire\/never(\.conf)?$/.test(p)) return [hd('# /etc/hire/never.conf · the rate card is written to these, and a proof is turned down if it breaks one'), ...P.RULES.map(x => '- ' + esc(x))].join('\n');
  if (/^\/?etc\/hire\/limits(\.conf)?$/.test(p)) { const r = S.rules; return [hd('# /etc/hire/limits.conf · read live from the server'), ...[['pay', `${r.minBounty} – ${r.maxBounty} SOL per human, fixed by the rate card`], ['day_budget', `${Math.round(r.dayPct * 100)}% of the wallet, max ${r.dayMax} SOL`], ['reserve', `${r.reserve} SOL kept for fees`], ['open_tasks_max', r.maxOpen], ['new_task_every', `${r.jobEveryMin} min, only while someone watches`], ['claim_window', `${r.claimMin} min`], ['proofs_per_claim', r.tries], ['paid_per_wallet_day', r.perWalletDay], ['tasks_per_connection_day', r.perIpDay], ['pass_confidence', `>= ${r.passAt}`]].map(([k, v]) => `${am(k.padEnd(25))}= ${esc(String(v))}`)].join('\n'); }
  if (/^\/?var\/log\/hire$/.test(p)) return tailText(30);
  const m = /^\/?proc\/([\w-]+)(\/status)?$/.exec(p);
  if (m) { const a = find(m[1]); if (!a) return `<span class="er">cat: ${esc(f)}: no such process</span>`; const c = await catalog().catch(() => null), fig = (S.agents || {})[a.id] || { tasks: 0, paid: 0, lamports: 0, rejected: 0 }, mine = c ? c.jobs.filter(j => j.agent === a.id) : [];
    return [`${hd(col('pid', 10))}${am(a.label)}`, `${hd(col('name', 10))}${a.id}`, `${hd(col('function', 10))}${esc(a.desc)}`, `${hd(col('state', 10))}${procState(a)}`, `${hd(col('posts', 10))}${mine.map(j => `${esc(j.title)} ${am(j.sol + ' SOL')}`).join(' · ') || '—'}`,
      `${hd(col('tasks', 10))}${fig.tasks} posted · ${S.jobs.filter(j => j.agent === a.id).length} open`, `${hd(col('humans', 10))}${fig.paid} paid · ${fig.rejected} failed`, `${hd(col('sol out', 10))}${sol(fig.lamports, 4)} SOL`, `${hd(col('lines/15m', 10))}${+(S.act15 || {})[a.id] || 0}`].join('\n'); }
  if (!f) return 'usage: cat &lt;file&gt;\n' + dm(FILES.join('  '));
  return `<span class="er">cat: ${esc(f)}: no such file</span>  ${dm('ls / for what is there')}`;
}

async function run(raw) {
  raw = raw.trim(); if (!raw) return;
  hist = hist.filter(h => h !== raw).concat(raw).slice(-60); hi = hist.length; try { sessionStorage.setItem('hire:hist', JSON.stringify(hist)); } catch {}
  const [c0, ...args] = raw.split(/\s+/), c = c0.toLowerCase().replace(/^\/+/, ''), echo = `<span class="in">${esc(cwd)} $ ${esc(raw)}</span>`;
  const say = html => print(echo + '\n' + html);
  const num = (d, mx) => Math.max(1, Math.min(mx, parseInt(args.find(x => /^\d+$/.test(x.replace(/^-n/, ''))) && args.find(x => /^\d+$/.test(x.replace(/^-n/, ''))).replace(/^-n/, ''), 10) || d));
  if (c === 'help' || c === '?' || c === 'commands') return say(HELP.map(([g, rows]) => `${am(g)}\n` + rows.map(([k, d]) => `  ${esc(k.padEnd(40))}${dm(d)}`).join('\n')).join('\n') + `\n\n${dm('keys: 1-8 windows · tab panes · j k rows · enter open · / here · ? keys · tab completes a command')}`);
  if (c === 'clear' || c === 'cls') return clearOut();
  if (c === 'exit' || c === 'q') return closeOut();
  if (c === 'history') return say(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join('\n'));
  if (c === 'echo') return say(esc(args.join(' ')));
  if (c === 'cd') { const t = (args[0] || '~').replace(/^~\/?|^\/+/, '').replace(/\/$/, ''); const to = t === '' ? '/' : NAV[t]; if (to) { closeOut(); return go(to); } return say(`<span class="er">cd: ${esc(args[0])}: no such directory</span>`); }
  if (c === 'rates' || c === 'card' || c === 'pricelist') { try { return say(rateText(await catalog())); } catch (e) { return say(`<span class="er">rates: ${esc(e.message)}</span>`); } }
  if (c === 'task' || c === 'job' || c === 'open' || c === 'spec') {
    if (args[0] && !/^#?\d+$/.test(args[0])) { try { const cat = await catalog(), T = cat.jobs.find(j => j.key === args[0].toLowerCase()) || cat.jobs.find(j => j.title.toLowerCase().includes(args.join(' ').toLowerCase()));
      return say(T ? specText(T) : `<span class="er">job: ${esc(args[0])}: not on the rate card</span>  ${dm('keys: ' + cat.jobs.map(j => j.key).join(' '))}`); } catch (e) { return say(`<span class="er">${esc(e.message)}</span>`); } }
    const n = String(parseInt(String(args[0] || '').replace('#', ''), 10) || '').padStart(4, '0');
    if (!args[0] || n === '0000') return say('usage: task &lt;no&gt;   e.g. task 7\n       job &lt;key&gt;   e.g. job trade');
    let j = S && S.jobs.find(x => x.no === n);
    if (!j) { try { j = (await api('jobs', { status: 'all' })).jobs.find(x => x.no === n); } catch {} }
    if (!j) return say(`<span class="er">task #${n}: no such task</span>`);
    closeOut(); return go('/job/' + j.id);
  }
  if (c === 'agent' || c === 'proc' || c === 'kill') {
    if (c === 'kill') return say('kill: operation not permitted. the processes answer to the server, not to the terminal.');
    const a = find(args[0]); if (!a) return say('usage: agent &lt;id|no&gt;\n\n' + AG.map(x => `${x.label}  ${x.id.padEnd(9)}<span class="dim">${esc(x.desc)}</span>`).join('\n'));
    closeOut(); return go('/agent/' + a.id);
  }
  if (c === 'man' && args[0]) {
    let t = args[0].toLowerCase(); if (t === 'photo') t = 'proof'; if (t === 'rates' || t === 'job') t = 'jobs';
    if (!TOPICS.includes(t)) { try { const T = (await catalog()).jobs.find(j => j.key === t); if (T) return say(specText(T)); } catch {} return say(`no manual entry for ${esc(t)}. topics: ${TOPICS.join(' ')} · or a job key: man trade`); }
    closeOut(); return go('/docs#' + t);
  }
  if (c === 'man' || c === 'docs') { closeOut(); return go('/docs'); }
  if (c === 'grep') {
    ctx.grep = args.join(' ').toLowerCase().slice(0, 40); if (location.pathname !== '/') go('/');
    document.dispatchEvent(new CustomEvent('hire:grep')); tmux();
    const n = S ? S.log.filter(l => !ctx.grep || (label(l.agent) + ' ' + l.agent + ' ' + l.kind + ' ' + l.text).toLowerCase().includes(ctx.grep)).length : 0;
    return say(ctx.grep ? `grep "${esc(ctx.grep)}": ${n} of the last ${S ? S.log.length : 0} lines. type grep to clear.` : 'grep cleared.');
  }
  if (c === 'ls' || c === 'dir' || c === 'll') { if (need() && /tasks|jobs/.test(args[0] || '')) return say(need()); return say(await lsText(args[0])); }
  if (c === 'cat' || c === 'less' || c === 'more') { if (need() && !/rates?$/.test(args[0] || '')) return say(need()); return say(await catText(args[0])); }
  if (c === 'uname') return say(esc(unameText(args.includes('-a'), await catalog().catch(() => null))));
  if (c === 'neofetch' || c === 'fetch' || c === 'about') { if (need()) return say(need()); return say(fetchText(await catalog().catch(() => null))); }
  if (['ps', 'top', 'htop', 'tail', 'log', 'paid', 'payouts', 'values', 'free', 'df', 'uptime', 'status', 'stat'].includes(c) && need()) return say(need());
  if (c === 'ps' || c === 'top' || c === 'htop') return say(psText());
  if (c === 'tail' || c === 'log') return say(tailText(num(12, 60)));
  if (c === 'paid' || c === 'payouts') return say(paidText(num(10, 14)));
  if (c === 'values') return say(valuesText(num(10, 12)));
  if (c === 'free' || c === 'df') return say(freeText());
  if (c === 'uptime') return say(esc(uptimeText()));
  if (c === 'status' || c === 'stat') return say(statusText());
  if (c === 'humans' && args.length === 0 && location.pathname === '/humans') { closeOut(); return; }
  if (c === 'humans' || c === 'who' || c === 'leaderboard') {
    try { const { humans } = await api('humans'); if (!humans.length) return say(dm('nobody has been paid yet. the first human to pass a proof tops this list.'));
      return say(tb([hd(`${rc('#', 3)}  ${col('WALLET', 12)}${rc('JOBS', 5)}${rc('EARNED', 11)}  LAST`), ...humans.slice(0, 10).map((h, i) => `${rc(i + 1, 3)}  ${col(short(h.wallet), 12)}${rc(h.jobs, 5)}${am(rc(sol(h.earned, 3), 11))}  ${ago2(h.last)} ago`)]) + `\n${dm('cd humans for everyone')}`); }
    catch (e) { return say(`<span class="er">humans: ${esc(e.message)}</span>`); }
  }
  if (NAV[c]) { closeOut(); return go(NAV[c]); }
  if (c === 'whoami' || c === 'id') { const w = W.current(); return say(w ? `${esc(w.address)}  <span class="dim">(${esc(w.name)})</span>` : 'not connected. type <b>connect</b>'); }
  if (c === 'connect' || c === 'login') { closeOut(); try { await ensureWallet(); toast('connected.'); } catch {} return; }
  if (c === 'disconnect' || c === 'logout') { await W.disconnect(); return say('disconnected. your wallet is forgotten in this browser.'); }
  if (c === 'sim') { say('simulating a payout on mainnet…'); return print(esc(await P.simText())); }
  if (c === 'date') return say(new Date().toUTCString());
  if (c === 'sudo' || c === 'su') return say('permission denied. the wallet key stays on the server.');
  if (c === 'pwd') return say(cwd);
  if (c === 'rm' || c === 'mv' || c === 'chmod' || c === 'vi' || c === 'vim' || c === 'nano') return say(`${esc(c)}: read-only file system. the processes write here, not the terminal.`);
  return say(`<span class="er">hire: ${esc(c0)}: command not found</span>  <span class="dim">type help</span>`);
}
cmd.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const v = cmd.value; cmd.value = ''; paint(); run(v); }
  else if (e.key === 'ArrowUp') { if (hi > 0) { hi--; cmd.value = hist[hi] || ''; paint(); e.preventDefault(); } }
  else if (e.key === 'ArrowDown') { if (hi < hist.length) { hi++; cmd.value = hist[hi] || ''; paint(); e.preventDefault(); } }
  else if (e.key === 'Escape') { closeOut(); cmd.blur(); }
  else if ((e.key === 'Tab' || (e.key === 'ArrowRight' && cmd.selectionStart === cmd.value.length)) && cmd.value) {
    const s = suggest(cmd.value);
    if (s) { e.preventDefault(); cmd.value = s; paint(); }
    else if (e.key === 'Tab') { e.preventDefault(); const l = cmd.value.toLowerCase(), m = SUGG.filter(x => x.startsWith(l)); if (m.length) print(m.join('  ')); }
  }
});
document.addEventListener('keydown', e => {
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (e.key === 'Escape') { if (!out.hidden) closeOut(); focusPane(null); return; }
  if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.modal') || document.body.classList.contains('intro-on')) return;
  if (e.key === '/' || e.key === ':') { e.preventDefault(); cmd.focus(); return; }
  if (e.key === '?') { e.preventDefault(); helpKeys(); return; }
  if (e.key === 'Tab') { const ps = $$('.tui [data-pane]'); if (!ps.length) return; e.preventDefault(); const i = ps.indexOf(focused); focusPane(ps[(i + (e.shiftKey ? -1 : 1) + ps.length) % ps.length]); focused.scrollIntoView({ block: 'nearest' }); return; }
  if (e.key === 'j' || e.key === 'ArrowDown') { if ($('.tui')) { e.preventDefault(); moveSel(1); } return; }
  if (e.key === 'k' || e.key === 'ArrowUp') { if ($('.tui')) { e.preventDefault(); moveSel(-1); } return; }
  if (e.key === 'g' || e.key === 'G') { const p = focused && $('.pb', focused); if (p) p.scrollTop = e.key === 'g' ? 0 : p.scrollHeight; return; }
  if (e.key === 'Enter') { openSel(); return; }
  const k = +e.key; if (k >= 1 && k <= TABS.length) { go(TABS[k - 1][0]); }
});

wbtn(); render(); poll(); setTimeout(() => W.resume(), 400);
