// HIRE · wallet sign-in, by hand, with the Wallet Standard: wallets announce themselves, you pick one, and it signs ONE
// line of text. No transaction, no fee, no approval of anything but the words on the screen. No wallet library.
const WALLETS = [], seenL = new Set(), curL = new Set();
const usable = w => w && w.features && w.features['standard:connect'] && w.features['solana:signMessage'] && (w.chains || []).some(c => String(c).startsWith('solana:'));
const api = Object.freeze({ register(...ws) { for (const w of ws) if (usable(w) && !WALLETS.includes(w)) WALLETS.push(w); seenL.forEach(f => f(WALLETS.slice())); return () => {}; } });
try { addEventListener('wallet-standard:register-wallet', e => { try { e.detail(api); } catch {} }); } catch {}
try { dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: api })); } catch {}

let CUR = null;
const KEY = 'hire:wallet';
const fire = () => curL.forEach(f => { try { f(CUR); } catch {} });
export const wallets = () => WALLETS.slice();
export const onWallets = f => { seenL.add(f); return () => seenL.delete(f); };
export const current = () => CUR;
export const onChange = f => { curL.add(f); return () => curL.delete(f); };
export function remembered() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }

export async function connect(w, silent = false) {
  const r = await w.features['standard:connect'].connect(silent ? { silent: true } : undefined);
  const accounts = (r && r.accounts && r.accounts.length ? r.accounts : w.accounts) || [];
  const acc = accounts.find(a => (a.chains || []).some(c => String(c).startsWith('solana:'))) || accounts[0];
  if (!acc) throw new Error('The wallet did not share an account.');
  CUR = { wallet: w, account: acc, address: acc.address, name: w.name, icon: w.icon };
  try { localStorage.setItem(KEY, JSON.stringify({ name: w.name, address: acc.address })); } catch {}
  const ev = w.features['standard:events'];
  if (ev && !w.__hireOn) {
    w.__hireOn = true;
    ev.on('change', ch => {
      if (!CUR || CUR.wallet !== w || !ch.accounts) return;
      if (!ch.accounts.length) { CUR = null; fire(); return; }
      const a = ch.accounts[0]; CUR = { ...CUR, account: a, address: a.address };
      try { localStorage.setItem(KEY, JSON.stringify({ name: w.name, address: a.address })); } catch {}
      fire();
    });
  }
  fire(); return CUR;
}
// reconnect quietly to the wallet used last time, if it is here and still trusts this site
export async function resume() {
  const m = remembered(); if (!m || CUR) return null;
  const w = WALLETS.find(x => x.name === m.name); if (!w) return null;
  try { return await connect(w, true); } catch { return null; }
}
export async function disconnect() {
  const w = CUR && CUR.wallet; CUR = null;
  try { localStorage.removeItem(KEY); } catch {}
  fire();
  try { if (w && w.features['standard:disconnect']) await w.features['standard:disconnect'].disconnect(); } catch {}
}
export async function signText(text) {
  if (!CUR) throw new Error('Connect a wallet first.');
  const f = CUR.wallet.features['solana:signMessage'];
  if (!f) throw new Error('This wallet cannot sign a message. Try Phantom, Solflare or Backpack.');
  const out = await f.signMessage({ account: CUR.account, message: new TextEncoder().encode(text) });
  const o = Array.isArray(out) ? out[0] : out;
  return b64(new Uint8Array(o.signature));
}
export const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
// on a phone without a wallet extension: open this page inside the wallet's own browser
export const deeplinks = url => [
  { name: 'Phantom', href: `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(location.origin)}` },
  { name: 'Solflare', href: `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(location.origin)}` },
];
