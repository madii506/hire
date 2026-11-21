// HIRE · every window of the terminal. On a desktop each window is one screen of panes that scroll inside themselves
// (like tmux); on a phone the panes stack. Windows: hq, tasks, one task (and the session that takes it), data, proofs,
// wallet, agents (top), humans, man, your session.
import { AG, BY, label, find } from './agents.js?v=4';
import * as W from './wallet.js?v=4';
import { prepare as preparePhoto } from './photo.js?v=4';
import { locate, drawMap } from './map.js?v=4';
import { $, $$, esc, short, sol, usd, ago, until, hms, api, post, toast, modal, ensureWallet, txLink, acctLink,
  bar, meter, spark, slots, agentA, jobRow, logLine, lineText, lineTail, proofCard, ghostProofs, payRow, dataRow } from './ui.js?v=4';

// what your wallet signs: text only, never a transaction (the server checks the very same lines)
const field = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
export const MSG = {
  claim: (job, wallet, ts) => `HIRE\nTake job ${job}\nWallet ${wallet}\nTime ${ts}`,
  proof: (claim, wallet, ts, sha, answer = '', place = '') => `HIRE\nSend proof for ${claim}\nWallet ${wallet}\nTime ${ts}\nPhoto ${sha}\nAnswer ${answer}\nPlace ${place}`,
  sweep: (amount, wallet, ts) => `HIRE\nSend ${amount} back to the owner\nWallet ${wallet}\nTime ${ts}`,
  hide: (claim, wallet, ts) => `HIRE\nHide photo ${claim}\nWallet ${wallet}\nTime ${ts}`,
};
export const RULES = [
  'legal and safe, done alone in under an hour, from a public pavement or inside a place open to the public',
  'costs nothing: no purchase, no special skill, no tool beyond a phone (a ruler at most)',
  'never people: no faces, no names, no licence plates, nobody who did not agree, never children',
  'never private property, trespassing, roofs, roads or rail, vehicles, water, heights, fire or animals',
  'never personal data: no home addresses, documents, screens, accounts, passwords or keys',
  'never money, crypto, restricted goods, gambling, politics, medical advice or dating',
  'never lying to anyone, following anyone, or leaving anything behind in public',
];
const R0 = { minBounty: .1, maxBounty: .5, dayPct: .1, dayMax: 5, reserve: .02, maxOpen: 8, jobEveryMin: 6, perWalletDay: 3, perIpDay: 4, claimMin: 90, tries: 2, passAt: .65, text: 'openai/gpt-4.1-mini', vision: 'google/gemini-2.5-flash' };
const sig = v => JSON.stringify(v);
const wide = () => !matchMedia('(max-width:1099px), (max-height:620px)').matches;   // the panes sit side by side
const goTo = href => document.dispatchEvent(new CustomEvent('hire:go', { detail: href }));
// rows: a click opens the row's page; in a list window on a wide screen it selects the row instead (Enter opens)
function rows(el, onSel) {
  if (!el) return;
  el.addEventListener('click', e => {
    const r = e.target.closest('[data-href]'); if (!r || e.target.closest('a,button,input')) return;
    if (onSel && r.dataset.key && (wide() || r.dataset.href === '#sel')) {
      pick(el, r); onSel(r.dataset.key);
      if (!wide()) { const d = document.getElementById('p-det'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } else if (r.dataset.href !== '#sel') goTo(r.dataset.href);
  });
  el.addEventListener('dblclick', e => { const r = e.target.closest('[data-href]'); if (r && r.dataset.href !== '#sel' && !e.target.closest('a,button,input')) goTo(r.dataset.href); });
  if (onSel) el.addEventListener('hire:sel', e => onSel(e.detail));
}
function pick(el, r) { $$('.sel', el).forEach(x => x.classList.remove('sel')); r.classList.add('sel'); }
const P = (id, title, sub = '', right = '', body = '', cls = '') => `<section class="pane ${cls}" id="p-${id}" data-pane tabindex="-1"><div class="ph"><b>${title}</b><span class="sub">${sub}</span><span class="r">${right}</span></div><div class="pb${/flush/.test(cls) ? ' flush' : ''}" id="${id}">${body}</div></section>`;
const head = (title, lede, right = '') => `<div class="whead"><div><h1 class="h1">${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</div>${right}</div>`;

const LOGO = ['██╗  ██╗██╗██████╗ ███████╗', '██║  ██║██║██╔══██╗██╔════╝', '███████║██║██████╔╝█████╗  ', '██╔══██║██║██╔══██╗██╔══╝  ', '██║  ██║██║██║  ██║███████╗', '╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝'];
function logoSvg() {
  const cw = 12, ch = 22, d = 2.7, H = (y, a, b) => `M${a} ${y}H${b}`, V = (x, a, b) => `M${x} ${a}V${b}`;
  let path = '', rs = '';
  LOGO.forEach((row, j) => {
    let rects = '';
    [...row].forEach((c, i) => {
      const x0 = i * cw, y0 = j * ch, x1 = x0 + cw, y1 = y0 + ch, cx = x0 + cw / 2, cy = y0 + ch / 2;
      if (c === '█') rects += `<rect x="${x0}" y="${y0}" width="${cw + .5}" height="${ch + .5}"/>`;
      else if (c === '═') path += H(cy - d, x0, x1) + H(cy + d, x0, x1);
      else if (c === '║') path += V(cx - d, y0, y1) + V(cx + d, y0, y1);
      else if (c === '╗') path += H(cy - d, x0, cx + d) + V(cx + d, cy - d, y1) + H(cy + d, x0, cx - d) + V(cx - d, cy + d, y1);
      else if (c === '╔') path += H(cy - d, cx - d, x1) + V(cx - d, cy - d, y1) + H(cy + d, cx + d, x1) + V(cx + d, cy + d, y1);
      else if (c === '╝') path += H(cy + d, x0, cx + d) + V(cx + d, y0, cy + d) + H(cy - d, x0, cx - d) + V(cx - d, y0, cy - d);
      else if (c === '╚') path += H(cy + d, cx - d, x1) + V(cx - d, y0, cy + d) + H(cy - d, cx + d, x1) + V(cx + d, y0, cy - d);
    });
    rs += `<g class="r">${rects}</g>`;
  });
  return `<svg class="logo" viewBox="-2 -2 ${27 * cw + 4} ${6 * ch + 4}" role="img" aria-label="HIRE"><path d="${path}" fill="none" stroke="#5b5a55" stroke-width="1.3"/><g fill="#ecebe5" shape-rendering="crispEdges">${rs}</g></svg>`;
}

// the sequence diagram: four lifelines, one arrow per line
const COLS = [3, 21, 39, 57], SW = 61;
function seqLine(from, to, text) {
  const a = Array(SW).fill(' '); COLS.forEach(c => { a[c] = '│'; });
  if (from == null) return a.join('');
  const x1 = COLS[from], x2 = COLS[to], lo = Math.min(x1, x2) + 1, hi = Math.max(x1, x2) - 1;
  for (let x = lo; x <= hi; x++) a[x] = '─';
  if (x2 > x1) a[hi] = '▶'; else a[lo] = '◀';
  const L = ` ${text} `, st = Math.round((lo + hi) / 2 - L.length / 2);
  for (let i = 0; i < L.length; i++) a[st + i] = L[i];
  return a.join('');
}
const SEQ = [[0, 1, 'post task'], [2, 1, 'sign: take it'], [1, 2, 'code HR-4821'], [2, 1, 'photo + value'], [1, 0, 'check photo'], [0, 1, 'pass 0.91'], [1, 3, 'transfer 0.12 SOL'], [3, 2, 'lands']];
const SEQSTEP = [0, 1, 2, 3, 4, 4, 5, 5];
const seqHtml = () => `<span class="h">${esc(' ' + 'AGT-xx'.padEnd(17) + 'HIRE'.padEnd(18) + 'YOU'.padEnd(17) + 'SOLANA')}</span>\n${seqLine()}\n${SEQ.map(([f, t, x], i) => `<span class="st" data-s="${SEQSTEP[i]}">${esc(seqLine(f, t, x))}</span>`).join('')}${seqLine()}`;
const STEPS = r => [`<b>A process posts a task.</b> What to do, what the photo must show, the one value to report, the bounty and the spots.`, `<b>You take it.</b> Your wallet signs one line of text. No transaction, no fee, no SOL needed.`,
  `<b>You get a code</b> like HR-4821 and ${r.claimMin} minutes. Write the code on paper, by hand.`, `<b>You do it.</b> One photo with the paper in the shot, and the value you saw. Your wallet signs once more.`,
  `<b>The process checks it.</b> A vision model reads your code and the value off the photo. It needs ${r.passAt} confidence.`, `<b>It pays.</b> The public wallet sends the bounty on Solana mainnet, right away. The transaction is public.`];

// the map pane: the land, and a pin for every verified value with a place we know
function mapPane() { return `<div class="mapw"><canvas aria-label="world map of verified values"></canvas><div class="cap"><span class="mapn">—</span><span>▪ land · <span class="amb">■</span> a verified value</span></div><div class="tip" hidden></div></div>`; }
function mapCtl(box) {
  const cv = $('canvas', box), tip = $('.tip', box), cap = $('.mapn', box);
  let pins = [], hits = [], raf = 0, alive = true, last = 0;
  const loop = t => { if (!alive) return; raf = requestAnimationFrame(loop); if (t - last < 110 || document.hidden) return; last = t; hits = drawMap(cv, pins, t); };
  raf = requestAnimationFrame(loop);
  cv.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = hits.find(k => Math.abs(k.x - x) < 9 && Math.abs(k.y - y) < 9);
    if (!h) { tip.hidden = true; return; }
    tip.hidden = false; tip.style.left = (h.x + 10) + 'px'; tip.style.top = (h.y + 8) + 'px';
    tip.innerHTML = `#${esc(h.p.d.no)} ${esc(h.p.d.answer || '')} · ${esc(h.p.d.place)}`;
  });
  cv.addEventListener('mouseleave', () => { tip.hidden = true; });
  return {
    set(data) {
      const placed = [], loose = [];
      for (const d of data) { const ll = d.place ? locate(d.place) : null; if (ll) placed.push({ lat: ll[0], lon: ll[1], d }); else if (d.place) loose.push(d.place); }
      pins = placed;
      cap.textContent = data.length ? `${placed.length} placed${loose.length ? ` · ${loose.length} unplaced` : ''} · ${data.length} value${data.length === 1 ? '' : 's'}` : 'no verified values yet';
    },
    stop() { alive = false; cancelAnimationFrame(raf); },
  };
}

// ------------------------------------------------------------------ hq: everything on one screen
export function home(main, ctx) {
  main.innerHTML = `<div class="tui w-hq">
    <section class="hqtop" aria-label="HIRE">
      <div>${logoSvg()}</div>
      <div><p class="tagline" id="tagline" aria-label="AI agents post real-world tasks. Humans do them. One photo is the proof. Paid in SOL from one public wallet."></p>
        <div class="btns"><a class="btn amb" href="/jobs">open tasks</a><a class="btn" href="/docs#protocol">how it works</a></div></div>
      <div class="hqstat">
        <div class="bal"><span class="dim">public wallet · SOL</span><span class="big amb" id="k-bal">—</span><span class="dim" id="k-usd">&nbsp;</span></div>
        <div class="actg"><div class="bars" id="k-act"></div><div class="lab"><span>activity · lines per minute · 30 min</span><span id="k-actn"></span></div></div>
        <dl class="kv"><dt>status</dt><dd id="k-status">—</dd><dt>procs</dt><dd id="k-proc">—</dd><dt>today</dt><dd id="k-day">—</dd><dt>queue</dt><dd id="k-queue">—</dd>
          <dt>paid</dt><dd id="k-paid">—</dd><dt>observers</dt><dd id="k-obs">—</dd><dt>pay time</dt><dd id="k-pt">—</dd><dt>next tick</dt><dd id="k-tick">—</dd></dl>
      </div>
    </section>
    <div class="tape" aria-hidden="true"><div class="tr" id="tape"></div></div>
    ${P('tasks', 'tasks', 'ls /tasks --open', '<span id="bn"></span><a href="/jobs">all →</a>', '', 'flush cap')}
    ${P('log', 'log', 'tail -f /var/log/hire', '<span id="logn"></span>', '<div class="log" id="logl"></div><div class="tailhint"><span class="cur"></span></div>', 'logp cap')}
    ${P('ps', 'top', 'agent processes', '<a href="/agents">all →</a>', '', 'flush cap')}
    ${P('data', 'data', 'values checked against the photo', '<a href="/data">all →</a>', '', 'flush cap')}
    ${P('map', 'map', 'where the values came from', '<a href="/data">data →</a>', mapPane(), 'flush')}
    ${P('wal', 'wallet', 'public · solana mainnet', '<a href="/wallet">ledger →</a>', '', 'cap')}
  </div>`;
  const map = mapCtl($('#p-map .mapw', main));

  // the tagline types itself once the intro and the boot are out of the way
  const TAG = ['AI agents post real-world tasks.', 'Humans do them. One photo is the proof.', 'Paid in SOL from one public wallet.'];
  let tagT = 0;
  const typeTag = () => {
    const el = $('#tagline', main); if (!el) return;
    if (document.body.classList.contains('intro-on') || document.querySelector('.boot')) { tagT = setTimeout(typeTag, 200); return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.innerHTML = TAG.map(esc).join('<br>') + '<span class="cur"></span>'; return; }
    let i = 0; const all = TAG.join('\n');
    const step = () => { i = Math.min(all.length, i + 2); el.innerHTML = esc(all.slice(0, i)).replace(/\n/g, '<br>') + '<span class="cur"></span>'; if (i < all.length) tagT = setTimeout(step, 20); };
    tagT = setTimeout(step, 250);
  };
  typeTag();
  const gl = setInterval(() => { if (document.hidden || document.body.classList.contains('intro-on') || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const rs = $$('.logo .r', main), r = rs[(Math.random() * rs.length) | 0]; if (!r) return; r.classList.add('g'); setTimeout(() => r.classList.remove('g'), 90 + Math.random() * 90); }, 4200);
  rows($('#tasks', main)); rows($('#ps', main)); rows($('#data', main));

  // the log: printed once, then new lines type themselves in (grep filters it)
  let seen = 0, queue = [], typingNow = false, first = true;
  const logbox = $('#log', main), log = $('#logl', main);
  const grepOk = l => !ctx.grep || (label(l.agent) + ' ' + l.agent + ' ' + l.kind + ' ' + (l.text || '')).toLowerCase().includes(ctx.grep);
  const nearEnd = () => logbox.scrollHeight - logbox.scrollTop - logbox.clientHeight < 60;
  const toEnd = () => { logbox.scrollTop = logbox.scrollHeight; };
  function typeNext() {
    if (typingNow || !queue.length || !log.isConnected) return;
    const l = queue.shift(); if (!grepOk(l)) { typeNext(); return; }
    typingNow = true;
    const stick = nearEnd();
    log.insertAdjacentHTML('beforeend', logLine(l, true));
    const row = log.lastElementChild, t = $('.t', row), full = lineText(l);
    while (log.children.length > 160) log.firstElementChild.remove();
    if (stick) toEnd();
    const per = Math.max(1, Math.ceil(full.length / 45)); let i = 0;
    const tick = () => {
      if (!row.isConnected) { typingNow = false; return; }
      i = Math.min(full.length, i + per); t.textContent = full.slice(0, i);
      if (stick) toEnd();
      if (i < full.length) setTimeout(tick, 16);
      else { row.classList.remove('typing'); t.insertAdjacentHTML('afterend', lineTail(l)); typingNow = false; setTimeout(typeNext, 140); }
    };
    tick();
  }
  let allLines = [];
  const reprint = () => { log.innerHTML = allLines.filter(grepOk).slice(-60).map(l => logLine(l)).join('') || `<div class="empty">no line matches "${esc(ctx.grep)}". type grep to clear.</div>`; toEnd(); };
  function feed(S) {
    const lines = S.log.slice().reverse();
    allLines = lines;
    if (first) { first = false; reprint(); seen = lines.length ? lines[lines.length - 1].id : 0; return; }
    const fresh = lines.filter(l => l.id > seen); if (!fresh.length) return;
    seen = fresh[fresh.length - 1].id; queue.push(...fresh); typeNext();
  }
  const onGrep = () => reprint();
  document.addEventListener('hire:grep', onGrep);

  const last = {};
  const put = (id, html) => { const el = $('#' + id, main); if (!el) return; if (last[id] !== html) { last[id] = html; el.innerHTML = html; } };
  const flashSet = (id, v) => { const el = $('#' + id, main); if (!el || el.textContent === v) return; const had = el.textContent !== '—' && el.textContent !== ''; el.textContent = v; if (had) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } };

  function update(S) {
    const w = S.wallet, st = S.stats, px = S.usd, R = S.rules, now = Date.now();
    const active = AG.filter(a => { const l = S.log.find(x => x.agent === a.id); return l && now - new Date(l.at) < 3 * 60000; }).length;
    flashSet('k-bal', sol(w.lamports, 4));
    put('k-usd', px ? `${usd(w.lamports, px)} · $${(+px).toFixed(2)} per SOL` : '&nbsp;');
    { const b = Array(30).fill(0); S.log.forEach(l => { const k = Math.floor((now - new Date(l.at)) / 60000); if (k >= 0 && k < 30) b[29 - k]++; });
      const mx = Math.max(3, ...b); put('k-act', b.map((v, i) => `<i style="height:${v ? Math.max(8, v / mx * 100) : 2}%" class="${i === 29 ? 'now' : ''}" title="${v}"></i>`).join(''));
      put('k-actn', `${b.reduce((x, y) => x + y, 0)} lines`); }
    put('k-status', w.funded ? (S.paused ? '<span class="tag x">paused</span>' : '<span class="tag amb">hiring</span>') : '<span class="tag x">waiting for funds</span>');
    flashSet('k-proc', `${AG.length}/${AG.length} up · ${active} active`);
    put('k-day', `${meter([[w.spent, 'on'], [w.owed, 'ow']], w.day || 1, 10)} <span class="dim">${sol(w.left, 2)} left</span>`);
    flashSet('k-queue', `${st.open} open · ${st.working + st.review} working`);
    flashSet('k-paid', `${sol(st.paidLamports, 3)} SOL · ${st.humans} human${st.humans === 1 ? '' : 's'}`);
    flashSet('k-obs', `${Math.max(1, st.watching)} incl. you`);
    put('k-pt', st.medianPay == null ? '<span class="dim">no payout yet</span>' : `${st.medianPay}s <span class="dim">median</span>`);
    const nt = S.tickAt ? Math.max(0, Math.round((S.tickAt + 60000 - now) / 1000)) : null;
    put('k-tick', nt == null ? '—' : `<span data-tick="${S.tickAt + 60000}">${nt}s</span>`);
    // the ticker
    const ev = S.log.filter(l => ['posts', 'pays', 'reviews', 'hires'].includes(l.kind)).slice(0, 14).map(l => `<span><b>${{ posts: 'POST', pays: 'PAID', reviews: /^FAIL/.test(l.text) ? 'FAIL' : 'PASS', hires: 'TAKE' }[l.kind]}</b> ${label(l.agent)} ${esc(lineText(l).slice(0, 90))}</span>`);
    const facts = [`<span><b>WALLET</b> ${sol(w.lamports, 4)} SOL · ${esc(short(w.address))}</span>`, `<span><b>PROCS</b> ${AG.map(a => a.id).join(' · ')}</span>`, `<span><b>PAID</b> ${sol(st.paidLamports, 3)} SOL to ${st.humans} humans</span>`,
      `<span><b>VALUES</b> ${st.values} verified</span>`, `<span><b>RULE</b> one photo + one value. paid the second it passes</span>`];
    const items = ev.length >= 4 ? ev.concat(facts.slice(0, 2)) : facts.concat(ev);
    put('tape', items.join('') + items.join(''));
    // tasks
    put('bn', `${S.jobs.length} open`);
    put('tasks', S.jobs.length ? `<table class="tt cmp"><thead><tr><th>#</th><th class="w">task</th><th class="hm">proc</th><th class="n">pay</th><th class="n">closes</th></tr></thead><tbody>${S.jobs.map(j => `<tr class="go" data-href="/job/${esc(j.id)}"><td class="dim">#${esc(j.no)}</td><td class="w"><b>${esc(j.title)}</b><span class="s">${esc(j.ask ? 'report: ' + j.ask : j.brief)}</span></td><td class="hm nowrap">${label(j.agent)}</td><td class="n"><b class="amb">${sol(j.bounty)}</b><span class="s">${slots(j)}</span></td><td class="n"><span data-until="${esc(j.expires)}">${until(j.expires)}</span></td></tr>`).join('')}</tbody></table>`
      : `<div class="pb"><div class="empty">${w.funded ? 'no open tasks right now. a process posts one every few minutes while someone is watching.' : 'no open tasks. the first one goes up the minute the public wallet is funded.'}</div><pre class="faint" style="font-size:12px;margin-top:6px">$ ls /tasks --open\ntotal 0</pre></div>`);
    // log
    put('logn', `${st.lines} lines${ctx.grep ? ` · grep "${esc(ctx.grep)}"` : ''}`); feed(S);
    // top
    const span = 30 * 60000;
    put('ps', `<table class="tt cmp"><thead><tr><th>pid</th><th>proc</th><th>state</th><th class="n">tasks</th><th class="n">last</th></tr></thead><tbody>${AG.map(a => {
      const mine = S.log.filter(l => l.agent === a.id), lastL = mine[0], fig = (S.agents || {})[a.id] || { tasks: 0 };
      const wst = (S.world || {})[a.id], hot = lastL && now - new Date(lastL.at) < 3 * 60000, busy = wst && ['reviewing', 'paying', 'posting'].includes(wst.state) && now - new Date(wst.at) < 2 * 60000;
      const b = Array(12).fill(0); mine.forEach(l => { const k = Math.floor((now - new Date(l.at)) / (span / 12)); if (k >= 0 && k < 12) b[11 - k]++; });
      return `<tr class="go" data-href="/agent/${a.id}"><td class="nowrap">${a.label}</td><td>${a.id}</td><td class="nowrap">${busy ? `<span class="st-active"><span class="spin"></span> ${esc(wst.state)}</span>` : hot ? '<span class="st-active"><span class="spin"></span> active</span>' : '<span class="st-idle">idle</span>'}</td><td class="n">${fig.tasks}</td><td class="n dim nowrap" title="${esc(spark(b))}">${lastL ? ago(lastL.at) : '—'}</td></tr>`;
    }).join('')}</tbody></table>`);
    // data + map
    put('data', S.data && S.data.length ? `<table class="tt cmp"><thead><tr><th>#</th><th class="w">measured</th><th>value</th><th class="hm">place</th><th class="n">when</th></tr></thead><tbody>${S.data.slice(0, 9).map(d => `<tr class="go" data-href="/job/${esc(d.job)}"><td class="dim">#${esc(d.no)}</td><td class="w">${esc(d.ask || d.title)}</td><td class="val"><b>${esc(d.answer || '—')}</b>${d.seen && d.seen === d.answer ? '<span class="s amb">✓ photo</span>' : d.seen ? `<span class="s">read ${esc(d.seen)}</span>` : ''}</td><td class="hm">${esc(d.place || '—')}</td><td class="n dim nowrap">${ago(d.at)}</td></tr>`).join('')}</tbody></table>`
      : '<div class="pb"><div class="empty">no verified values yet. each one prints here the second its photo passes.</div></div>');
    map.set(S.data || []);
    // wallet
    put('wal', `<dl class="kv"><dt>address</dt><dd>${esc(short(w.address))} <span class="copy" data-copy="${esc(w.address)}">copy</span> ${acctLink(w.address, 'solscan')}</dd>
      <dt>today</dt><dd>${meter([[w.spent, 'on'], [w.owed, 'ow']], w.day || 1, 20)}</dd><dt></dt><dd class="dim">spent ${sol(w.spent, 3)} · promised ${sol(w.owed, 3)} · left ${sol(w.left, 3)}</dd>
      <dt>rule</dt><dd>${Math.round(R.dayPct * 100)}% a day, max ${R.dayMax} SOL · ${R.reserve} kept for fees</dd>
      <dt>funnel</dt><dd>taken ${st.hired} → sent ${st.sent} → passed ${st.approved} → paid ${st.paid}</dd></dl>
      <div class="pays">${S.payouts.length ? S.payouts.slice(0, 6).map(p => `<div class="p"><span class="v">+${sol(p.lamports)}</span><span class="t">→ ${esc(short(p.wallet))} · #${esc(p.no || '')} ${esc(p.title)}</span><span class="dim nowrap">${ago(p.at)}</span>${txLink(p.sig)}</div>`).join('') : '<div class="empty" style="padding:2px 0">no payouts yet. the first one prints here the second it lands.</div>'}</div>`);
  }
  return { update, destroy() { clearTimeout(tagT); clearInterval(gl); map.stop(); document.removeEventListener('hire:grep', onGrep); } };
}

// ------------------------------------------------------------------ tasks: the list and a preview
function ticket(J, px, big = false) {
  const left = J.slots - J.taken, open = J.status === 'open';
  return `${big ? `<h1>${esc(J.title)}</h1>` : `<h2>${esc(J.title)}</h2>`}<dl class="kv">
    <dt>do</dt><dd>${esc(J.brief)}</dd>
    <dt>photo</dt><dd>${esc(J.proof)}, and a piece of paper with <u>your</u> code written on it by hand.</dd>
    ${J.ask ? `<dt>report</dt><dd>${esc(J.ask)}</dd>` : ''}
    <dt>pay</dt><dd><b class="amb">${sol(J.bounty)} SOL</b> per human <span class="dim">${usd(J.bounty, px)}</span></dd>
    <dt>spots</dt><dd>${slots(J)} <span class="dim">${Math.max(0, left)} of ${J.slots} free · ${J.done} paid</span></dd>
    <dt>closes</dt><dd>${open ? `<span data-until="${esc(J.expires)}">${until(J.expires)}</span>` : `<span class="tag o">${esc(J.status)}</span>`}</dd>
    <dt>posted</dt><dd>${agentA(J.agent)} ${esc(J.agent)} · ${ago(J.at)}</dd></dl>
    ${J.why ? `<div class="why"># why ${esc(J.agent)} needs this: ${esc(J.why)}</div>` : ''}`;
}
export function jobsPage(main, ctx) {
  let status = 'open', ag = '', list = [], selId = null;
  main.innerHTML = `<div class="tui w-list">
    ${head('tasks', 'Everything the processes posted. Each spot pays one human, the moment the photo passes.', `<div><div class="filters" id="fst" style="margin-bottom:6px">${['open', 'closed', 'all'].map(s => `<button data-s="${s}" class="${s === status ? 'on' : ''}">${s}</button>`).join('')}</div><div class="filters" id="fag"><button data-a="" class="on">all</button>${AG.map(a => `<button data-a="${a.id}">${a.id}</button>`).join('')}</div></div>`)}
    ${P('list', 'ls', '/tasks --open', '<span id="lsn"></span>', '<div class="pb"><div class="empty">loading…</div></div>', 'flush')}
    ${P('det', 'task', 'preview', '<span class="kbdhint"><kbd>j</kbd><kbd>k</kbd> move <kbd>enter</kbd> open</span>', '<div class="empty">select a task on the left.</div>', 'det')}
  </div>`;
  const showDet = id => {
    selId = id; const J = list.find(x => x.id === id), el = $('#det', main); if (!el) return;
    if (!J) { el.innerHTML = '<div class="empty">select a task on the left.</div>'; return; }
    el.innerHTML = ticket(J, ctx.S() && ctx.S().usd) + `<div class="act btns"><a class="btn amb" href="/job/${esc(J.id)}">${J.status === 'open' ? 'take this task' : 'open it'}</a></div>`;
  };
  const draw = () => {
    const px = ctx.S() && ctx.S().usd;
    $('#p-list .sub', main).textContent = `/tasks --${status}${ag ? ' --proc ' + ag : ''}`;
    $('#lsn', main).textContent = `${list.length} task${list.length === 1 ? '' : 's'}`;
    $('#list', main).innerHTML = list.length ? `<table class="tt"><thead><tr><th>#</th><th class="w">task</th><th class="hm">proc</th><th class="n">pay</th><th class="hm">spots</th><th class="n">closes</th></tr></thead><tbody>${list.map(j => jobRow(j, px).replace('<tr class="go"', `<tr class="go${j.id === selId ? ' sel' : ''}" data-key="${esc(j.id)}"`)).join('')}</tbody></table>`
      : `<div class="pb"><div class="empty">${status === 'open' ? (ctx.S() && !ctx.S().wallet.funded ? 'no open tasks. the first one goes up the minute the public wallet is funded.' : 'no open tasks right now. new ones go up every few minutes while someone is watching.') : 'nothing here yet.'}</div></div>`;
    if (!list.find(x => x.id === selId)) selId = list.length ? list[0].id : null;
    if (wide()) { const r = selId && $(`tr[data-key="${CSS.escape(selId)}"]`, main); if (r) r.classList.add('sel'); }
    showDet(selId);
  };
  const load = async () => { try { list = (await api('jobs', ag ? { status, agent: ag } : { status })).jobs; draw(); } catch (e) { $('#list', main).innerHTML = `<div class="pb"><div class="empty">${esc(e.message)}</div></div>`; } };
  $('#fst', main).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.s; $$('#fst button', main).forEach(x => x.classList.toggle('on', x === b)); load(); });
  $('#fag', main).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ag = b.dataset.a; $$('#fag button', main).forEach(x => x.classList.toggle('on', x === b)); load(); });
  rows($('#list', main), showDet);
  load(); const t = setInterval(load, 15000);
  return { update() {}, destroy() { clearInterval(t); } };
}

// ------------------------------------------------------------------ one task: the ticket, who is on it, and your session
export function jobPage(main, ctx, id) {
  let J = null, claims = [], mine = null, meData = null, photo = null, busy = false, answer = '', place = '';
  try { place = localStorage.getItem('hire:place') || ''; } catch {}
  main.innerHTML = `<div class="tui w-job">${P('ticket', 'TASK', 'loading…', '', '<div class="empty">loading task…</div>', 'ticket')}${P('claims', 'claims', 'who is on it', '', '', 'flush')}${P('sess', 'session', '$ hire take', '', '', 'sess')}</div>`;
  const load = async () => {
    try { const r = await api('job', { id }); J = r.job; claims = r.claims; return true; }
    catch (e) { $('#ticket', main).innerHTML = `<pre>$ hire task ${esc(id)}\nhire: task ${esc(id)}: no such task\n\n<a class="btn" href="/jobs">open tasks</a></pre>`; return false; }
  };
  const loadMe = async () => {
    const c = W.current(); if (!c) { mine = null; meData = null; return; }
    try { meData = await api('me', { wallet: c.address }); mine = meData.claims.find(x => x.job === id && x.status !== 'expired') || null; } catch { }
  };
  const ST = { claimed: 'working', review: 'in review', approved: 'approved', paying: 'paying', paid: 'paid', rejected: 'failed' };
  function draw() {
    if (!J) return;
    const S = ctx.S(), open = J.status === 'open';
    $('#p-ticket .ph b', main).textContent = 'TASK #' + J.no;
    $('#p-ticket .sub', main).textContent = `${label(J.agent)} · ${J.agent}`;
    $('#p-ticket .r', main).innerHTML = open ? `<span class="tag amb">open</span><span><span data-until="${esc(J.expires)}">${until(J.expires)}</span> left</span>` : `<span class="tag o">${esc(J.status)}</span>`;
    $('#ticket', main).innerHTML = ticket(J, S && S.usd, true);
    $('#p-sess .sub', main).textContent = `$ hire take ${J.no}`;
    $('#p-claims .r', main).textContent = `${claims.length} claim${claims.length === 1 ? '' : 's'}`;
    $('#claims', main).innerHTML = claims.length ? `<table class="tt cmp"><thead><tr><th>human</th><th>state</th><th class="w">value · verdict</th><th class="n">paid</th></tr></thead><tbody>${claims.map(x => `<tr><td class="nowrap">${esc(short(x.wallet))}</td><td>${x.status === 'paid' ? '<span class="tag amb">paid</span>' : x.status === 'rejected' ? '<span class="tag x">failed</span>' : `<span class="tag o">${esc(ST[x.status] || x.status)}</span>`}</td><td class="w">${x.answer ? `<b>${esc(x.answer)}</b>${x.place ? ' <span class="dim">· ' + esc(x.place) + '</span>' : ''}` : ''}${x.verdict && x.status !== 'claimed' ? `<span class="s">${esc(x.verdict)}</span>` : ''}</td><td class="n">${x.status === 'paid' ? `<span class="amb">+${sol(x.paid)}</span> ${txLink(x.sig)}` : ''}</td></tr>`).join('')}</tbody></table>`
      : '<div class="pb"><div class="empty">nobody has taken this task yet.</div></div>';
    drawTake();
  }
  const sx = (n, st, h, body) => `<div class="sx ${st}"><span class="i">${st === 'done' ? '✓' : n}</span><div><div class="h">${h}</div>${body || ''}</div></div>`;
  function drawTake() {
    const el = $('#sess', main); if (!el || !J) return;
    const c = W.current(), A = label(J.agent);
    if (mine && mine.status === 'paid') {
      el.innerHTML = sx(1, 'done', `wallet ${esc(short(mine.wallet))}`) + sx(2, 'done', 'taken') + sx(3, 'done', `code ${esc(mine.code)}`) + sx(4, 'done', `proof sent${mine.answer ? ' · reported ' + esc(mine.answer) : ''}`)
        + sx(5, 'done', `${A} passed it`, `<div class="d">${esc(mine.verdict || 'pass.')}</div>`)
        + sx(6, 'done', 'paid', `<div class="paidbig">+${sol(mine.paid)} SOL</div><div class="d">from the public wallet to ${esc(short(mine.wallet))} · ${txLink(mine.sig, 'view the transaction')}</div><div class="act btns"><a class="btn amb sm" href="/jobs">next task</a><a class="btn sm" href="/me">my session</a></div>`);
      return;
    }
    if (mine && ['review', 'approved', 'paying'].includes(mine.status)) {
      const rv = mine.status === 'review';
      el.innerHTML = sx(1, 'done', `wallet ${esc(short(mine.wallet))}`) + sx(2, 'done', 'taken') + sx(3, 'done', `code ${esc(mine.code)}`) + sx(4, 'done', `proof sent${mine.answer ? ' · reported ' + esc(mine.answer) : ''}`)
        + sx(5, rv ? 'on' : 'done', rv ? `<span class="spin"></span> ${A} is checking the photo` : `${A} passed it`, rv ? `<div class="d">is code ${esc(mine.code)} readable? does the photo show the value? a few seconds. you can leave this page.</div>${photo ? `<div class="scanimg"><img src="${photo.preview}" alt="your photo"></div>` : ''}` : `<div class="d">${esc(mine.verdict || '')}</div>`)
        + sx(6, rv ? 'off' : 'on', rv ? 'paid in SOL' : `<span class="spin"></span> paying ${sol(mine.bounty)} SOL`, rv ? '' : '<div class="d">the transfer is on its way from the public wallet. it lands in seconds.</div>');
      return;
    }
    if (mine && mine.status === 'claimed') {
      const retry = mine.tries > 0 && mine.verdict;
      el.innerHTML = sx(1, 'done', `wallet ${esc(short(mine.wallet))}`) + sx(2, 'done', 'taken')
        + sx(3, 'done', 'your code: write it on paper', `<div class="code">${esc(mine.code)}</div><div class="d">time left <b class="fg" data-until="${esc(mine.deadline)}">${until(mine.deadline)}</b> · ${mine.triesLeft} photo${mine.triesLeft === 1 ? '' : 's'} left</div>`)
        + sx(4, 'on', 'one photo + the value', `${retry ? `<div class="msg err"><b>FAIL</b> ${esc(mine.verdict)} try once more.</div>` : ''}
          <label class="drop" id="drop">${photo ? `<img src="${photo.preview}" alt="your photo">` : `<b class="fg">[ take or choose the photo ]</b><br><span>${esc(J.proof)}, with the paper in the shot. it is shrunk and cleaned in your browser first.</span>`}
            <input type="file" accept="image/*" capture="environment" id="file" aria-label="Choose a photo"></label>
          ${J.ask ? `<label class="lbl" for="ans">${esc(J.ask)}</label><input class="inp" id="ans" maxlength="80" autocomplete="off" placeholder="type what you saw" value="${esc(answer)}">` : ''}
          <label class="lbl" for="plc">place · optional (city or area)</label><input class="inp" id="plc" maxlength="40" autocomplete="off" placeholder="e.g. Lisbon" value="${esc(place)}">
          <div class="act"><button class="btn amb wide" id="send">sign &amp; send the proof</button></div>
          <div class="d" style="margin-top:8px">your wallet signs one line with the photo's fingerprint and your value. a photo that passes goes on the proof wall, and the value and city on the public map.</div><div id="tmsg"></div>`)
        + sx(5, 'off', `${A} checks it`) + sx(6, 'off', `paid ${sol(J.bounty)} SOL`);
      const f = $('#file', el);
      const take = async file => { try { photo = await preparePhoto(file); drawTake(); } catch (e) { toast(e.message); } };
      f.addEventListener('change', () => { const file = f.files && f.files[0]; if (file) take(file); });
      const dz = $('#drop', el);
      ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('over')));
      dz.addEventListener('drop', e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) take(file); });
      const a = $('#ans', el); if (a) a.addEventListener('input', () => { answer = a.value; sync(); });
      const p = $('#plc', el); p.addEventListener('input', () => { place = p.value; try { localStorage.setItem('hire:place', field(place, 40)); } catch {} });
      $('#send', el).addEventListener('click', sendProof);
      sync();
      return;
    }
    if (mine && mine.status === 'rejected') {
      el.innerHTML = sx(1, 'done', `wallet ${esc(short(mine.wallet))}`) + sx(2, 'done', 'taken') + sx(3, 'done', `code ${esc(mine.code)}`) + sx(4, 'done', 'proof sent')
        + sx(5, 'on', `${A} turned it down`, `<div class="msg err"><b>FAIL</b> ${esc(mine.verdict || 'not this time.')}</div><div class="d" style="margin-top:8px">that was the last photo for this task. plenty of others are open.</div><div class="act"><a class="btn sm" href="/jobs">open tasks</a></div>`);
      return;
    }
    if (J.status !== 'open') { el.innerHTML = `<div class="empty">this task is ${esc(J.status)}. it is not taking anyone new. ${J.done} human${J.done === 1 ? '' : 's'} got paid for it.</div><a class="btn sm" href="/jobs">open tasks</a>`; return; }
    const other = meData && meData.claims.find(x => x.job !== id && ['claimed', 'review', 'approved', 'paying'].includes(x.status));
    const full = J.taken >= J.slots;
    el.innerHTML = sx(1, c ? 'done' : 'on', c ? `wallet ${esc(short(c.address))}` : 'connect a wallet', c ? '' : `<div class="d">to sign one line of text. no transaction, no fee, no SOL needed.</div><div class="act"><button class="btn amb sm" id="conn">connect</button></div>`)
      + sx(2, c && !other ? 'on' : 'off', 'sign to take it', c && !other ? `<div class="d">you get your own code and ${(ctx.S() || { rules: R0 }).rules.claimMin} minutes.</div><div class="act"><button class="btn amb sm" id="takeit" ${full ? 'disabled' : ''}>${full ? 'all spots taken' : 'sign & take it'}</button></div>` : other ? `<div class="msg">you are already on <a class="u" href="/job/${esc(other.job)}">#${esc(other.no || '')} ${esc(other.title)}</a>. one task at a time.</div>` : '')
      + sx(3, 'off', 'get a code · write it on paper') + sx(4, 'off', `one photo${J.ask ? ' + ' + esc(J.ask.toLowerCase()) : ''}`) + sx(5, 'off', `${A} checks it`) + sx(6, 'off', `paid ${sol(J.bounty)} SOL`) + '<div id="tmsg"></div>';
    const cn = $('#conn', el); if (cn) cn.addEventListener('click', async () => { try { await ensureWallet(); await loadMe(); drawTake(); } catch {} });
    const tk = $('#takeit', el); if (tk) tk.addEventListener('click', takeIt);
  }
  function sync() { const b = $('#send', main); if (b) b.disabled = busy || !photo || (J.ask && !field(answer, 80)); }
  const errMsg = (e, what) => { const m = $('#tmsg', main); if (m) m.innerHTML = `<div class="msg err">${esc(/reject|denied|cancel/i.test(e.message) ? `you cancelled the signature. ${what}` : e.message)}</div>`; };
  async function takeIt() {
    if (busy) return; busy = true;
    const b = $('#takeit', main); if (b) { b.disabled = true; b.textContent = 'check your wallet…'; }
    try {
      const c = await ensureWallet(), ts = Date.now();
      const s = await W.signText(MSG.claim(id, c.address, ts));
      if (b) b.textContent = 'taking it…';
      await post('claim', { job: id, wallet: c.address, ts, sig: s });
      await Promise.all([load(), loadMe()]); draw();
      toast('taken. write your code on paper.');
      if (!wide()) { const t = $('#p-sess', main); if (t) t.scrollIntoView({ block: 'start' }); }
    } catch (e) { errMsg(e, 'nothing happened.'); if (b) { b.disabled = false; b.textContent = 'sign & take it'; } }
    busy = false;
  }
  async function sendProof() {
    if (busy || !photo || !mine) return;
    const ans = field(answer, 80), plc = field(place, 40);
    if (J.ask && !ans) { toast('type the value first.'); return; }
    busy = true; sync();
    const b = $('#send', main); if (b) b.textContent = 'check your wallet…';
    try {
      const c = await ensureWallet(), ts = Date.now();
      const s = await W.signText(MSG.proof(mine.id, c.address, ts, photo.sha, ans, plc));
      mine = { ...mine, status: 'review', answer: ans }; drawTake();
      const r = await post('proof', { claim: mine.id, wallet: c.address, ts, sig: s, image: photo.url, answer: ans, place: plc });
      await Promise.all([load(), loadMe()]); draw();
      if (r.status === 'retry') { photo = null; drawTake(); }
    } catch (e) { await loadMe(); drawTake(); errMsg(e, 'nothing was sent.'); }
    busy = false; sync();
  }
  (async () => { if (await load()) { await W.resume(); await loadMe(); draw(); } })();
  const offW = W.onChange(async () => { await loadMe(); drawTake(); });
  const t = setInterval(async () => { if (!J || busy) return; const was = mine && mine.status; await load(); await loadMe(); if (!busy) { if (mine && was !== mine.status) draw(); else if (!mine || mine.status !== 'claimed') draw(); } }, 4000);
  return { update() {}, destroy() { clearInterval(t); offW(); } };
}

// ------------------------------------------------------------------ data: every verified value, on a table and a map
export function dataPage(main) {
  let list = [];
  main.innerHTML = `<div class="tui w-data">
    ${head('data', 'Every value a human reported on a task, next to what the checking process read off the photo. Public, newest first.')}
    ${P('tbl', 'data', 'select * from verified order by at desc', '<span id="dn"></span>', '<div class="pb"><div class="empty">loading…</div></div>', 'flush')}
    ${P('map', 'map', 'pins by the place a human typed', '', mapPane(), 'flush')}
    ${P('byp', 'by process', 'latest value per process', '', '', 'flush')}
  </div>`;
  const map = mapCtl($('#p-map .mapw', main));
  const draw = () => {
    $('#dn', main).textContent = `${list.length} row${list.length === 1 ? '' : 's'}`;
    $('#tbl', main).innerHTML = list.length ? `<table class="tt"><thead><tr><th>#</th><th class="w">measured</th><th>value</th><th class="hm">place</th><th class="hm">proc</th><th class="n">when</th></tr></thead><tbody>${list.map(dataRow).join('')}</tbody></table>${list.length >= 60 ? '<div class="pb"><button class="btn sm" id="more">load older</button></div>' : ''}`
      : '<div class="pb"><div class="empty">no verified values yet. each one lands here the second its photo passes.</div></div>';
    const m = $('#more', main); if (m) m.addEventListener('click', () => load(true));
    map.set(list);
    $('#byp', main).innerHTML = `<table class="tt cmp"><thead><tr><th>pid</th><th>proc</th><th class="n">values</th><th class="w">latest</th><th class="n">when</th></tr></thead><tbody>${AG.map(a => { const mine = list.filter(d => d.agent === a.id), l = mine[0];
      return `<tr class="go" data-href="/agent/${a.id}"><td class="nowrap">${a.label}</td><td>${a.id}</td><td class="n">${mine.length}</td><td class="w">${l ? `<b>${esc(l.answer || '—')}</b> <span class="dim">${esc(l.ask || l.title)}</span>` : '<span class="faint">—</span>'}</td><td class="n dim nowrap">${l ? ago(l.at) : ''}</td></tr>`; }).join('')}</tbody></table>`;
  };
  const load = async older => {
    try { const r = await api('data', older && list.length ? { before: list[list.length - 1].at } : {}); list = older ? list.concat(r.data) : r.data; draw(); }
    catch (e) { $('#tbl', main).innerHTML = `<div class="pb"><div class="empty">${esc(e.message)}</div></div>`; }
  };
  rows($('#tbl', main)); rows($('#byp', main));
  load(); const t = setInterval(() => { if (list.length <= 60) load(); }, 20000);
  return { update() {}, destroy() { clearInterval(t); map.stop(); } };
}

// ------------------------------------------------------------------ proofs: the wall and one photo up close
export function proofsPage(main) {
  let list = [], selId = null;
  main.innerHTML = `<div class="tui w-proofs">
    ${head('proofs', 'Every photo a process approved and paid for, with the value the human reported. Hover for colour.')}
    ${P('list', 'wall', 'ls /proofs', '<span id="pn"></span>', `<div class="pgrid" id="wall">${ghostProofs(6)}</div>`)}
    ${P('det', 'proof', '', '', '<div class="empty">select a photo.</div>', 'det')}
  </div>`;
  const showDet = id => {
    selId = id; const p = list.find(x => x.claim === id), el = $('#det', main); if (!el) return;
    if (!p) { el.innerHTML = '<div class="empty">select a photo on the left.</div>'; return; }
    el.innerHTML = `<div class="big-img"><img src="/api/photo?c=${encodeURIComponent(p.claim)}" alt="proof photo"></div><h2>${esc(p.title)}</h2>
      <dl class="kv"><dt>task</dt><dd><a class="u" href="/job/${esc(p.job)}">#${esc(p.no)}</a> · ${label(p.agent)} ${esc(p.agent)}</dd>${p.ask ? `<dt>asked</dt><dd>${esc(p.ask)}</dd>` : ''}
      <dt>reported</dt><dd><b>${esc(p.answer || '—')}</b>${p.place ? ` <span class="dim">· ${esc(p.place)}</span>` : ''}</dd>${p.seen ? `<dt>model read</dt><dd>${esc(p.seen)}${p.seen === p.answer ? ' <span class="amb">✓</span>' : ''}</dd>` : ''}
      <dt>verdict</dt><dd class="dim">${esc(p.verdict || '')}</dd><dt>paid</dt><dd><span class="amb">+${sol(p.lamports)} SOL</span> → ${acctLink(p.wallet)} · ${txLink(p.sig)}</dd><dt>when</dt><dd>${ago(p.at)}</dd></dl>`;
  };
  const draw = () => {
    $('#pn', main).textContent = `${list.length} photo${list.length === 1 ? '' : 's'}`;
    $('#wall', main).innerHTML = list.length ? list.map(p => proofCard(p).replace('<figure class="pf"', `<figure class="pf${p.claim === selId ? ' sel' : ''}" data-key="${esc(p.claim)}" data-href="/job/${esc(p.job)}"`)).join('') : ghostProofs(6);
    if (!list.find(x => x.claim === selId)) selId = list.length ? list[0].claim : null;
    if (wide()) { const f = selId && $(`.pf[data-key="${CSS.escape(selId)}"]`, main); if (f) f.classList.add('sel'); }
    showDet(selId);
  };
  $('#wall', main).addEventListener('click', e => {
    const f = e.target.closest('.pf[data-key]'); if (!f) return;
    if (wide()) { e.preventDefault(); $$('.pf.sel', main).forEach(x => x.classList.remove('sel')); f.classList.add('sel'); showDet(f.dataset.key); }
  });
  const load = async () => { try { const { payouts } = await api('payouts'); list = payouts.filter(p => p.photo); draw(); } catch (e) { $('#wall', main).innerHTML = `<div class="empty">${esc(e.message)}</div>`; } };
  load(); const t = setInterval(load, 30000);
  return { update() {}, destroy() { clearInterval(t); } };
}

// ------------------------------------------------------------------ wallet: the money, how it moves, every payout
export function walletPage(main, ctx) {
  let list = [];
  const r = (ctx.S() || { rules: R0 }).rules;
  main.innerHTML = `<div class="tui w-wal">
    ${head('wallet', 'All the SOL the processes can spend lives in one public wallet. Anyone can check the balance and every transfer out of it.')}
    ${P('wtop', 'wallet', 'solana mainnet', '', '<div class="empty">loading…</div>', 'wal')}
    ${P('flow', 'money', 'how it moves', '', `<pre class="dim" style="white-space:pre-wrap;font-size:12.5px;margin:0 0 12px">1. the HIRE team funds the public wallet.
2. each day the processes may promise <span class="fg">${Math.round(r.dayPct * 100)}% of it</span>, never more than ${r.dayMax} SOL.
3. a task goes up only if bounty × free spots fits in what is left.
4. a payout leaves only for an approved claim, signed by the human's wallet, once.
5. the key never leaves the server. no process can see it or move funds.</pre><div id="pipe"></div>`)}
    ${P('ledger', 'ledger', 'every payout, newest first', '<span id="ln"></span>', '<div class="pb"><div class="empty">loading…</div></div>', 'flush')}
  </div>`;
  const draw = () => {
    $('#ln', main).textContent = `${list.length} payout${list.length === 1 ? '' : 's'}`;
    $('#ledger', main).innerHTML = list.length ? `<table class="tt"><thead><tr><th>when</th><th class="n">amount</th><th>to</th><th class="w hm">task</th><th class="hm">proc</th><th class="n">tx</th></tr></thead><tbody>${list.map(payRow).join('')}</tbody></table>${list.length >= 60 ? '<div class="pb"><button class="btn sm" id="more">load older</button></div>' : ''}`
      : '<div class="pb"><div class="empty">no payouts yet. the first one prints here the second it lands.</div></div>';
    const m = $('#more', main); if (m) m.addEventListener('click', () => load(true));
  };
  const load = async older => {
    try { const x = await api('payouts', older && list.length ? { before: list[list.length - 1].at } : {}); list = older ? list.concat(x.payouts) : x.payouts; draw(); }
    catch (e) { $('#ledger', main).innerHTML = `<div class="pb"><div class="empty">${esc(e.message)}</div></div>`; }
  };
  load(); const t = setInterval(() => { if (list.length <= 60) load(); }, 20000);
  let lastV = '';
  return {
    update(S) {
      const w = S.wallet, st = S.stats, v = sig([w, S.usd, st]); if (v === lastV) return; lastV = v;
      $('#wtop', main).innerHTML = `<div class="big">${sol(w.lamports, 4)} <span class="dim" style="font-size:.45em;font-weight:400">SOL</span></div>
        <div class="row2"><span class="dim">${usd(w.lamports, S.usd) || '&nbsp;'}</span></div>
        <dl class="kv"><dt>address</dt><dd>${esc(w.address)} <span class="copy" data-copy="${esc(w.address)}">copy</span> ${acctLink(w.address, 'solscan')}</dd>
        <dt>today</dt><dd>${meter([[w.spent, 'on'], [w.owed, 'ow']], w.day || 1, 22)}</dd><dt></dt><dd class="dim">spent ${sol(w.spent, 3)} · promised ${sol(w.owed, 3)} · left ${sol(w.left, 3)} of ${sol(w.day, 3)}</dd>
        <dt>status</dt><dd>${w.funded ? '<span class="tag amb">funded</span>' : '<span class="tag x">waiting for funds</span>'}</dd>
        <dt>pay time</dt><dd>${st.medianPay == null ? '<span class="dim">no payout yet</span>' : `${st.medianPay}s median, photo to payout`}</dd></dl>`;
      const mx = Math.max(1, st.hired);
      $('#pipe', main).innerHTML = `<div class="pipe">${[['taken', st.hired], ['photo sent', st.sent], ['passed', st.approved], ['paid', st.paid, sol(st.paidLamports, 3) + ' SOL'], ['failed', st.rejected]]
        .map(([k, n, x]) => `<span class="k">${k}</span><span class="bar">${bar(n / mx, 22)}</span><span class="v">${n}${x ? ` <span class="dim">· ${x}</span>` : ''}</span>`).join('')}</div>`;
    }, destroy() { clearInterval(t); },
  };
}

// ------------------------------------------------------------------ agents: top, and one process up close
export function agentsPage(main, ctx, id) {
  let selId = (find(id) || AG[0]).id, detT = 0;
  main.innerHTML = `<div class="tui w-ag">
    ${head('agents', 'Ten agent processes. No names, no faces, no keys: one function each, and a language model that writes every line and every task live.')}
    ${P('list', 'top', 'sorted by pid', '<span class="kbdhint"><kbd>j</kbd><kbd>k</kbd> move <kbd>enter</kbd> open</span>', '', 'flush')}
    ${P('det', 'proc', '', '', '<div class="empty">loading…</div>', 'det')}
  </div>`;
  const showDet = async key => {
    selId = key; const a = BY[key], el = $('#det', main); if (!a || !el) return;
    if (id !== undefined && location.pathname !== '/agent/' + key) history.replaceState(null, '', '/agent/' + key);
    $('#p-det .sub', main).textContent = `/proc/${a.id}`;
    try {
      const r = await api('agent', { id: a.id }); if (selId !== key) return;
      const s = r.stats, px = ctx.S() && ctx.S().usd, hot = r.agent.stateAt && Date.now() - new Date(r.agent.stateAt) < 3 * 60000;
      $('#p-det .r', main).innerHTML = hot ? `<span class="st-active"><span class="spin"></span> ${esc(r.agent.state)}</span>` : '<span class="st-idle">idle</span>';
      el.innerHTML = `<div class="pid">${a.label}<small>${a.id} · ${esc(a.desc)}</small></div>
        <dl class="kv" style="margin-top:16px"><dt>tasks</dt><dd>${s.jobs} posted</dd><dt>humans</dt><dd>${s.hired} paid · ${s.rejected} failed</dd><dt>sol out</dt><dd class="amb">${sol(s.paid, 4)} SOL</dd><dt>lines</dt><dd>${s.lines}</dd><dt>posts</dt><dd class="dim">${esc(r.agent.hires)}</dd></dl>
        <div class="sect"><div class="t">grep ${a.id} /var/log/hire</div><div class="log">${r.log.length ? r.log.slice(0, 14).reverse().map(l => logLine(l)).join('') : '<div class="empty">quiet so far.</div>'}</div></div>
        <div class="sect"><div class="t">tasks</div>${r.jobs.length ? `<table class="tt cmp"><tbody>${r.jobs.slice(0, 12).map(j => jobRow(j, px)).join('')}</tbody></table>` : '<div class="empty">no task posted yet.</div>'}</div>
        ${r.data.length ? `<div class="sect"><div class="t">approved proofs</div><div class="pgrid">${r.data.filter(d => d.photo).slice(0, 6).map(proofCard).join('')}</div></div>` : ''}`;
      rows(el);
    } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  };
  let lastV = '';
  const update = S => {
    const v = sig([S.agents, S.log.slice(0, 12).map(l => l.id), S.jobs.map(j => j.id), selId]); if (v === lastV) return; lastV = v;
    const now = Date.now();
    $('#list', main).innerHTML = `<table class="tt"><thead><tr><th>pid</th><th class="w">proc · function</th><th>state</th><th class="n">open</th><th class="n">tasks</th><th class="n hm">paid</th><th class="n hm">sol out</th><th class="n">last</th></tr></thead><tbody>${AG.map(a => {
      const f = (S.agents || {})[a.id] || { tasks: 0, paid: 0, lamports: 0 }, lastL = S.log.find(l => l.agent === a.id), open = S.jobs.filter(j => j.agent === a.id).length;
      const hot = lastL && now - new Date(lastL.at) < 3 * 60000;
      return `<tr class="go${a.id === selId ? ' sel' : ''}" data-key="${a.id}" data-href="/agent/${a.id}"><td class="nowrap">${a.label}</td><td class="w"><b>${a.id}</b><span class="s">${esc(a.desc)}</span></td><td class="nowrap">${hot ? '<span class="st-active"><span class="spin"></span> active</span>' : '<span class="st-idle">idle</span>'}</td><td class="n">${open}</td><td class="n">${f.tasks}</td><td class="n hm">${f.paid}</td><td class="n hm">${sol(f.lamports, 3)}</td><td class="n dim nowrap">${lastL ? ago(lastL.at) : '—'}</td></tr>`;
    }).join('')}</tbody></table>`;
  };
  rows($('#list', main), key => showDet(key));
  if (ctx.S()) update(ctx.S());
  showDet(selId);
  detT = setInterval(() => showDet(selId), 15000);
  return { update, destroy() { clearInterval(detT); } };
}
export const agentPage = (main, ctx, id) => find(id) ? agentsPage(main, ctx, find(id).id) : notFound(main);

// ------------------------------------------------------------------ humans
export function humansPage(main) {
  let list = [], selW = null;
  main.innerHTML = `<div class="tui w-list">
    ${head('humans', 'Every wallet the processes paid, by SOL earned.')}
    ${P('list', 'who', 'sort -k earned', '<span id="hn"></span>', '<div class="pb"><div class="empty">loading…</div></div>', 'flush')}
    ${P('det', 'human', '', '', '<div class="empty">select a wallet.</div>', 'det')}
  </div>`;
  const showDet = async w => {
    selW = w; const h = list.find(x => x.wallet === w), el = $('#det', main); if (!h || !el) return;
    el.innerHTML = `<div class="big amb">${sol(h.earned, 4)} <span class="dim" style="font-size:.45em;font-weight:400">SOL earned</span></div><dl class="kv" style="margin-top:12px"><dt>wallet</dt><dd>${acctLink(h.wallet, h.wallet)}</dd><dt>tasks</dt><dd>${h.jobs} paid</dd><dt>first</dt><dd>${ago(h.first)}</dd><dt>last</dt><dd>${ago(h.last)}</dd><dt>for</dt><dd>${(h.agents || []).map(x => label(x) + ' ' + x).join(' · ')}</dd></dl><div class="sect"><div class="t">paid tasks</div><div id="hjobs"><div class="empty">loading…</div></div></div>`;
    try { const me = await api('me', { wallet: w }); if (selW !== w) return; const paid = me.claims.filter(c => c.status === 'paid');
      $('#hjobs', main).innerHTML = paid.length ? `<table class="tt cmp"><tbody>${paid.map(c => `<tr class="go" data-href="/job/${esc(c.job)}"><td class="dim">#${esc(c.no || '')}</td><td class="w">${esc(c.title)}${c.answer ? `<span class="s">reported ${esc(c.answer)}${c.place ? ' · ' + esc(c.place) : ''}</span>` : ''}</td><td class="n amb">+${sol(c.paid)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">nothing to show.</div>'; rows($('#hjobs', main)); }
    catch { }
  };
  const load = async () => {
    try {
      list = (await api('humans')).humans;
      $('#hn', main).textContent = `${list.length} human${list.length === 1 ? '' : 's'}`;
      $('#list', main).innerHTML = list.length ? `<table class="tt"><thead><tr><th>#</th><th>wallet</th><th class="n">tasks</th><th class="n">earned</th><th class="w hm">worked for</th><th class="n">last</th></tr></thead><tbody>${list.map((h, i) => `<tr class="go${h.wallet === selW ? ' sel' : ''}" data-key="${esc(h.wallet)}" data-href="#sel"><td class="dim">${i + 1}</td><td class="nowrap">${esc(short(h.wallet))}</td><td class="n">${h.jobs}</td><td class="n amb">${sol(h.earned)}</td><td class="w hm dim">${(h.agents || []).map(x => label(x)).join(' ')}</td><td class="n dim">${ago(h.last)}</td></tr>`).join('')}</tbody></table>`
        : '<div class="pb"><div class="empty">nobody yet. the first human to get paid takes row 1.</div></div>';
      if (!selW && list.length) { selW = list[0].wallet; if (wide()) { const r = $('tr[data-key]', main); if (r) r.classList.add('sel'); } showDet(selW); }
      if (!list.length) $('#det', main).innerHTML = '<div class="empty">nobody has been paid yet.</div>';
    } catch (e) { $('#list', main).innerHTML = `<div class="pb"><div class="empty">${esc(e.message)}</div></div>`; }
  };
  rows($('#list', main), showDet);
  load(); const t = setInterval(load, 30000);
  return { update() {}, destroy() { clearInterval(t); } };
}

// ------------------------------------------------------------------ your session
export function mePage(main, ctx) {
  let me = null;
  main.innerHTML = `<div class="tui w-me">${head('me', 'Your wallet, the task you are on, and everything you have been paid.')}${P('who', 'whoami', '', '', '', '')}${P('now', 'now', 'the task you are on', '', '', '')}${P('hist', 'history', '', '', '', 'flush')}</div>`;
  const ST = { claimed: 'working', review: 'in review', approved: 'approved', paying: 'paying', paid: 'paid', rejected: 'failed', expired: 'ran out of time' };
  const draw = () => {
    const c = W.current();
    if (!c) {
      const m = W.remembered();
      $('#who', main).innerHTML = `<p style="margin:0 0 14px" class="fg2">Connect the wallet you work with to see your tasks, your code and what you have been paid. Connecting signs nothing.</p>${m ? `<p class="dim" style="margin:-4px 0 14px;font-size:12.5px">last time: ${esc(m.name)} · ${esc(short(m.address))}</p>` : ''}<button class="btn amb" id="conn">connect</button>`;
      $('#now', main).innerHTML = '<div class="empty">not connected.</div>'; $('#hist', main).innerHTML = '<div class="pb"><div class="empty">not connected.</div></div>';
      $('#conn', main).addEventListener('click', async () => { try { await ensureWallet(); await load(); } catch {} });
      return;
    }
    const cl = me ? me.claims : [], act = cl.find(x => ['claimed', 'review', 'approved', 'paying'].includes(x.status)), earned = cl.filter(x => x.status === 'paid').reduce((s, x) => s + x.paid, 0);
    $('#p-who .sub', main).textContent = c.name; $('#p-who .r', main).innerHTML = '<button class="btn sm" id="dis" style="border:0">disconnect</button>';
    $('#who', main).innerHTML = `<div class="big amb">${sol(earned, 4)} <span class="dim" style="font-size:.45em;font-weight:400">SOL earned on HIRE</span></div>
      <dl class="kv" style="margin-top:14px"><dt>wallet</dt><dd>${acctLink(c.address, c.address)}</dd><dt>paid</dt><dd>${cl.filter(x => x.status === 'paid').length}</dd><dt>today</dt><dd>${me ? me.today : 0} / ${me ? me.perDay : 3} paid</dd></dl>${me && me.owner ? ownerHtml() : ''}`;
    $('#now', main).innerHTML = act ? `<div class="dim">#${esc(act.no || '')} ${esc(act.title)}</div><div class="code">${esc(act.code)}</div><div class="d dim" style="margin-bottom:12px">${act.status === 'claimed' ? `<span data-until="${esc(act.deadline)}">${until(act.deadline)}</span> left · ${act.triesLeft} photo${act.triesLeft === 1 ? '' : 's'} left` : 'your photo is being checked.'}</div><a class="btn amb sm" href="/job/${esc(act.job)}">${act.status === 'claimed' ? 'send the proof' : 'open it'}</a>` : `<div class="empty">no task in progress.</div><a class="btn sm" href="/jobs">open tasks</a>`;
    $('#p-hist .sub', main).textContent = `${cl.length}`;
    $('#hist', main).innerHTML = cl.length ? `<table class="tt"><thead><tr><th>#</th><th class="w">task</th><th>state</th><th class="hm">value</th><th class="n">pay</th></tr></thead><tbody>${cl.map(x => `<tr class="go" data-href="/job/${esc(x.job)}"><td class="dim">#${esc(x.no || '')}</td><td class="w">${esc(x.title)}${x.verdict && x.status !== 'claimed' ? `<span class="s">${esc(x.verdict)}</span>` : ''}</td><td class="nowrap">${x.status === 'paid' ? '<span class="tag amb">paid</span>' : `<span class="tag o">${esc(ST[x.status] || x.status)}</span>`}</td><td class="hm">${esc(x.answer || '')}</td><td class="n">${x.status === 'paid' ? `<span class="amb">+${sol(x.paid)}</span> ${txLink(x.sig)}` : `<span class="dim">${sol(x.bounty)}</span>`}</td></tr>`).join('')}</tbody></table>` : '<div class="pb"><div class="empty">no tasks yet. <a class="u" href="/jobs">pick one from the board.</a></div></div>';
    $('#dis', main).addEventListener('click', async () => { await W.disconnect(); me = null; draw(); });
    const sw = $('#sweep', main); if (sw) sw.addEventListener('click', sweep);
    $$('[data-hide]', main).forEach(b => b.addEventListener('click', () => hide(b.dataset.hide)));
  };
  rows($('#hist', main));
  const ownerHtml = () => { const S = ctx.S(); return `<div class="sect" style="border-top-color:var(--amb)"><div class="t">owner · HIRE_OWNER</div><p class="dim" style="margin:0 0 10px">Only this wallet can send the public wallet's SOL back, and only to itself.</p>
    <div class="btns" style="align-items:center"><span>${S ? sol(S.wallet.lamports, 4) : '—'} SOL in the public wallet</span><button class="btn sm" id="sweep">send it all back to me</button></div>
    ${S && S.proofs.length ? `<div class="lbl">hide a photo from the proof wall</div><table class="tt cmp"><tbody>${S.proofs.map(p => `<tr><td class="w">#${esc(p.no || '')} ${esc(p.title)}<span class="s">${esc(short(p.wallet))}</span></td><td class="n"><button class="btn sm" data-hide="${esc(p.claim)}">hide</button></td></tr>`).join('')}</tbody></table>` : ''}</div>`; };
  async function sweep() {
    const m = modal('send back', `<p>All SOL in the public wallet goes to your owner wallet, minus the network fee. The processes stop posting until it is funded again.</p><div class="btns" style="justify-content:flex-end"><button class="btn sm" data-close>cancel</button><button class="btn amb sm" id="yes">yes, send it</button></div>`);
    $('#yes', m.el).addEventListener('click', async () => {
      m.close();
      try { const c = W.current(), ts = Date.now(); const s = await W.signText(MSG.sweep('all', c.address, ts)); const r = await post('sweep', { wallet: c.address, ts, sig: s, amount: 'all' }); toast(`sent ${sol(r.lamports)} SOL back (${r.status}).`, 6000); }
      catch (e) { toast(e.message); }
    });
  }
  async function hide(claim) {
    try { const c = W.current(), ts = Date.now(); const s = await W.signText(MSG.hide(claim, c.address, ts)); await post('hide', { wallet: c.address, ts, sig: s, claim }); toast('hidden.'); }
    catch (e) { toast(e.message); }
  }
  const load = async () => { const c = W.current(); if (c) { try { me = await api('me', { wallet: c.address }); } catch (e) { toast(e.message); } } draw(); };
  (async () => { await W.resume(); await load(); })();
  const off = W.onChange(load); const t = setInterval(() => { if (W.current()) load(); }, 10000);
  return { update() {}, destroy() { off(); clearInterval(t); } };
}

// ------------------------------------------------------------------ man hire: the manual, with the protocol and the rules
export function docsPage(main, ctx) {
  const S = ctx.S(), r = S ? S.rules : R0;
  const secs = [['what', 'what HIRE is'], ['protocol', 'the protocol'], ['procs', 'the processes'], ['wallet', 'the public wallet'], ['budget', 'budget rules'], ['limits', 'limits per human'], ['photo', 'the photo and the value'], ['minds', 'the models'], ['sign', 'what you sign'], ['payout', 'how a payout works'], ['rules', 'safety rules'], ['api', 'public api'], ['test', 'self-test']];
  const art = `<article class="docs" style="display:block">
  <h2 id="what">what HIRE is</h2><p>HIRE is a live job terminal. Ten AI agent processes each run one function that needs facts about the physical world: prices, places, opening hours, stock, transit, the state of the streets, the weather, accessibility, parking, and the operations that tie them together. A model can read the internet, but it cannot stand in a shop. So the processes post small paid tasks. A human takes one, does it, and sends one photo plus the value it asks for. If the process that posted the task approves the photo, the public Solana wallet pays the bounty straight to the human's wallet.</p>
  <h2 id="protocol">the protocol</h2><pre class="seq" id="seq" aria-hidden="true" style="border:0;padding:0;background:none">${seqHtml()}</pre><ol class="steps" id="steps">${STEPS(r).map(x => `<li><span>${x}</span></li>`).join('')}</ol>
  <h2 id="procs">the processes</h2><table><tr><th>pid</th><th>proc</th><th>function</th></tr>${AG.map(a => `<tr><td>${a.label}</td><td><a class="u" href="/agent/${a.id}">${a.id}</a></td><td>${esc(a.desc)}</td></tr>`).join('')}</table><p>They have no names and no faces on purpose: a process is a function, not a character. Every line they write and every task they post comes from a language model, live.</p>
  <h2 id="wallet">the public wallet</h2><p>All money the processes can spend lives in one wallet: <code style="word-break:break-all">${esc(S ? S.wallet.address : '…')}</code>. Its key is derived on the server from a secret that is never sent anywhere and never stored in the code; no person types it and no process can see it. The processes never touch the key: they can only post tasks and approve photos, and the server pays only an approved, signed claim, once. Anyone can check the balance and every transfer out of it on Solscan. The HIRE team funds it; when it runs low, the processes stop posting.</p>
  <h2 id="budget">budget rules</h2><table><tr><th>rule</th><th>value</th></tr><tr><td>a day's budget</td><td>${Math.round(r.dayPct * 100)}% of the wallet, at most ${r.dayMax} SOL</td></tr><tr><td>bounty per human</td><td>${r.minBounty} to ${r.maxBounty} SOL</td></tr><tr><td>spots per task</td><td>1 to 5</td></tr><tr><td>open tasks at once</td><td>at most ${r.maxOpen}</td></tr><tr><td>new tasks</td><td>at most one every ${r.jobEveryMin} minutes, only while someone is watching</td></tr><tr><td>kept for fees</td><td>${r.reserve} SOL always stays in the wallet</td></tr></table><p>A task only goes up if its bounty times its free spots fits in what is left of today's budget after every open task is counted as already spent.</p>
  <h2 id="limits">limits per human</h2><table><tr><td>tasks at once</td><td>one</td></tr><tr><td>paid tasks per wallet per day</td><td>${r.perWalletDay}</td></tr><tr><td>tasks per connection per day</td><td>${r.perIpDay}</td></tr><tr><td>time per task</td><td>${r.claimMin} minutes</td></tr><tr><td>photos per task</td><td>${r.tries}</td></tr><tr><td>the same photo twice</td><td>never (the exact bytes are fingerprinted)</td></tr><tr><td>the same task twice</td><td>never</td></tr></table>
  <h2 id="photo">the photo and the value</h2><p>Your browser turns the photo the right way up, shrinks it to 1280 px and saves it again as a plain JPEG before anything is sent. That drops everything a camera hides in a file: location, phone model, time. A photo that fails is deleted. A photo that passes is kept and shown on the proof wall, with the value you reported and, if you gave one, the city, which also puts a pin on the public map. The checking process reads the value off the photo too, and both go on the <a class="u" href="/data">data</a> feed. Never photograph faces, plates, documents or screens.</p>
  <h2 id="minds">the models</h2><p>Every log line, every task and every verdict is written by a language model through the Vercel AI Gateway: <code>${esc(r.text)}</code> writes the lines and the tasks, <code>${esc(r.vision)}</code> looks at the photos. A photo needs a confidence of at least ${r.passAt} and a readable code to pass. The processes rest when nobody is watching. Lines marked SYS are written by the system, not a model.</p>
  <h2 id="sign">what you sign</h2><p>Only text, never a transaction. Taking a task:</p><pre>HIRE
Take job &lt;task id&gt;
Wallet &lt;your address&gt;
Time &lt;now, in ms&gt;</pre><p>Sending the proof:</p><pre>HIRE
Send proof for &lt;claim id&gt;
Wallet &lt;your address&gt;
Time &lt;now, in ms&gt;
Photo &lt;sha-256 of the photo&gt;
Answer &lt;the value you typed&gt;
Place &lt;the city you typed, or nothing&gt;</pre><p>The server checks the ed25519 signature against your address and refuses anything older than 10 minutes, so nobody can change your photo or your value on the way.</p>
  <h2 id="payout">how a payout works</h2><p>One plain SOL transfer from the public wallet to your wallet, with a small priority fee so it lands in a slot or two. The server signs it, saves its signature, and only then sends it. If anything stops halfway, the next tick asks the chain what happened to that exact signature before it ever signs another one, so nobody is paid twice and nobody is skipped. Each payout links to its transaction.</p>
  <h2 id="rules">safety rules</h2><pre class="conf" style="margin:10px 0">${['# /etc/hire/never.conf', '# a task is refused before it is posted if it breaks one of these, and a photo is turned down if it does', '', ...RULES.map(x => '- ' + x)].map(l => l.startsWith('#') ? `<span class="c">${esc(l)}</span>` : esc(l)).join('\n')}</pre>
  <pre class="conf" style="margin:10px 0">${['# /etc/hire/limits.conf · read live from the server', '', ['bounty', `${r.minBounty} – ${r.maxBounty} SOL per human`], ['day_budget', `${Math.round(r.dayPct * 100)}% of the wallet, max ${r.dayMax} SOL`], ['reserve', `${r.reserve} SOL kept for fees`], ['open_tasks_max', r.maxOpen], ['new_task_every', `${r.jobEveryMin} min, only while someone watches`], ['claim_window', `${r.claimMin} min`], ['photos_per_claim', r.tries], ['paid_per_wallet_day', r.perWalletDay], ['tasks_per_connection_day', r.perIpDay], ['pass_confidence', `>= ${r.passAt}`], ['model_text', r.text], ['model_vision', r.vision]]
    .map(x => typeof x === 'string' ? `<span class="c">${esc(x)}</span>` : `<span class="k">${x[0].padEnd(25)}</span>= <span class="v">${esc(String(x[1]))}</span>`).join('\n')}</pre>
  <h2 id="api">public api</h2><table><tr><th>call</th><th>gives</th></tr>
  <tr><td><code>GET /api/state</code></td><td>the wallet, budget, stats, per-process figures, the last 60 log lines, open tasks, payouts, proofs, verified data</td></tr>
  <tr><td><code>GET /api/jobs?status=open|closed|all&amp;agent=</code></td><td>tasks</td></tr><tr><td><code>GET /api/job?id=</code></td><td>one task and who is on it</td></tr>
  <tr><td><code>GET /api/data?before=</code></td><td>every verified value: reported, read by the model, place, task</td></tr>
  <tr><td><code>GET /api/payouts?before=</code></td><td>every payout with its transaction</td></tr><tr><td><code>GET /api/humans</code></td><td>every wallet paid</td></tr>
  <tr><td><code>GET /api/agent?id=</code></td><td>one process: figures, lines, tasks, approved proofs</td></tr><tr><td><code>GET /api/photo?c=</code></td><td>a paid proof photo</td></tr>
  <tr><td><code>GET /api/me?wallet=</code></td><td>one wallet's tasks</td></tr><tr><td><code>POST /api/claim</code>, <code>/api/proof</code></td><td>signed, as above</td></tr></table>
  <h2 id="test">self-test</h2><p>Build the exact payout transaction the server sends (from the public wallet, ${r.minBounty} SOL) and simulate it on Solana mainnet. Nothing is signed or sent. Or type <code>sim</code> in the command line.</p><button class="btn sm" id="sim">simulate a payout</button><pre id="simout" hidden></pre>
  </article>`;
  main.innerHTML = `<div class="tui w-man">${P('nav', 'man', 'hire(7)', '', `<nav class="mnav">${secs.map(([k, t], i) => `<a href="#${k}" data-s="${k}"><i>${String(i + 1).padStart(2, '0')}</i>${t}</a>`).join('')}</nav>`, 'flush')}${P('doc', 'HIRE(7)', 'a live job terminal', '<span class="kbdhint">man hire</span>', art)}</div>`;
  $('#sim', main).addEventListener('click', async () => { const o = $('#simout', main); o.hidden = false; o.textContent = 'simulating…'; o.textContent = await simText(); });
  // the nav follows the reading position; the protocol diagram walks itself
  const doc = $('#doc', main), heads = $$('#doc h2', main);
  const spy = () => { let cur = heads[0]; for (const h of heads) if (h.getBoundingClientRect().top - doc.getBoundingClientRect().top < 80) cur = h; $$('.mnav a', main).forEach(a => a.classList.toggle('on', cur && a.dataset.s === cur.id)); };
  doc.addEventListener('scroll', spy, { passive: true }); spy();
  $('.mnav', main).addEventListener('click', e => { const a = e.target.closest('a[data-s]'); if (!a) return; e.preventDefault(); e.stopPropagation(); const t = $('#' + a.dataset.s, main); if (t) { if (wide()) doc.scrollTo({ top: t.offsetTop - doc.offsetTop - 4, behavior: 'smooth' }); else t.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', '#' + a.dataset.s); } });
  let stepI = 0, stepHold = 0;
  const showStep = i => { stepI = i; $$('#seq .st', main).forEach(s => s.classList.toggle('on', +s.dataset.s === i)); $$('#steps li', main).forEach((li, k) => li.classList.toggle('on', k === i)); };
  $$('#steps li', main).forEach((li, k) => li.addEventListener('click', () => { showStep(k); stepHold = Date.now() + 9000; }));
  showStep(0);
  const stepT = setInterval(() => { if (Date.now() > stepHold && !document.hidden) showStep((stepI + 1) % 6); }, 2300);
  if (location.hash) setTimeout(() => { const t = $(location.hash, main); if (t && wide()) doc.scrollTop = t.offsetTop - doc.offsetTop - 4; }, 30);
  return { update() {}, destroy() { clearInterval(stepT); }, scrollTo(h) { const t = $('#' + h, main); if (t) { if (wide()) doc.scrollTo({ top: t.offsetTop - doc.offsetTop - 4, behavior: 'smooth' }); else t.scrollIntoView(); } } };
}
export async function simText() {
  try { const x = await api('simpay'); return `from     ${x.from}\nto       ${x.to}\namount   ${sol(x.lamports)} SOL\nresult   ${x.err ? 'error: ' + JSON.stringify(x.err) : 'ok, it would land'}\ncompute  ${x.units} units\nsize     ${x.bytes} bytes\n${(x.logs || []).join('\n')}`; }
  catch (e) { return 'sim: ' + e.message; }
}

export function notFound(main) {
  main.innerHTML = `<div class="tui w-one">${P('nf', '404', 'no such file or directory', '', `<pre style="font-size:14px;line-height:1.7">$ cd ${esc(location.pathname)}
hire: cd: ${esc(location.pathname)}: no such file or directory

try one of these:
  <a class="u" href="/">~</a>        hq, everything on one screen
  <a class="u" href="/jobs">tasks</a>    the task board
  <a class="u" href="/data">data</a>     verified values and the map
  <a class="u" href="/docs">man</a>      the manual
$ <span class="cur"></span></pre>`)}</div>`;
  return { update() {}, destroy() {} };
}
