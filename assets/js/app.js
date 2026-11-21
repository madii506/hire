// HIRE · the terminal: the intro, one shared poll of the state, the router, the windows (tabs), the panes and
// the keys that move between them, the command line (with completion and scrollback), the status line and the clocks.
import * as W from './wallet.js?v=5';
import { AG, label, find } from './agents.js?v=5';
import { $, $$, api, post, short, sol, until, ago, copy, ensureWallet, esc, toast, modal } from './ui.js?v=5';
import * as P from './pages.js?v=5';

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
  import('./intro3d.js?v=5').then(m => { if (!intro.isConnected) return; started = true; clearTimeout(giveUp); m.play(intro, () => { document.body.classList.remove('intro-on'); resolve(); }); })
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
const NAV = { hq: '/', home: '/', '~': '/', tasks: '/jobs', jobs: '/jobs', board: '/jobs', data: '/data', values: '/data', map: '/data', proofs: '/proofs', wall: '/proofs', wallet: '/wallet', payouts: '/wallet', ledger: '/wallet',
  agents: '/agents', ps: '/agents', top: '/agents', humans: '/humans', who: '/humans', docs: '/docs', man: '/docs', rules: '/rules', rates: '/jobs#rates', card: '/jobs#rates', pay: '/jobs#rates', me: '/me', log: '/', tail: '/', protocol: '/docs#protocol' };
const HELP = [['help', 'this list'], ['hq', 'everything on one screen'], ['tasks', 'the task board'], ['task <no>', 'open a task by number: task 7'], ['data · map', 'verified values and where they came from'], ['proofs', 'approved photos'],
  ['wallet', 'the public wallet and every payout'], ['agents · top', 'the ten processes'], ['agent <id|no>', 'one process: agent prices, agent 2'], ['humans', 'every wallet paid'],
  ['docs · man [topic]', 'the manual: man jobs, man protocol, man rules'], ['rates', 'the rate card: every job and what it pays'], ['grep <text>', 'filter the hq log (grep alone clears it)'], ['status', 'system status'], ['whoami', 'your wallet'],
  ['connect · disconnect', 'your wallet'], ['me', 'your tasks and your code'], ['sim', 'simulate a payout on mainnet. nothing is sent'], ['history', 'what you typed'], ['clear', 'clear this output']];
const TOPICS = ['what', 'protocol', 'jobs', 'procs', 'proof', 'wallet', 'budget', 'limits', 'minds', 'sign', 'payout', 'rules', 'api', 'test'];
const SUGG = [...new Set(['help', 'hq', 'tasks', 'task ', 'rates', 'data', 'map', 'proofs', 'wallet', 'agents', 'top', 'agent ', 'humans', 'docs', 'man', 'grep ', 'status', 'whoami', 'connect', 'disconnect', 'me', 'sim', 'history', 'clear', 'cd ', 'date',
  ...AG.map(a => 'agent ' + a.id), ...TOPICS.map(t => 'man ' + t)])];
const suggest = v => { if (!v) return ''; const l = v.toLowerCase(); const m = SUGG.find(x => x.startsWith(l) && x !== l); return m ? v + m.slice(v.length) : ''; };
const paint = () => { const v = cmd.value, s = suggest(v); ghost.innerHTML = s ? `<i>${esc(v)}</i>${esc(s.slice(v.length))}` : ''; };
cmd.addEventListener('input', paint); cmd.addEventListener('blur', () => { ghost.innerHTML = ''; });
function statusText() {
  if (!S) return 'connecting to hire-os…';
  const w = S.wallet, st = S.stats, tk = S.tickAt ? Math.round((Date.now() - S.tickAt) / 1000) + 's ago' : '—';
  return [['hire-os', `up · ${AG.length}/${AG.length} processes`], ['wallet', `${w.address}`], ['balance', `${sol(w.lamports, 4)} SOL${S.usd ? ` (≈ $${((w.lamports / 1e9) * S.usd).toFixed(2)})` : ''}`], ['budget', `${sol(w.left, 4)} SOL left today · ${w.funded ? 'funded' : 'waiting for funds'}`],
    ['queue', `${st.open} open · ${st.working} working · ${st.review} in review`], ['paid', `${sol(st.paidLamports, 4)} SOL to ${st.humans} humans`], ['values', `${st.values} verified`], ['pay time', st.medianPay == null ? '—' : `${st.medianPay}s median`],
    ['observers', `${Math.max(1, st.watching)}`], ['last tick', tk], ['models', `${S.rules.text} · ${S.rules.vision}`]].map(([k, v]) => `${k.padEnd(12)}${esc(v)}`).join('\n');
}
async function run(raw) {
  raw = raw.trim(); if (!raw) return;
  hist = hist.filter(h => h !== raw).concat(raw).slice(-60); hi = hist.length; try { sessionStorage.setItem('hire:hist', JSON.stringify(hist)); } catch {}
  const [c0, ...args] = raw.split(/\s+/), c = c0.toLowerCase().replace(/^\/+/, ''), echo = `<span class="in">${esc(cwd)} $ ${esc(raw)}</span>`;
  const say = html => print(echo + '\n' + html);
  if (c === 'help' || c === '?' || c === 'commands') return say(HELP.map(([k, d]) => `${esc(k.padEnd(22))}<span class="dim">${esc(d)}</span>`).join('\n') + '\n\n<span class="dim">keys: 1-8 windows · tab panes · j k rows · enter open · / here · ? keys</span>');
  if (c === 'clear' || c === 'cls') return clearOut();
  if (c === 'exit' || c === 'q') return closeOut();
  if (c === 'history') return say(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join('\n'));
  if (c === 'cd') { const t = (args[0] || '~').replace(/^~\/?|^\/+/, '').replace(/\/$/, ''); const to = t === '' ? '/' : NAV[t]; if (to) { closeOut(); return go(to); } return say(`<span class="er">cd: ${esc(args[0])}: no such directory</span>`); }
  if (c === 'task' || c === 'job' || c === 'open') {
    const n = String(parseInt(args[0], 10) || '').padStart(4, '0');
    if (!args[0] || n === '0000') return say('usage: task &lt;no&gt;   e.g. task 7');
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
  if ((c === 'man' || c === 'docs') && args[0]) { let t = args[0].toLowerCase(); if (t === 'photo') t = 'proof'; if (t === 'rates' || t === 'job') t = 'jobs'; if (!TOPICS.includes(t)) return say(`no manual entry for ${esc(t)}. topics: ${TOPICS.join(' ')}`); closeOut(); return go('/docs#' + t); }
  if (c === 'grep') {
    ctx.grep = args.join(' ').toLowerCase().slice(0, 40); if (location.pathname !== '/') go('/');
    document.dispatchEvent(new CustomEvent('hire:grep')); tmux();
    const n = S ? S.log.filter(l => !ctx.grep || (label(l.agent) + ' ' + l.agent + ' ' + l.kind + ' ' + l.text).toLowerCase().includes(ctx.grep)).length : 0;
    return say(ctx.grep ? `grep "${esc(ctx.grep)}": ${n} of the last ${S ? S.log.length : 0} lines. type grep to clear.` : 'grep cleared.');
  }
  if (NAV[c]) { closeOut(); return go(NAV[c]); }
  if (c === 'status' || c === 'uptime' || c === 'stat') return say(statusText());
  if (c === 'whoami' || c === 'id') { const w = W.current(); return say(w ? `${esc(w.address)}  <span class="dim">(${esc(w.name)})</span>` : 'not connected. type <b>connect</b>'); }
  if (c === 'connect' || c === 'login') { closeOut(); try { await ensureWallet(); toast('connected.'); } catch {} return; }
  if (c === 'disconnect' || c === 'logout') { await W.disconnect(); return say('disconnected. your wallet is forgotten in this browser.'); }
  if (c === 'sim') { say('simulating a payout on mainnet…'); return print(esc(await P.simText())); }
  if (c === 'date') return say(new Date().toUTCString());
  if (c === 'sudo' || c === 'su') return say('permission denied. the wallet key stays on the server.');
  if (c === 'ls' || c === 'dir') { closeOut(); return go('/jobs'); }
  if (c === 'pwd') return say(cwd);
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
