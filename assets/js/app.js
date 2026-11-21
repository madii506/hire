// HIRE · the terminal: one shared poll of the state, the router, the tabs, the command line, the status line, the clocks.
import * as W from './wallet.js?v=3';
import { AG, label, find } from './agents.js?v=3';
import { $, $$, api, post, short, sol, until, ago, copy, ensureWallet, esc, txLink, toast } from './ui.js?v=3';
import * as P from './pages.js?v=3';

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
  const giveUp = setTimeout(() => { if (!started) end(); }, 7000);          // slow connection: straight to the terminal
  intro.addEventListener('click', () => { if (!started) { clearTimeout(giveUp); end(); } });
  import('./intro3d.js?v=3').then(m => { if (!intro.isConnected) return; started = true; clearTimeout(giveUp); m.play(intro, () => document.body.classList.remove('intro-on')); })
    .catch(() => { clearTimeout(giveUp); end(); });
})();

let S = null, view = null, pollT = 0;
const ctx = { S: () => S, go };

// ---- tabs
const TABS = [['/', 'hq'], ['/jobs', 'tasks'], ['/data', 'data'], ['/proofs', 'proofs'], ['/wallet', 'wallet'], ['/agents', 'agents'], ['/humans', 'humans'], ['/docs', 'docs']];
$('#tabs').innerHTML = TABS.map(([h, t], i) => `<a href="${h}"><i>${i + 1}</i>${t}</a>`).join('');

// ---- routes
const ROUTES = [
  [/^\/$/, P.home, 'HIRE', '~'],
  [/^\/(?:jobs|tasks)\/?$/, P.jobsPage, 'tasks · HIRE', '~/tasks'],
  [/^\/(?:job|task)\/([\w-]+)\/?$/, P.jobPage, 'task · HIRE', '~/tasks'],
  [/^\/data\/?$/, P.dataPage, 'data · HIRE', '~/data'],
  [/^\/proofs\/?$/, P.proofsPage, 'proofs · HIRE', '~/proofs'],
  [/^\/(?:wallet|payouts)\/?$/, P.walletPage, 'wallet · HIRE', '~/wallet'],
  [/^\/agents\/?$/, P.agentsPage, 'agents · HIRE', '~/agents'],
  [/^\/agent\/([\w-]+)\/?$/, P.agentPage, 'agent · HIRE', '~/agents'],
  [/^\/humans\/?$/, P.humansPage, 'humans · HIRE', '~/humans'],
  [/^\/(?:docs|rules)\/?$/, P.docsPage, 'man hire · HIRE', '~/docs'],
  [/^\/me\/?$/, P.mePage, 'me · HIRE', '~/me'],
];
let cwd = '~';
function render() {
  if (view && view.destroy) try { view.destroy(); } catch {}
  const path = location.pathname;
  let hit = null;
  for (const [re, fn, title, dir] of ROUTES) { const m = re.exec(path); if (m) { hit = { fn, args: m.slice(1), title, dir }; break; } }
  main.innerHTML = '';
  view = hit ? hit.fn(main, ctx, ...hit.args) : P.notFound(main);
  document.title = hit ? hit.title : 'HIRE';
  cwd = hit ? hit.dir : path; $('#cwd').textContent = cwd;
  const tab = path === '/' ? '/' : (TABS.find(([h]) => h !== '/' && (path === h || path.startsWith(h.replace(/s$/, '')) || (h === '/jobs' && /^\/(tasks?|job)\b/.test(path)) || (h === '/wallet' && path === '/payouts') || (h === '/docs' && path === '/rules'))) || [])[0];
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === tab));
  const on = $('#tabs a.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (S && view && view.update) view.update(S);
  tmux();
  const hash = location.hash || (path === '/rules' ? '#rules' : '');
  if (hash) setTimeout(() => { const t = document.getElementById(hash.slice(1)); if (t) t.scrollIntoView(); }, 80);
}
function go(path) {
  if (path === location.pathname + location.hash) return;
  const [p, h] = path.split('#');
  if (p === location.pathname && h) { const t = document.getElementById(h); if (t) { t.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', path); return; } }
  history.pushState(null, '', path); render();
  if (!location.hash) scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}
document.addEventListener('hire:go', e => go(e.detail));
document.addEventListener('click', e => {
  const c = e.target.closest('[data-copy]'); if (c) { e.preventDefault(); copy(c); return; }
  const a = e.target.closest('a[href]'); if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  const href = a.getAttribute('href');
  if (href.startsWith('#')) { const t = document.getElementById(href.slice(1)); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); history.replaceState(null, '', href); } return; }
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
  e.preventDefault(); go(href);
});
addEventListener('popstate', render);

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
  try { S = await api('state'); if (view && view.update) view.update(S); live(true); paidBar(S); tmux(); }
  catch { live(false); }
  pollT = setTimeout(poll, document.hidden ? 30000 : 5000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
let isLive = null;
function live(ok) { isLive = ok; $('#livesq').classList.toggle('off', !ok); $('#livetx').textContent = ok ? 'LIVE' : 'OFFLINE'; }
function tmux() {
  const t = $('#tmux'); if (!t) return;
  const seg = S ? [`wallet<b>${sol(S.wallet.lamports, 4)}</b>`, `open<b>${S.stats.open}</b>`, `paid<b>${sol(S.stats.paidLamports, 3)}</b>`, `humans<b>${S.stats.humans}</b>`, `obs<b>${Math.max(1, S.stats.watching)}</b>`] : ['connecting…'];
  const tick = S && S.tickAt ? Math.round((Date.now() - S.tickAt) / 1000) : null;
  t.innerHTML = `<span class="s0">[hire]</span><span>${esc(cwd)}*</span><span class="gap"></span>${seg.map((s, i) => `<span class="${i === 3 ? 'hm' : ''}">${s}</span>`).join('')}<span class="hm">tick<b>${tick == null ? '—' : tick + 's'}</b></span><span class="hm">${isLive === false ? 'offline' : 'live'}</span>`;
}

// ---- "someone is here": the agents only work while someone watches
let tab = ''; try { tab = sessionStorage.getItem('hire:tab') || ''; } catch {}
if (!tab) { tab = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8); try { sessionStorage.setItem('hire:tab', tab); } catch {} }
const here = () => { if (!document.hidden) post('here', { id: tab }).catch(() => {}); };
here(); setInterval(here, 45000);

// ---- the clocks: UTC in the corner, every countdown on the screen, the tick in the status line
const pad = n => String(n).padStart(2, '0');
setInterval(() => {
  const d = new Date(); $('#clock').textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  if (S && S.usd) $('#solpx').textContent = `SOL $${(+S.usd).toFixed(2)}`;
  $$('[data-until]').forEach(el => { const v = until(el.dataset.until); if (el.textContent !== v) el.textContent = v; });
  if (d.getSeconds() % 5 === 0) tmux();
}, 1000);

// ---- the wallet button
function wbtn() {
  const b = $('#wbtn'), c = W.current();
  if (c) { b.classList.add('on'); b.innerHTML = `${c.icon ? `<img src="${esc(c.icon)}" alt="">` : ''}<span>${esc(short(c.address))}</span>`; b.title = 'your session'; }
  else { b.classList.remove('on'); b.innerHTML = '<span>[ connect ]</span>'; b.title = 'connect a wallet'; }
}
$('#wbtn').addEventListener('click', async () => { if (W.current()) return go('/me'); try { await ensureWallet(); go('/me'); } catch {} });
W.onChange(wbtn); W.onWallets(() => { W.resume(); });

// ---- the command line
const cmd = $('#cmd'), out = $('#cliout');
let hist = []; try { hist = JSON.parse(sessionStorage.getItem('hire:hist') || '[]'); } catch {}
let hi = hist.length;
const print = html => { out.hidden = false; out.innerHTML = `<button class="x" data-x type="button">esc</button>${html}`; out.scrollTop = 0; };
const closeOut = () => { out.hidden = true; out.innerHTML = ''; };
out.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeOut(); else if (e.target.closest('a[href^="/"]')) closeOut(); });
const NAV = { hq: '/', home: '/', '~': '/', tasks: '/jobs', jobs: '/jobs', ls: '/jobs', board: '/jobs', data: '/data', proofs: '/proofs', wall: '/proofs', wallet: '/wallet', payouts: '/wallet', ledger: '/wallet',
  agents: '/agents', ps: '/agents', top: '/agents', humans: '/humans', who: '/humans', docs: '/docs', man: '/docs', rules: '/rules', me: '/me', log: '/#live', tail: '/#live', protocol: '/#protocol', faq: '/#faq' };
const HELP = [['help', 'this list'], ['hq', 'the dashboard'], ['tasks', 'the task board'], ['task <no>', 'open a task by number: task 7'], ['data', 'values humans reported and the models checked'], ['proofs', 'approved photos'],
  ['wallet', 'the public wallet and every payout'], ['agents', 'the ten processes (ps)'], ['agent <id|no>', 'one process: agent prices, agent 2'], ['humans', 'every wallet paid'], ['status', 'system status'],
  ['docs', 'man hire, the full manual'], ['rules', 'limits and safety rules'], ['whoami', 'your wallet'], ['connect', 'connect a wallet'], ['disconnect', 'forget your wallet'], ['me', 'your tasks and your code'],
  ['sim', 'simulate a payout on mainnet. nothing is sent'], ['clear', 'close this output']];
const WORDS = [...new Set(HELP.map(([k]) => k.split(' ')[0]).concat(Object.keys(NAV)).concat(['cd', 'agent', 'task']))].filter(w => w !== '~').sort();
function statusText() {
  if (!S) return 'connecting to hire-os…';
  const w = S.wallet, st = S.stats, tk = S.tickAt ? Math.round((Date.now() - S.tickAt) / 1000) + 's ago' : '—';
  return [['hire-os', `up · ${AG.length}/${AG.length} processes`], ['wallet', `${w.address}`], ['balance', `${sol(w.lamports, 4)} SOL${S.usd ? ` (≈ $${((w.lamports / 1e9) * S.usd).toFixed(2)})` : ''}`], ['budget', `${sol(w.left, 4)} SOL left today · ${w.funded ? 'funded' : 'waiting for funds'}`],
    ['queue', `${st.open} open · ${st.working} working · ${st.review} in review`], ['paid', `${sol(st.paidLamports, 4)} SOL to ${st.humans} humans`], ['observers', `${Math.max(1, st.watching)}`], ['last tick', tk], ['models', `${S.rules.text} · ${S.rules.vision}`]]
    .map(([k, v]) => `${k.padEnd(12)}${esc(v)}`).join('\n');
}
async function run(raw) {
  raw = raw.trim(); if (!raw) return;
  hist = hist.filter(h => h !== raw).concat(raw).slice(-40); hi = hist.length; try { sessionStorage.setItem('hire:hist', JSON.stringify(hist)); } catch {}
  const [c0, ...args] = raw.split(/\s+/), c = c0.toLowerCase().replace(/^\/+/, ''), echo = `<span class="in">$ ${esc(raw)}</span>\n`;
  if (c === 'help' || c === '?' || c === 'commands') return print(echo + HELP.map(([k, d]) => `${esc(k.padEnd(16))}<span class="dim">${esc(d)}</span>`).join('\n') + '\n\n<span class="dim">keys: / focus · tab complete · ↑ ↓ history · esc close · 1-8 switch screens</span>');
  if (c === 'clear' || c === 'cls' || c === 'exit' || c === 'q') return closeOut();
  if (c === 'cd') { const t = (args[0] || '~').replace(/^~\/?|^\/+/, '').replace(/\/$/, ''); const to = t === '' ? '/' : NAV[t]; if (to) { closeOut(); return go(to); } return print(echo + `<span class="er">cd: ${esc(args[0])}: no such directory</span>`); }
  if (c === 'task' || c === 'job' || c === 'open') {
    const n = String(parseInt(args[0], 10) || '').padStart(4, '0');
    if (!args[0] || n === '0000') return print(echo + 'usage: task &lt;no&gt;   e.g. task 7');
    let j = S && S.jobs.find(x => x.no === n);
    if (!j) { try { j = (await api('jobs', { status: 'all' })).jobs.find(x => x.no === n); } catch {} }
    if (!j) return print(echo + `<span class="er">task #${n}: no such task</span>`);
    closeOut(); return go('/job/' + j.id);
  }
  if (c === 'agent' || c === 'proc' || c === 'kill') {
    if (c === 'kill') return print(echo + 'kill: operation not permitted. the processes answer to the server, not to the terminal.');
    const a = find(args[0]); if (!a) return print(echo + 'usage: agent &lt;id|no&gt;\n\n' + AG.map(x => `${x.label}  ${x.id.padEnd(9)}<span class="dim">${esc(x.desc)}</span>`).join('\n'));
    closeOut(); return go('/agent/' + a.id);
  }
  if (NAV[c]) { closeOut(); return go(NAV[c]); }
  if (c === 'status' || c === 'uptime' || c === 'stat') return print(echo + statusText());
  if (c === 'whoami' || c === 'id') { const w = W.current(); return print(echo + (w ? `${esc(w.address)}  <span class="dim">(${esc(w.name)})</span>` : 'not connected. type <b>connect</b>')); }
  if (c === 'connect' || c === 'login') { closeOut(); try { await ensureWallet(); toast('connected.'); } catch {} return; }
  if (c === 'disconnect' || c === 'logout') { await W.disconnect(); return print(echo + 'disconnected. your wallet is forgotten in this browser.'); }
  if (c === 'sim') { print(echo + 'simulating a payout on mainnet…'); return print(echo + esc(await P.simText())); }
  if (c === 'date') return print(echo + new Date().toUTCString());
  if (c === 'sudo' || c === 'su') return print(echo + 'permission denied. the wallet key stays on the server.');
  if (c === 'ls' || c === 'dir') { closeOut(); return go('/jobs'); }
  return print(echo + `<span class="er">hire: ${esc(c0)}: command not found</span>  <span class="dim">type help</span>`);
}
cmd.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const v = cmd.value; cmd.value = ''; run(v); }
  else if (e.key === 'ArrowUp') { if (hi > 0) { hi--; cmd.value = hist[hi] || ''; e.preventDefault(); } }
  else if (e.key === 'ArrowDown') { if (hi < hist.length) { hi++; cmd.value = hist[hi] || ''; e.preventDefault(); } }
  else if (e.key === 'Escape') { closeOut(); cmd.blur(); }
  else if (e.key === 'Tab' && cmd.value) {
    e.preventDefault();
    const v = cmd.value, parts = v.split(/\s+/);
    if (parts.length === 1) { const m = WORDS.filter(w => w.startsWith(parts[0].toLowerCase())); if (m.length === 1) cmd.value = m[0] + ' '; else if (m.length) print(m.join('  ')); }
    else if (/^(agent|proc)$/i.test(parts[0])) { const m = AG.filter(a => a.id.startsWith((parts[1] || '').toLowerCase())); if (m.length === 1) cmd.value = parts[0] + ' ' + m[0].id; else if (m.length) print(m.map(a => a.id).join('  ')); }
    else if (/^cd$/i.test(parts[0])) { const m = Object.keys(NAV).filter(k => k.startsWith(parts[1] || '')); if (m.length === 1) cmd.value = 'cd ' + m[0]; else if (m.length) print(m.join('  ')); }
  }
});
document.addEventListener('keydown', e => {
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (e.key === 'Escape' && !out.hidden) { closeOut(); return; }
  if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.modal') || document.body.classList.contains('intro-on')) return;
  if (e.key === '/' || e.key === ':') { e.preventDefault(); cmd.focus(); return; }
  const k = +e.key; if (k >= 1 && k <= TABS.length) { go(TABS[k - 1][0]); }
});

wbtn(); render(); poll(); setTimeout(() => W.resume(), 400);
