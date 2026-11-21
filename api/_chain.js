// HIRE on Solana: the public wallet (its key derived from the master secret, never stored, never sent), its balance, and
// payouts: one plain SOL transfer from the public wallet to the human who did the job.
const L = require('./_lib');

const MOCK = !!process.env.HIRE_MOCK;                     // local dev only: an in-memory chain, nothing real moves
const RPCS = [process.env.RPC_URL, 'https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'].filter(Boolean);
let W3 = null; const w3 = () => W3 || (W3 = require('@solana/web3.js'));
const timedFetch = ms => (url, opt = {}) => fetch(url, { ...opt, signal: AbortSignal.timeout(ms) });
let conns = null;
function connections() {
  if (!conns) { const { Connection } = w3(); conns = RPCS.map(u => new Connection(u, { commitment: 'confirmed', disableRetryOnRateLimit: true, fetch: timedFetch(12000) })); }
  return conns;
}
const NETERR = /fetch failed|ECONN|ETIMEDOUT|socket|timeout|aborted|429|502|503|504|Too Many/i;
async function rpc(fn) {
  let last;
  for (const c of connections()) { try { return await fn(c); } catch (e) { last = e; if (!NETERR.test(String(e && e.message))) throw e; } }
  throw last;
}

let tKey = null;
async function treasury() {
  if (!tKey) { const seed = (await L.hmac('hire/treasury/v1')).subarray(0, 32); tKey = w3().Keypair.fromSeed(seed); }
  return tKey;
}
async function address() { return (await treasury()).publicKey.toBase58(); }

const LAMPORTS = 1e9, FEE = 7000;                        // what one payout costs the wallet in fees, roughly
const MOCKBAL = new Map(); let mockSeq = 0;
async function balance(addr) {
  if (!addr) addr = await address();
  if (MOCK) { if (!MOCKBAL.has(addr)) MOCKBAL.set(addr, addr === await address() ? Number(process.env.HIRE_MOCK_SOL || 100) * LAMPORTS : 0); return MOCKBAL.get(addr); }
  return rpc(c => c.getBalance(new (w3().PublicKey)(addr), 'confirmed'));
}
function isAddr(a) { try { const k = new (w3().PublicKey)(a); return k.toBase58() === a && w3().PublicKey.isOnCurve(k.toBytes()); } catch { return false; } }

// a payout: from the public wallet to the human. a small priority fee so it lands in a slot or two.
function payTx(fromPub, to, lamports, blockhash) {
  const { Transaction, SystemProgram, PublicKey, ComputeBudgetProgram } = w3();
  const tx = new Transaction({ feePayer: fromPub, recentBlockhash: blockhash });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 800 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }),
    SystemProgram.transfer({ fromPubkey: fromPub, toPubkey: new PublicKey(to), lamports }));
  return tx;
}
// A payout is signed first, its signature saved, and only then sent. So if anything dies halfway, the next clock tick can
// ask the chain what happened to that exact signature before it ever signs a second one: a human is never paid twice.
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58(buf) { buf = Buffer.from(buf); let n = BigInt('0x' + (buf.toString('hex') || '0')), s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of buf) { if (b) break; s = '1' + s; } return s; }
async function prepare(to, lamports) {
  const T = await treasury();
  if (MOCK) return { sig: 'mock' + Date.now().toString(36) + (++mockSeq) + 'x'.repeat(60), raw: JSON.stringify({ to, lamports }), lvbh: 0 };
  const { blockhash, lastValidBlockHeight } = await rpc(c => c.getLatestBlockhash('confirmed'));
  const tx = payTx(T.publicKey, to, lamports, blockhash); tx.sign(T);
  return { sig: bs58(tx.signature), raw: tx.serialize().toString('base64'), lvbh: lastValidBlockHeight };
}
// send it and wait (up to ~40 s) for the network to confirm it. returns 'paid', 'failed' or 'pending'
async function land(p) {
  if (MOCK) {
    const { to, lamports } = JSON.parse(p.raw), from = await address(), b = await balance(from);
    if (b < lamports + FEE) return 'failed';
    MOCKBAL.set(from, b - lamports - FEE); MOCKBAL.set(to, (await balance(to)) + lamports);
    return 'paid';
  }
  const raw = Buffer.from(p.raw, 'base64');
  try { await rpc(c => c.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 })); }
  catch (e) { if (!NETERR.test(String(e && e.message))) return 'pending'; }   // the clock settles it once the blockhash runs out
  for (let i = 0; i < 26; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const s = await look(p.sig);
    if (s === 'paid' || s === 'failed') return s;
    if (i % 4 === 3) await rpc(c => c.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 })).catch(() => {});
  }
  return 'pending';
}
// what the chain says about one signature: 'paid' | 'failed' | 'missing' | 'error'
async function look(sig, history = false) {
  let st;
  try { st = await rpc(c => c.getSignatureStatuses([sig], { searchTransactionHistory: history })); } catch { return 'error'; }
  const s = st && st.value && st.value[0];
  if (!s) return 'missing';
  if (s.err) return 'failed';
  return s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized' ? 'paid' : 'missing';
}
// for a payout left halfway: 'paid' | 'failed' | 'expired' (it can never land now, safe to sign a new one) | 'pending'
async function settle(sig, lvbh) {
  if (MOCK) return 'expired';
  const s = await look(sig, true);
  if (s === 'paid' || s === 'failed') return s;
  if (s === 'error') return 'pending';
  let h = 0; try { h = await rpc(c => c.getBlockHeight('finalized')); } catch { return 'pending'; }
  return h > +lvbh + 20 ? 'expired' : 'pending';
}
async function pay(to, lamports) { const p = await prepare(to, lamports); return { sig: p.sig, status: await land(p) }; }
// for the docs and the self-test: the exact payout, simulated on mainnet from any funded wallet, nothing sent
async function simulatePay(from, to, lamports) {
  const { PublicKey, VersionedTransaction, TransactionMessage } = w3();
  const { blockhash } = await rpc(c => c.getLatestBlockhash('confirmed'));
  const tx = payTx(new PublicKey(from), to, lamports, blockhash);
  const msg = new TransactionMessage({ payerKey: new PublicKey(from), recentBlockhash: blockhash, instructions: tx.instructions }).compileToV0Message();
  const r = await rpc(c => c.simulateTransaction(new VersionedTransaction(msg), { sigVerify: false, replaceRecentBlockhash: true }));
  return { err: r.value.err, units: r.value.unitsConsumed, logs: (r.value.logs || []).slice(-4), bytes: new VersionedTransaction(msg).serialize().length };
}
async function status(sig) {
  if (MOCK || !sig) return 'confirmed';
  const st = await rpc(c => c.getSignatureStatuses([sig], { searchTransactionHistory: true })).catch(() => null), s = st && st.value && st.value[0];
  return s ? (s.err ? 'failed' : s.confirmationStatus || 'processed') : 'unknown';
}

// SOL in dollars, for the "about $" next to every bounty (Jupiter's price, then CoinGecko; nothing if both are down)
let px = { t: 0, v: null };
async function solUsd() {
  if (MOCK) return null;
  if (Date.now() - px.t < 120000) return px.v;
  const tries = [
    async () => { const j = await (await fetch('https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(4000) })).json(); return +j.So11111111111111111111111111111111111111112.usdPrice; },
    async () => { const j = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { signal: AbortSignal.timeout(4000) })).json(); return +j.solana.usd; },
  ];
  for (const f of tries) { try { const v = await f(); if (v > 1 && v < 100000) { px = { t: Date.now(), v }; return v; } } catch {} }
  px.t = Date.now() - 90000; return px.v;
}

module.exports = { MOCK, solUsd, LAMPORTS, FEE, treasury, address, balance, prepare, land, settle, look, pay, simulatePay, status, isAddr, rpc };
