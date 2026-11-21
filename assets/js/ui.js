// HIRE · shared pieces: the API, formatting, the wallet picker, toasts, and the rows every screen prints.
import { BY, label } from './agents.js?v=3';
import * as W from './wallet.js?v=3';

// set these once the coin is live (left empty, nothing about a token is shown anywhere)
export const CONFIG = { ca: '', x: '' };

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
export function sol(l, d) {
  const v = (+l || 0) / 1e9;
  if (d != null) return v.toFixed(d);
  if (v === 0) return '0';
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 100) return v.toFixed(1);
  if (v >= 1) return v.toFixed(3).replace(/\.?0+$/, '');
  return v.toFixed(4).replace(/\.?0+$/, '');
}
export const usd = (l, px) => px ? '≈ $' + ((+l / 1e9) * px).toFixed((+l / 1e9) * px >= 100 ? 0 : 2) : '';
export function ago(t) {
  if (!t) return '—';
  const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
  if (s < 60) return Math.round(s) + 's ago'; if (s < 3600) return Math.round(s / 60) + 'm ago'; if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}
export function until(t) {
  const s = (new Date(t) - Date.now()) / 1000;
  if (s <= 0) return 'closed';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(x).padStart(2, '0')}s`;
}
export const hms = t => { const d = new Date(t); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };
export const isMock = sig => !sig || /^mock/.test(sig);
export const txUrl = sig => `https://solscan.io/tx/${sig}`;
export const acctUrl = a => `https://solscan.io/account/${a}`;
export const txLink = (sig, text = 'tx') => isMock(sig) ? `<span class="faint" title="local test: no real transaction">test-tx</span>` : `<a class="ext" href="${txUrl(sig)}" target="_blank" rel="noopener">${text}</a>`;
export const acctLink = (a, text) => `<a class="ext" href="${acctUrl(a)}" target="_blank" rel="noopener">${esc(text || short(a))}</a>`;

// ---- the API
export async function api(op, q = {}) {
  const u = '/api/' + op + (Object.keys(q).length ? '?' + new URLSearchParams(q) : '');
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'The server did not answer. Try again.'), { status: r.status });
  return j;
}
export async function post(op, body) {
  const r = await fetch('/api/' + op, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'The server did not answer. Try again.'), { status: r.status });
  return j;
}

// ---- small UI
export function toast(t, ms = 3400) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t;
  document.body.appendChild(d); setTimeout(() => d.remove(), ms);
}
export function copy(el) {
  const v = el.dataset.copy; if (!v) return;
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => { el.classList.add('done'); const t = el.textContent; el.textContent = 'copied'; setTimeout(() => { el.textContent = t; el.classList.remove('done'); }, 1300); })
    .catch(() => toast(v));
}
export function modal(title, html) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="ph"><b>${esc(title)}</b><span class="r"><button class="btn sm" data-close style="border:0">esc</button></span></div><div class="pb">${html}</div></div>`;
  const close = () => { m.remove(); removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', key);
  document.body.appendChild(m); return { el: m, close };
}
// pick a wallet (or, on a phone with none, open this page inside one)
export function pickWallet() {
  return new Promise((resolve, reject) => {
    const list = W.wallets(), links = W.deeplinks(location.href);
    const m = modal('connect', `<p>Your wallet only ever signs a line of text: to take a task and to send its proof. No transaction, no fee, no SOL needed.</p>
      <div class="wl">${list.length ? list.map((w, i) => `<button data-i="${i}"><img src="${esc(w.icon)}" alt="">${esc(w.name)}</button>`).join('')
        : links.map(l => `<a href="${l.href}" rel="noopener">open HIRE inside ${l.name}</a>`).join('')}</div>
      ${list.length ? '' : '<p class="dim" style="margin:12px 0 0;font-size:12.5px">No wallet found in this browser. On a phone, open HIRE inside your wallet app.</p>'}`);
    m.el.addEventListener('click', async e => {
      const b = e.target.closest('button[data-i]'); if (!b) { if (e.target.closest('[data-close]') || e.target === m.el) reject(new Error('cancelled')); return; }
      b.disabled = true;
      try { const c = await W.connect(list[+b.dataset.i]); m.close(); resolve(c); }
      catch (err) { b.disabled = false; toast(err && err.message ? err.message.slice(0, 120) : 'The wallet said no.'); }
    });
  });
}
export async function ensureWallet() { return W.current() || pickWallet(); }

// ---- characters that draw
export function bar(frac, n = 20) {                        // a segmented bar, drawn in CSS so the cells never show seams
  const p = Math.max(0, Math.min(100, (+frac || 0) * 100));
  return `<span class="cbar" style="--n:${n}"><i style="width:${p.toFixed(1)}%"></i></span>`;
}
export function meter(parts, total, n = 24) {             // [[value, cls], ...] laid end to end over total
  let used = 0;
  const segs = parts.map(([v, c]) => { const p = total > 0 ? Math.max(0, Math.min(100 - used, (v / total) * 100)) : 0; used += p; return p ? `<i class="${c}" style="width:${p.toFixed(1)}%"></i>` : ''; }).join('');
  return `<span class="cbar" style="--n:${n}">${segs}</span>`;
}
const BLK = '▁▂▃▄▅▆▇█';
export const spark = arr => { const mx = Math.max(1, ...arr); return arr.map(v => v ? BLK[Math.min(7, Math.round((v / mx) * 7))] : '·').join(''); };
export const slots = j => `<span class="slots">[${Array.from({ length: j.slots }, (_, i) => i < j.done ? '<span class="d">■</span>' : i < j.taken ? '<span class="t">▣</span>' : '<span class="f">□</span>').join('')}]</span>`;
export const agentA = id => BY[id] ? `<a href="/agent/${id}">${label(id)}</a>` : esc(label(id));

// ---- rows
export function jobRow(j, px) {
  const open = j.status === 'open', left = j.slots - j.taken;
  return `<tr class="go" data-href="/job/${esc(j.id)}"><td class="dim">#${esc(j.no)}</td><td class="w"><b>${esc(j.title)}</b><span class="s">${esc(j.ask ? 'report: ' + j.ask : j.brief)}</span></td>
    <td class="hm nowrap">${label(j.agent)}<span class="s">${esc(j.agent)}</span></td><td class="n"><b class="amb">${sol(j.bounty)}</b> SOL<span class="s">${usd(j.bounty, px) || '&nbsp;'}</span></td>
    <td class="hm">${slots(j)}<span class="s">${open ? (left > 0 ? left + ' free' : 'full') : j.done + ' paid'}</span></td>
    <td class="n">${open ? `<span data-until="${esc(j.expires)}">${until(j.expires)}</span>` : `<span class="tag o">${esc(j.status)}</span>`}</td></tr>`;
}
const KT = { posts: ['POST', ''], hires: ['TAKE', 'x'], pays: ['PAID', 'amb'], boot: ['SYS', 'o'], thinks: ['NOTE', 'o'] };
export function logLine(l, typing = false) {
  let tag = '', text = l.text || '';
  if (l.kind === 'reviews') { const m = /^(PASS|FAIL)\s+/.exec(text); tag = `<span class="tag ${m && m[1] === 'FAIL' ? 'x' : ''} k">${m ? m[1] : 'CHECK'}</span>`; if (m) text = text.slice(m[0].length); }
  else if (KT[l.kind]) tag = `<span class="tag ${KT[l.kind][1]} k">${KT[l.kind][0]}</span>`;
  const to = l.kind === 'says' && l.target ? `<span class="to">→${label(l.target)}</span>` : '';
  const fn = l.agent !== 'sys' ? `<span class="fn">${esc(l.agent)}</span>` : '';
  const tail = (l.sig ? `<span class="lk">${txLink(l.sig)}</span>` : '') + (l.job && l.kind !== 'pays' ? `<a class="lk" href="/job/${esc(l.job)}">task ↗</a>` : '');
  return `<div class="ln2 k-${esc(l.kind)}${typing ? ' typing' : ''}" data-id="${l.id}"><time>${hms(l.at)}</time><span class="who">${agentA(l.agent)}</span><span class="tx">${tag}${fn}${to}<span class="t">${typing ? '' : esc(text)}</span>${typing ? '' : tail}</span></div>`;
}
export const lineText = l => { let t = l.text || ''; if (l.kind === 'reviews') t = t.replace(/^(PASS|FAIL)\s+/, ''); return t; };
export const lineTail = l => (l.sig ? `<span class="lk">${txLink(l.sig)}</span>` : '') + (l.job && l.kind !== 'pays' ? `<a class="lk" href="/job/${esc(l.job)}">task ↗</a>` : '');
export function proofCard(p) {
  const val = p.answer || p.seen;
  return `<figure class="pf"><a class="img" href="/job/${esc(p.job || '')}"><img loading="lazy" src="/api/photo?c=${encodeURIComponent(p.claim)}" alt="Proof photo for task ${esc(p.no || '')}: ${esc(p.title)}"><span class="no">#${esc(p.no || '----')} · ${label(p.agent)}</span></a>
    <figcaption><span class="dim">${esc(p.ask || p.title)}</span>${val ? `<span class="val">${esc(val)}</span>` : ''}<span class="vd">${p.place ? esc(p.place) + ' · ' : ''}${ago(p.at)} · <span class="amb">+${sol(p.lamports)} SOL</span></span></figcaption></figure>`;
}
export const ghostProofs = n => Array.from({ length: n }, (_, i) => `<figure class="pf ghost"><div class="img">${i ? '' : 'awaiting first proof'}</div><figcaption><span>#---- · AGT-??</span><span>&nbsp;</span></figcaption></figure>`).join('');
export function payRow(p) {
  return `<tr><td class="dim nowrap">${ago(p.at)}</td><td class="n"><b class="amb">+${sol(p.lamports)}</b> SOL</td><td class="nowrap">${acctLink(p.wallet)}</td>
    <td class="w hm">${p.job ? `<a href="/job/${esc(p.job)}">#${esc(p.no || '')} ${esc(p.title)}</a>` : esc(p.title)}${p.answer ? `<span class="s">reported: ${esc(p.answer)}${p.place ? ' · ' + esc(p.place) : ''}</span>` : ''}</td>
    <td class="hm nowrap">${label(p.agent)}</td><td class="n">${txLink(p.sig)}</td></tr>`;
}
export function dataRow(d) {
  return `<tr class="go" data-href="/job/${esc(d.job)}"><td class="dim">#${esc(d.no)}</td><td class="w">${esc(d.ask || d.title)}<span class="s">${esc(d.title)}</span></td>
    <td class="val"><b>${esc(d.answer || '—')}</b>${d.seen && d.seen !== d.answer ? `<span class="s">model read: ${esc(d.seen)}</span>` : d.seen ? '<span class="s amb">✓ matches photo</span>' : ''}</td>
    <td class="hm">${esc(d.place || '—')}</td><td class="hm nowrap">${label(d.agent)}${d.confidence != null ? `<span class="s">${(+d.confidence).toFixed(2)}</span>` : ''}</td><td class="n dim">${ago(d.at)}</td></tr>`;
}
