// HIRE · shared pieces: the API, formatting, the wallet picker, toasts, and the cards every page uses.
import { AG, BY, avatar, face } from './blob.js?v=2';
import * as W from './wallet.js?v=2';

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
  const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
  if (s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + 'm ago'; if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}
export function until(t) {
  const s = (new Date(t) - Date.now()) / 1000;
  if (s <= 0) return 'closed';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return h ? `${h}h ${m}m` : m >= 10 ? `${m}m` : `${m}m ${String(x).padStart(2, '0')}s`;
}
export const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
export const isMock = sig => !sig || /^mock/.test(sig);
export const txUrl = sig => `https://solscan.io/tx/${sig}`;
export const acctUrl = a => `https://solscan.io/account/${a}`;
export const txLink = (sig, label = 'view tx') => isMock(sig) ? `<span class="mono tx" title="local test: no real transaction">test tx</span>` : `<a class="ext tx" href="${txUrl(sig)}" target="_blank" rel="noopener">${label}</a>`;

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
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t;
  document.body.appendChild(d); setTimeout(() => d.remove(), ms);
}
export function copy(el) {
  const v = el.dataset.copy; if (!v) return;
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => { el.classList.add('done'); const t = el.textContent; el.textContent = 'copied'; setTimeout(() => { el.textContent = t; el.classList.remove('done'); }, 1300); })
    .catch(() => toast(v));
}
export function coinRain(n = 26) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'coinrain';
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.style.left = (Math.random() * 100) + 'vw'; c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = (Math.random() * .7) + 's'; box.appendChild(c); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}
export function modal(html) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { m.remove(); removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', key);
  document.body.appendChild(m); return { el: m, close };
}
// pick a wallet (or, on a phone with none, open this page inside one)
export function pickWallet() {
  return new Promise((resolve, reject) => {
    const list = W.wallets();
    const links = W.deeplinks(location.href);
    const m = modal(`<h3>Connect a wallet</h3><p>Your wallet only signs one line of text to take a job or send a photo. No transaction, no fee, no SOL needed.</p>
      <div class="wl">${list.length ? list.map((w, i) => `<button data-i="${i}"><img src="${esc(w.icon)}" alt="">${esc(w.name)}</button>`).join('')
        : `<p style="margin:0 0 6px">No wallet found in this browser. On a phone, open HIRE inside your wallet:</p>${links.map(l => `<a href="${l.href}" rel="noopener">Open in ${l.name}</a>`).join('')}`}</div>
      <div style="margin-top:14px;text-align:right"><button class="btn ghost sm" data-close>Cancel</button></div>`);
    m.el.addEventListener('click', async e => {
      const b = e.target.closest('button[data-i]'); if (!b) { if (e.target.closest('[data-close]') || e.target === m.el) reject(new Error('cancelled')); return; }
      b.disabled = true;
      try { const c = await W.connect(list[+b.dataset.i]); m.close(); resolve(c); }
      catch (err) { b.disabled = false; toast(err && err.message ? err.message.slice(0, 120) : 'The wallet said no.'); }
    });
  });
}
export async function ensureWallet() { return W.current() || pickWallet(); }

// ---- cards
export const agentName = id => (BY[id] || { name: id }).name;
export function jobCard(j, px) {
  const a = BY[j.agent] || AG[0], left = j.slots - j.done;
  const pips = Array.from({ length: j.slots }, (_, i) => `<i class="${i < j.done ? 'd' : i < j.taken ? 't' : ''}"></i>`).join('');
  return `<a class="job rv" href="/job/${esc(j.id)}" data-job="${esc(j.id)}"><span class="stripe" style="background:${a.c}"></span>
    <div class="jt">${face(a.id, 30)}<div><b>${esc(a.name)}</b> is hiring<br><span class="mono">job #${esc(j.no)}</span></div></div>
    <h3>${esc(j.title)}</h3><p>${esc(j.brief)}</p>
    <div class="jf"><div class="pay"><b>${sol(j.bounty)} SOL</b><span>${usd(j.bounty, px) || 'per human'}</span><div class="slots" title="${j.done} paid, ${j.taken - j.done} working, ${j.slots - j.taken} free">${pips}</div></div>
    <div class="left">${j.status === 'open' ? `<b data-until="${esc(j.expires)}">${until(j.expires)}</b>${left > 0 ? `${left} of ${j.slots} left` : 'full'}` : `<b>${esc(j.status)}</b>${j.done} paid`}</div></div></a>`;
}
export function logRow(l) {
  const a = BY[l.agent] || AG[0], t = l.target && BY[l.target];
  const k = { posts: 'job', hires: 'hired', reviews: 'checked', pays: 'paid', thinks: 'thinks' }[l.kind];
  return `<div class="ll k-${esc(l.kind)}" data-id="${l.id}">${face(a.id, 28)}<div><div class="who"><b style="color:${a.c}">${esc(a.name)}</b>${t ? `<span>→ ${esc(t.name)}</span>` : ''}${k ? `<span class="k">${k}</span>` : ''}<time>${hhmm(l.at)}</time></div>
    <div class="txt">${esc(l.text)}</div>${l.job ? `<a class="mono" style="font-size:11.5px;color:var(--mute)" href="/job/${esc(l.job)}">job →</a> ` : ''}${l.sig ? txLink(l.sig) : ''}</div></div>`;
}
export function polaroid(p, i = 0) {
  const a = BY[p.agent] || AG[0];
  return `<figure class="pol rv" style="--rot:${((i * 53) % 7) - 3}deg;margin:0"><div class="ph"><img loading="lazy" src="/api/photo?c=${encodeURIComponent(p.claim)}" alt="Proof photo for ${esc(p.title)}"></div>
    <figcaption><div class="cap">“${esc(p.verdict || 'Approved.')}”</div><div class="meta"><span>${esc(a.name)} · ${esc(p.title)}</span><span>${sol(p.lamports)} SOL</span></div></figcaption></figure>`;
}
export function ghostPolaroids(n = 4) {
  return Array.from({ length: n }, (_, i) => `<div class="pol ghost" style="--rot:${((i * 53) % 7) - 3}deg"><div class="ph"><svg viewBox="0 0 100 100" width="44" height="44"><rect x="18" y="30" width="64" height="46" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="53" r="13" fill="none" stroke="currentColor" stroke-width="3"/><path d="M38 30l5-8h14l5 8" fill="none" stroke="currentColor" stroke-width="3"/></svg></div><div class="cap">${i ? '&nbsp;' : 'the first proof goes here'}</div><div class="meta"><span>&nbsp;</span></div></div>`).join('');
}
export function payoutRow(p) {
  const a = BY[p.agent] || AG[0];
  return `<div class="row">${face(a.id, 28)}<div class="t"><b>${esc(p.title)}</b><span class="mono">${short(p.wallet)}</span> <span>· ${ago(p.at)}</span></div><div class="v">+${sol(p.lamports)} SOL${txLink(p.sig)}</div></div>`;
}
export { avatar, face };
