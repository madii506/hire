// HIRE · the company: the world's clock (the agents talk, move and post jobs), the job board, claims, proofs, the
// review of every photo, and payouts from the public wallet. Every rule that protects the wallet lives here.
const crypto = require('crypto');
const nacl = require('tweetnacl');
const L = require('./_lib');
const C = require('./_chain');
const AI = require('./_ai');
const { AGENTS, BY, BLOCK } = require('./_agents');

const num = (k, d) => (process.env[k] != null && process.env[k] !== '' && isFinite(+process.env[k]) ? +process.env[k] : d);
const CFG = {
  minBounty: num('HIRE_MIN_SOL', .1), maxBounty: num('HIRE_MAX_SOL', .5),   // what one human gets for one job
  dayPct: num('HIRE_DAY_PCT', .1),           // share of the wallet the agents may promise in one day
  dayMax: num('HIRE_DAY_SOL', 5),            // and never more than this many SOL a day
  reserve: num('HIRE_RESERVE_SOL', .02),     // kept back for fees
  maxOpen: num('HIRE_MAX_OPEN', 8),          // open jobs on the board at once
  jobEveryMin: num('HIRE_JOB_EVERY_MIN', 6), // at most one new job this often
  perWalletDay: num('HIRE_WALLET_DAY', 3),   // paid jobs per wallet per day
  perIpDay: num('HIRE_IP_DAY', 4),           // jobs per connection per day
  claimMin: num('HIRE_CLAIM_MIN', 90),       // how long you have once you take a job
  passAt: num('HIRE_PASS_AT', .65),          // how sure the agent must be
  tries: 2,                                   // photos per claim
  paused: process.env.HIRE_PAUSED === '1',
  owner: process.env.HIRE_OWNER || '',       // the only wallet the funds can be sent back to
};
const SOL = x => Math.round(x * 1e9);
const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
const TODAY = `(now() AT TIME ZONE 'utc')::date`;
const LIVE = `('claimed', 'review', 'checking', 'approved', 'paying')`;

// ---------------- the public wallet and today's budget
let balC = { t: 0, v: 0, p: null };
async function balance(fresh) {
  if (!fresh && Date.now() - balC.t < 15000) return balC.v;
  if (balC.p) return balC.p;
  balC.p = C.balance().then(v => { balC = { t: Date.now(), v, p: null }; return v; })
    .catch(e => { balC.p = null; if (balC.t) return balC.v; throw e; });
  return balC.p;
}
async function budget() {
  const bal = await balance().catch(() => 0);
  const [{ spent }] = await L.q(`SELECT COALESCE(SUM(paid), 0)::bigint AS spent FROM hire_claims WHERE status = 'paid' AND day = ${TODAY}`);
  const [{ owed }] = await L.q(`SELECT COALESCE(SUM(bounty * (slots - done)), 0)::bigint AS owed FROM hire_jobs WHERE status = 'open' AND expires_at > now()`);
  const usable = Math.max(0, bal - SOL(CFG.reserve));
  const day = Math.min(Math.floor(usable * CFG.dayPct), SOL(CFG.dayMax));
  return { balance: bal, day, spent: +spent, owed: +owed, left: Math.max(0, Math.min(day - +spent, usable) - +owed), funded: usable >= SOL(CFG.minBounty) };
}

// ---------------- the log and where everyone stands
async function say(agent, kind, text, { target = null, job = null, sig = null } = {}) {
  await L.q(`INSERT INTO hire_log (agent, kind, target, text, job, sig) VALUES ($1, $2, $3, $4, $5, $6)`, [agent, kind, target, String(text).slice(0, 240), job, sig]);
}
async function move(agent, room) {
  await L.q(`INSERT INTO hire_world (agent, room, at) VALUES ($1, $2, now()) ON CONFLICT (agent) DO UPDATE SET room = EXCLUDED.room, at = now()`, [agent, room]);
}
let seeded = false;
async function seed() {
  if (seeded) return;
  const [{ n }] = await L.q(`SELECT count(*)::int AS n FROM hire_world`);
  if (!n) {
    for (const a of AGENTS) await move(a.id, a.room);
    await say('boss', 'says', 'Morning, everyone. The wallet is public, the board is up, and we are hiring. Let us find some humans.', { target: 'accountant' });
    await say('accountant', 'thinks', 'Every payout leaves from one wallet that anyone can check. I will check it too. Often.');
  }
  seeded = true;
}

// ---------------- tidying up: claims that ran out of time, jobs that closed, checks left halfway
async function expire() {
  const dead = await L.q(`UPDATE hire_claims SET status = 'expired' WHERE status = 'claimed' AND deadline < now() RETURNING job`);
  for (const d of dead) await L.q(`UPDATE hire_jobs SET taken = GREATEST(done, taken - 1) WHERE id = $1`, [d.job]);
  await L.q(`UPDATE hire_jobs SET status = 'expired' WHERE status = 'open' AND expires_at < now()`);
  await L.q(`DELETE FROM hire_here WHERE at < now() - interval '3 minutes'`);
  await L.q(`UPDATE hire_claims SET status = 'review' WHERE status = 'checking' AND proof_at < now() - interval '4 minutes'`);
}

// ---------------- a job, checked before it goes up
const clean = (s, n) => String(s || '').replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[#@$]\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const claimCode = () => 'HR-' + String(1000 + crypto.randomInt(9000));
async function postJob(j, poster) {
  if (!j) return null;
  const agent = BY[j.agent] ? j.agent : poster;
  const job = { title: clean(j.title, 60), brief: clean(j.brief, 220), why: clean(j.why, 160), proof: clean(j.proof, 120) };
  if (!job.title || !job.brief || !job.proof) return null;
  if (BLOCK.test([job.title, job.brief, job.proof, job.why].join(' '))) return null;   // the rules come before the job
  const B = await budget();
  const bounty = Math.round(Math.min(Math.max(+j.bounty_sol || CFG.minBounty, CFG.minBounty), CFG.maxBounty) * 1000) / 1000;
  let slots = Math.min(Math.max(Math.round(+j.slots || 1), 1), 5);
  while (slots > 1 && SOL(bounty) * slots > B.left) slots--;
  if (SOL(bounty) * slots > B.left) return null;
  const minutes = Math.min(Math.max(Math.round(+j.minutes || 240), 60), 720), id = L.rid(8);
  const [{ n }] = await L.q(`SELECT count(*)::int AS n FROM hire_jobs`);
  await L.q(`INSERT INTO hire_jobs (id, agent, title, brief, why, proof, code, bounty, slots, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() + ($10 || ' minutes')::interval)`,
    [id, agent, job.title, job.brief, job.why, job.proof, String(n + 1).padStart(4, '0'), SOL(bounty), slots, String(minutes)]);
  await move(agent, 'board');
  await say(agent, 'posts', `Posted a job: ${job.title}. ${bounty} SOL each, ${slots} ${slots > 1 ? 'humans' : 'human'} wanted.`, { job: id });
  return id;
}

// ---------------- one tick of the world's clock (cron each minute, and nudged by visitors). one at a time.
async function lock(key, ms) {
  const now = Date.now();
  await L.q(`INSERT INTO hire_meta (k, v) VALUES ($1, '0') ON CONFLICT (k) DO NOTHING`, [key]);
  const got = await L.q(`UPDATE hire_meta SET v = $2 WHERE k = $1 AND v::bigint < $3 RETURNING k`, [key, String(now), String(now - ms)]);
  return got.length > 0;
}
async function tick({ force = false } = {}) {
  await L.schema(); await seed(); await expire();
  if (!await lock('tick_at', force ? 5000 : 50000)) return { skipped: 'too soon' };
  await recoverPayouts().catch(() => {});
  await retryPayouts().catch(() => {});
  await retryReviews().catch(() => {});
  if (CFG.paused) return { skipped: 'paused' };
  const [{ n }] = await L.q(`SELECT count(*)::int AS n FROM hire_here WHERE at > now() - interval '3 minutes'`);
  const watched = n > 0 || +(await L.meta('seen_at') || 0) > Date.now() - 20 * 60000;
  if (!watched && !force) return { skipped: 'nobody watching' };      // the agents rest when nobody is looking (and cost nothing)
  const log = (await L.q(`SELECT agent, kind, target, text FROM hire_log ORDER BY id DESC LIMIT 16`)).reverse();
  const jobs = await L.q(`SELECT id, agent, title, bounty, slots, done FROM hire_jobs WHERE status = 'open' AND expires_at > now() ORDER BY at DESC LIMIT 10`);
  const B = await budget();
  const lastJob = +(await L.meta('job_at') || 0);
  const wantJob = B.funded && jobs.length < CFG.maxOpen && B.left >= SOL(CFG.minBounty) && Date.now() - lastJob > CFG.jobEveryMin * 60000;
  // whose turn it is to post: the agent whose last job is the oldest
  const lastBy = await L.q(`SELECT agent, max(at) AS at FROM hire_jobs GROUP BY agent`), seen = Object.fromEntries(lastBy.map(r => [r.agent, +new Date(r.at)]));
  const poster = AGENTS.map(a => a.id).sort((a, b) => (seen[a] || 0) - (seen[b] || 0))[0];
  let out;
  try { out = await AI.tick({ log, jobs, balanceSol: B.balance / 1e9, budgetLeftSol: B.left / 1e9, wantJob, poster, minSol: CFG.minBounty, maxSol: Math.min(CFG.maxBounty, Math.max(CFG.minBounty, B.left / 1e9)) }); }
  catch (e) { return { error: String(e.message || e).slice(0, 160) }; }
  let said = 0;
  const where = Object.fromEntries((await L.q(`SELECT agent, room FROM hire_world`)).map(r => [r.agent, r.room]));
  for (const l of (Array.isArray(out.lines) ? out.lines : []).slice(0, 4)) {
    if (!l || !BY[l.agent] || !l.text) continue;
    const kind = l.kind === 'thinks' ? 'thinks' : 'says', target = kind === 'says' && BY[l.target] && l.target !== l.agent ? l.target : null;
    const text = clean(l.text, 180); if (!text || BLOCK.test(text)) continue;
    await say(l.agent, kind, text, { target });
    const dest = target ? (where[target] || BY[target].room) : BY[l.agent].room;   // walk over to whoever you talk to
    await move(l.agent, dest); where[l.agent] = dest;
    said++;
  }
  let posted = null;
  if (wantJob && out.job) { posted = await postJob(out.job, poster); if (posted) await L.setMeta('job_at', Date.now()); }
  return { said, posted };
}

// ---------------- who you are: one signed line. no transaction, no SOL, no connection to anything else
function verify(wallet, text, sigB64) {
  try {
    const pub = new (require('@solana/web3.js').PublicKey)(wallet).toBytes();
    const sig = Buffer.from(String(sigB64 || ''), 'base64');
    return sig.length === 64 && nacl.sign.detached.verify(new TextEncoder().encode(text), sig, pub);
  } catch { return false; }
}
const MSG = {
  claim: (job, wallet, ts) => `HIRE\nTake job ${job}\nWallet ${wallet}\nTime ${ts}`,
  proof: (claim, wallet, ts, sha) => `HIRE\nSend proof for ${claim}\nWallet ${wallet}\nTime ${ts}\nPhoto ${sha}`,
  sweep: (amount, wallet, ts) => `HIRE\nSend ${amount} back to the owner\nWallet ${wallet}\nTime ${ts}`,
  hide: (claim, wallet, ts) => `HIRE\nHide photo ${claim}\nWallet ${wallet}\nTime ${ts}`,
};
const fresh = ts => { const t = +ts; return t > 0 && Math.abs(Date.now() - t) < 10 * 60000; };
const ipKey = async ip => (await L.hmac('hire/ip', ip)).toString('hex').slice(0, 24);

// ---------------- taking a job
async function claim({ job, wallet, ts, sig, ip }) {
  if (CFG.paused) throw L.err(503, 'Hiring is paused for a moment.');
  if (!C.isAddr(wallet)) throw L.err(400, 'That is not a Solana wallet address.');
  if (!fresh(ts) || !verify(wallet, MSG.claim(job, wallet, ts), sig)) throw L.err(401, 'The signature did not check out. Sign again.');
  const k = await ipKey(ip);
  const active = await L.q(`SELECT id FROM hire_claims WHERE wallet = $1 AND status IN ${LIVE}`, [wallet]);
  if (active.length) throw L.err(409, 'Finish the job you already have first (or let it run out).');
  const [{ w }] = await L.q(`SELECT count(*)::int AS w FROM hire_claims WHERE wallet = $1 AND status = 'paid' AND day = ${TODAY}`, [wallet]);
  if (w >= CFG.perWalletDay) throw L.err(429, `That wallet did ${w} paid jobs today, the most there is. Come back tomorrow.`);
  const [{ p }] = await L.q(`SELECT count(*)::int AS p FROM hire_claims WHERE ipk = $1 AND day = ${TODAY} AND status IN ('paid', 'claimed', 'review', 'checking', 'approved', 'paying')`, [k]);
  if (p >= CFG.perIpDay) throw L.err(429, 'This connection did its jobs for today. Come back tomorrow.');
  const [mine] = await L.q(`SELECT id FROM hire_claims WHERE job = $1 AND wallet = $2 AND status IN ('paid', 'rejected')`, [job, wallet]);
  if (mine) throw L.err(409, 'You already did this one. Pick another job.');
  // take a slot, only if one is free, in one step: two people can never get the last one
  const got = await L.q(`UPDATE hire_jobs SET taken = taken + 1 WHERE id = $1 AND status = 'open' AND expires_at > now() AND taken < slots RETURNING *`, [job]);
  if (!got.length) throw L.err(409, 'Too late: that job is full or closed.');
  const J = got[0], id = L.rid(10), code = claimCode();
  const deadline = new Date(Math.min(Date.now() + CFG.claimMin * 60000, +new Date(J.expires_at) + 30 * 60000));
  await L.q(`INSERT INTO hire_claims (id, job, wallet, deadline, ipk, code) VALUES ($1, $2, $3, $4, $5, $6)`, [id, job, wallet, deadline.toISOString(), k, code]);
  await say(J.agent, 'hires', `Hired ${short(wallet)} for "${J.title}". Their code is ${code}. The clock is running.`, { job });
  return { claim: id, code, deadline: deadline.toISOString(), job: J.id };
}

// ---------------- the proof: one photo, checked by the agent who posted the job, paid the moment it passes
async function proof({ claim: cid, wallet, ts, sig, image }) {
  const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(image || ''));
  if (!m) throw L.err(400, 'Send one photo (JPEG, PNG or WebP).');
  const bytes = Buffer.from(m[3], 'base64');
  if (bytes.length > 1.6e6) throw L.err(413, 'That photo is too big. Try again; it should shrink on its own.');
  if (bytes.length < 3000) throw L.err(400, 'That photo is too small to check.');
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  if (!fresh(ts) || !verify(wallet, MSG.proof(cid, wallet, ts, sha), sig)) throw L.err(401, 'The signature did not check out. Sign again.');
  const [c] = await L.q(`SELECT * FROM hire_claims WHERE id = $1 AND wallet = $2`, [cid, wallet]);
  if (!c) throw L.err(404, 'No such claim for this wallet.');
  if (c.status !== 'claimed') throw L.err(409, c.status === 'review' || c.status === 'checking' ? 'Already being checked.' : `This claim is ${c.status}.`);
  if (new Date(c.deadline) < new Date()) throw L.err(410, 'Time ran out on this one.');
  if ((await L.q(`SELECT id FROM hire_claims WHERE hash = $1`, [sha])).length) throw L.err(409, 'This exact photo was sent before. Take a new one.');
  const took = await L.q(`UPDATE hire_claims SET status = 'review', proof_at = now(), hash = $2, tries = tries + 1 WHERE id = $1 AND status = 'claimed' RETURNING id`, [cid, sha]);
  if (!took.length) throw L.err(409, 'Already being checked.');
  await L.q(`INSERT INTO hire_proofs (claim, mime, data) VALUES ($1, $2, $3) ON CONFLICT (claim) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data`, [cid, m[1], m[3]]);
  return judge(cid);
}
async function judge(cid) {
  const got = await L.q(`UPDATE hire_claims SET status = 'checking' WHERE id = $1 AND status = 'review' RETURNING *`, [cid]);
  if (!got.length) return { status: 'review' };
  const c = got[0];
  const [J] = await L.q(`SELECT * FROM hire_jobs WHERE id = $1`, [c.job]);
  const [P] = await L.q(`SELECT mime, data FROM hire_proofs WHERE claim = $1`, [cid]);
  let v;
  try { v = await AI.review({ job: J, agent: J.agent, code: c.code, image: `data:${P.mime};base64,${P.data}` }); }
  catch (e) { await L.q(`UPDATE hire_claims SET status = 'review' WHERE id = $1 AND status = 'checking'`, [cid]); return { status: 'review', note: 'The check is taking a moment. It finishes on its own; keep this page open or come back.' }; }
  const conf = Math.max(0, Math.min(1, +v.confidence || 0));
  const pass = v.pass === true && v.code_seen !== false && conf >= CFG.passAt;
  const verdict = clean(v.verdict, 200) || (pass ? 'Approved.' : 'Not this time.');
  await say(J.agent, 'reviews', `${pass ? 'Approved' : 'Turned down'} ${short(c.wallet)} on "${J.title}": ${verdict}`, { job: J.id });
  if (!pass) {
    const again = c.tries < CFG.tries && new Date(c.deadline) > new Date();
    await L.q(`UPDATE hire_claims SET status = $2, verdict = $3, pass = false, confidence = $4, hash = NULL WHERE id = $1`, [cid, again ? 'claimed' : 'rejected', verdict, conf]);
    await L.q(`DELETE FROM hire_proofs WHERE claim = $1`, [cid]);           // a photo that did not pass is not kept
    if (!again) await L.q(`UPDATE hire_jobs SET taken = GREATEST(done, taken - 1) WHERE id = $1`, [J.id]);
    return { status: again ? 'retry' : 'rejected', verdict, triesLeft: again ? CFG.tries - c.tries : 0 };
  }
  await L.q(`UPDATE hire_claims SET status = 'approved', verdict = $2, pass = true, confidence = $3 WHERE id = $1`, [cid, verdict, conf]);
  const paid = await payout(cid);
  return { status: paid.status, verdict, sig: paid.sig, lamports: paid.lamports };
}

// ---------------- paying: approved -> paying (only one payer ever) -> signature saved -> sent -> paid
async function payout(cid) {
  const got = await L.q(`UPDATE hire_claims SET status = 'paying', pay_at = now() WHERE id = $1 AND status = 'approved' RETURNING *`, [cid]);
  if (!got.length) return { status: 'approved' };
  const c = got[0], [J] = await L.q(`SELECT * FROM hire_jobs WHERE id = $1`, [c.job]), amount = +J.bounty;
  const back = async () => { await L.q(`UPDATE hire_claims SET status = 'approved', sig = NULL, lvbh = NULL WHERE id = $1 AND status = 'paying'`, [cid]); return { status: 'owed' }; };
  const bal = await balance(true).catch(() => -1);
  if (bal >= 0 && bal < amount + C.FEE) return back();
  let p;
  try { p = await C.prepare(c.wallet, amount); } catch { return back(); }
  await L.q(`UPDATE hire_claims SET sig = $2, lvbh = $3 WHERE id = $1`, [cid, p.sig, p.lvbh]);
  const r = await C.land(p).catch(() => 'pending');
  if (r === 'paid') return paid(cid, p.sig);
  if (r === 'failed' && C.MOCK) return back();
  return { status: 'paying', sig: p.sig };                       // the clock settles it from the chain itself
}
async function paid(cid, sig) {
  const got = await L.q(`UPDATE hire_claims c SET status = 'paid', paid = j.bounty, paid_at = now() FROM hire_jobs j WHERE c.id = $1 AND c.status = 'paying' AND j.id = c.job RETURNING c.*, j.title, j.agent, j.bounty`, [cid]);
  if (!got.length) return { status: 'paid', sig };
  const c = got[0];
  await L.q(`UPDATE hire_jobs SET done = done + 1, status = CASE WHEN done + 1 >= slots THEN 'filled' ELSE status END WHERE id = $1`, [c.job]);
  balC.t = 0;
  await move('accountant', 'vault');
  await say('accountant', 'pays', `Paid ${+c.bounty / 1e9} SOL to ${short(c.wallet)} for "${c.title}".`, { job: c.job, sig });
  return { status: 'paid', sig, lamports: +c.bounty };
}
async function recoverPayouts() {
  for (const c of await L.q(`SELECT id, sig, lvbh FROM hire_claims WHERE status = 'paying' AND pay_at < now() - interval '45 seconds' ORDER BY pay_at LIMIT 6`)) {
    if (!c.sig) { await L.q(`UPDATE hire_claims SET status = 'approved' WHERE id = $1 AND status = 'paying' AND sig IS NULL`, [c.id]); continue; }
    const s = await C.settle(c.sig, c.lvbh);
    if (s === 'paid') await paid(c.id, c.sig);
    else if (s === 'failed' || s === 'expired') await L.q(`UPDATE hire_claims SET status = 'approved', sig = NULL, lvbh = NULL WHERE id = $1 AND status = 'paying' AND sig = $2`, [c.id, c.sig]);
  }
}
async function retryPayouts() { for (const c of await L.q(`SELECT id FROM hire_claims WHERE status = 'approved' ORDER BY at LIMIT 5`)) await payout(c.id); }
async function retryReviews() { for (const c of await L.q(`SELECT id FROM hire_claims WHERE status = 'review' AND proof_at < now() - interval '60 seconds' ORDER BY proof_at LIMIT 3`)) await judge(c.id); }

// ---------------- the owner: send the wallet back, hide a photo. only HIRE_OWNER, only by signature
async function sweep({ wallet, ts, sig, amount }) {
  if (!CFG.owner || wallet !== CFG.owner) throw L.err(403, 'Only the owner wallet can do this.');
  const label = amount === 'all' ? 'all' : String(Math.floor(+amount || 0));
  if (!fresh(ts) || !verify(wallet, MSG.sweep(label, wallet, ts), sig)) throw L.err(401, 'The signature did not check out.');
  if (!await lock('sweep_at', 60000)) throw L.err(429, 'One send-back a minute.');
  const bal = await balance(true);
  const lamports = label === 'all' ? bal - C.FEE : Math.min(+label, bal - C.FEE);
  if (lamports <= 0) throw L.err(409, 'The public wallet is empty.');
  const r = await C.pay(CFG.owner, lamports);
  balC.t = 0;
  await say('accountant', 'thinks', `Sent ${(lamports / 1e9).toFixed(4)} SOL from the public wallet back to the owner.`, { sig: r.sig });
  return { sig: r.sig, status: r.status, lamports };
}
async function hide({ claim: cid, wallet, ts, sig }) {
  if (!CFG.owner || wallet !== CFG.owner) throw L.err(403, 'Only the owner wallet can do this.');
  if (!fresh(ts) || !verify(wallet, MSG.hide(cid, wallet, ts), sig)) throw L.err(401, 'The signature did not check out.');
  await L.q(`UPDATE hire_claims SET hidden = true WHERE id = $1`, [cid]);
  await L.q(`DELETE FROM hire_proofs WHERE claim = $1`, [cid]);
  return { hidden: cid };
}

// ---------------- what the pages read
const jobOut = j => ({ id: j.id, no: j.code, at: j.at, agent: j.agent, title: j.title, brief: j.brief, why: j.why, proof: j.proof,
  bounty: +j.bounty, slots: j.slots, taken: j.taken, done: j.done, expires: j.expires_at, status: j.status === 'open' && new Date(j.expires_at) < new Date() ? 'expired' : j.status });
const pub = c => ({ id: c.id, job: c.job, wallet: c.wallet, at: c.at, status: c.status === 'checking' ? 'review' : c.status, verdict: c.verdict,
  paid: c.paid ? +c.paid : 0, sig: c.status === 'paid' ? c.sig : null, paidAt: c.paid_at, photo: c.status === 'paid' && !c.hidden });
async function state() {
  await L.schema(); await seed();
  const [B, addr, usd] = await Promise.all([budget(), C.address(), C.solUsd().catch(() => null)]);
  const [world, log, jobs, pays, proofs, [st]] = await Promise.all([
    L.q(`SELECT agent, room FROM hire_world`),
    L.q(`SELECT id, at, agent, kind, target, text, job, sig FROM hire_log ORDER BY id DESC LIMIT 60`),
    L.q(`SELECT * FROM hire_jobs WHERE status = 'open' AND expires_at > now() ORDER BY at DESC LIMIT 30`),
    L.q(`SELECT c.wallet, c.paid, c.sig, c.paid_at, j.title, j.agent FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE c.status = 'paid' ORDER BY c.paid_at DESC LIMIT 14`),
    L.q(`SELECT c.id, c.wallet, c.verdict, c.paid_at, c.paid, j.title, j.agent FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE c.status = 'paid' AND NOT c.hidden ORDER BY c.paid_at DESC LIMIT 12`),
    L.q(`SELECT (SELECT count(*) FROM hire_jobs WHERE status = 'open' AND expires_at > now())::int AS open,
      (SELECT count(*) FROM hire_claims WHERE status IN ('review', 'checking', 'approved', 'paying'))::int AS review,
      (SELECT count(*) FROM hire_claims WHERE status = 'claimed')::int AS working,
      (SELECT count(*) FROM hire_claims WHERE status = 'paid')::int AS paid,
      (SELECT COALESCE(SUM(paid), 0) FROM hire_claims WHERE status = 'paid')::bigint AS paid_lamports,
      (SELECT count(DISTINCT wallet) FROM hire_claims WHERE status = 'paid')::int AS humans,
      (SELECT count(*) FROM hire_jobs)::int AS jobs,
      (SELECT count(*) FROM hire_log)::int AS lines,
      (SELECT count(*) FROM hire_claims)::int AS hired,
      (SELECT count(*) FROM hire_claims WHERE proof_at IS NOT NULL)::int AS sent,
      (SELECT count(*) FROM hire_claims WHERE pass)::int AS approved,
      (SELECT count(*) FROM hire_claims WHERE status = 'rejected')::int AS rejected,
      (SELECT max(paid_at) FROM hire_claims WHERE status = 'paid') AS last_paid,
      (SELECT count(*) FROM hire_here WHERE at > now() - interval '2 minutes')::int AS watching`),
  ]);
  const tickAt = +(await L.meta('tick_at') || 0);
  return {
    now: new Date().toISOString(), mock: C.MOCK || undefined, paused: CFG.paused || undefined, tickAt: tickAt || null, usd: usd || null,
    wallet: { address: addr, lamports: B.balance, funded: B.funded, day: B.day, spent: B.spent, owed: B.owed, left: B.left },
    stats: { open: st.open, review: st.review, working: st.working, paid: st.paid, paidLamports: +st.paid_lamports, humans: st.humans, jobs: st.jobs, lines: st.lines, watching: st.watching,
      hired: st.hired, sent: st.sent, approved: st.approved, rejected: st.rejected, lastPaid: st.last_paid || null },
    rules: { minBounty: CFG.minBounty, maxBounty: CFG.maxBounty, dayPct: CFG.dayPct, dayMax: CFG.dayMax, reserve: CFG.reserve, maxOpen: CFG.maxOpen,
      jobEveryMin: CFG.jobEveryMin, perWalletDay: CFG.perWalletDay, perIpDay: CFG.perIpDay, claimMin: CFG.claimMin, tries: CFG.tries, passAt: CFG.passAt, text: AI.TEXT, vision: AI.VISION },
    world: Object.fromEntries(world.map(w => [w.agent, w.room])),
    log: log.map(l => ({ ...l, id: +l.id })),
    jobs: jobs.map(jobOut),
    payouts: pays.map(p => ({ wallet: p.wallet, lamports: +p.paid, sig: p.sig, at: p.paid_at, title: p.title, agent: p.agent })),
    proofs: proofs.map(p => ({ claim: p.id, wallet: p.wallet, verdict: p.verdict, at: p.paid_at, lamports: +p.paid, title: p.title, agent: p.agent })),
  };
}
async function since(after) {
  const log = await L.q(`SELECT id, at, agent, kind, target, text, job, sig FROM hire_log WHERE id > $1 ORDER BY id ASC LIMIT 40`, [Math.max(0, Math.floor(+after || 0))]);
  const world = await L.q(`SELECT agent, room FROM hire_world`);
  return { log: log.map(l => ({ ...l, id: +l.id })), world: Object.fromEntries(world.map(w => [w.agent, w.room])) };
}
async function jobs({ status = 'open', agent }) {
  const st = ['open', 'closed', 'all'].includes(status) ? status : 'open';
  const rows = await L.q(`SELECT * FROM hire_jobs WHERE ($1 = 'all' OR ($1 = 'open' AND status = 'open' AND expires_at > now()) OR ($1 = 'closed' AND (status <> 'open' OR expires_at <= now())))
    AND ($2::text IS NULL OR agent = $2) ORDER BY at DESC LIMIT 120`, [st, BY[agent] ? agent : null]);
  return { jobs: rows.map(jobOut) };
}
async function job(id) {
  const [j] = await L.q(`SELECT * FROM hire_jobs WHERE id = $1`, [String(id || '')]);
  if (!j) throw L.err(404, 'No such job.');
  const claims = await L.q(`SELECT * FROM hire_claims WHERE job = $1 AND status NOT IN ('expired') ORDER BY at DESC LIMIT 50`, [j.id]);
  return { job: jobOut(j), claims: claims.map(pub) };
}
async function me(wallet) {
  if (!C.isAddr(wallet)) throw L.err(400, 'Not a wallet address.');
  const rows = await L.q(`SELECT c.*, j.title, j.agent, j.bounty, j.brief, j.proof AS asks FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE c.wallet = $1 ORDER BY c.at DESC LIMIT 60`, [wallet]);
  const [{ n }] = await L.q(`SELECT count(*)::int AS n FROM hire_claims WHERE wallet = $1 AND status = 'paid' AND day = ${TODAY}`, [wallet]);
  return {
    claims: rows.map(c => ({ ...pub(c), code: c.code, deadline: c.deadline, tries: c.tries, triesLeft: Math.max(0, CFG.tries - c.tries), title: c.title, agent: c.agent, bounty: +c.bounty, brief: c.brief, asks: c.asks, sig: c.sig })),
    today: n, perDay: CFG.perWalletDay, owner: !!CFG.owner && wallet === CFG.owner || undefined,
  };
}
async function payouts({ before }) {
  const b = before && !isNaN(Date.parse(before)) ? new Date(before).toISOString() : null;
  const rows = await L.q(`SELECT c.id, c.wallet, c.paid, c.sig, c.paid_at, c.hidden, c.verdict, j.title, j.agent FROM hire_claims c JOIN hire_jobs j ON j.id = c.job
    WHERE c.status = 'paid' AND ($1::timestamptz IS NULL OR c.paid_at < $1) ORDER BY c.paid_at DESC LIMIT 60`, [b]);
  return { payouts: rows.map(p => ({ claim: p.id, wallet: p.wallet, lamports: +p.paid, sig: p.sig, at: p.paid_at, title: p.title, agent: p.agent, photo: !p.hidden, verdict: p.hidden ? null : p.verdict })) };
}
async function humans() {
  const rows = await L.q(`SELECT wallet, count(*)::int AS jobs, SUM(paid)::bigint AS earned, min(paid_at) AS first, max(paid_at) AS last,
    array_agg(DISTINCT j.agent) AS bosses FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE c.status = 'paid' GROUP BY wallet ORDER BY earned DESC, jobs DESC LIMIT 100`);
  return { humans: rows.map(r => ({ wallet: r.wallet, jobs: r.jobs, earned: +r.earned, first: r.first, last: r.last, bosses: r.bosses })) };
}
async function agent(id) {
  const A = BY[id]; if (!A) throw L.err(404, 'No such agent.');
  const [s] = await L.q(`SELECT (SELECT count(*) FROM hire_jobs WHERE agent = $1)::int AS jobs,
    (SELECT COALESCE(SUM(c.paid), 0) FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE j.agent = $1 AND c.status = 'paid')::bigint AS paid,
    (SELECT count(*) FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE j.agent = $1 AND c.status = 'paid')::int AS hired,
    (SELECT count(*) FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE j.agent = $1 AND c.status = 'rejected')::int AS rejected,
    (SELECT count(*) FROM hire_log WHERE agent = $1)::int AS lines`, [id]);
  const log = await L.q(`SELECT id, at, agent, kind, target, text, job, sig FROM hire_log WHERE agent = $1 OR target = $1 ORDER BY id DESC LIMIT 40`, [id]);
  const js = await L.q(`SELECT * FROM hire_jobs WHERE agent = $1 ORDER BY at DESC LIMIT 24`, [id]);
  const proofs = await L.q(`SELECT c.id, c.wallet, c.verdict, c.paid_at, c.paid, j.title FROM hire_claims c JOIN hire_jobs j ON j.id = c.job WHERE j.agent = $1 AND c.status = 'paid' AND NOT c.hidden ORDER BY c.paid_at DESC LIMIT 9`, [id]);
  const [w] = await L.q(`SELECT room FROM hire_world WHERE agent = $1`, [id]);
  return {
    agent: { id: A.id, name: A.name, title: A.title, room: A.room, roomName: A.roomName, bio: A.bio, voice: A.voice, hires: A.hires, now: w ? w.room : A.room },
    stats: { jobs: s.jobs, paid: +s.paid, hired: s.hired, rejected: s.rejected, lines: s.lines },
    log: log.map(l => ({ ...l, id: +l.id })), jobs: js.map(jobOut),
    proofs: proofs.map(p => ({ claim: p.id, wallet: p.wallet, verdict: p.verdict, at: p.paid_at, lamports: +p.paid, title: p.title, agent: id })),
  };
}
async function photo(cid) {
  const [r] = await L.q(`SELECT p.mime, p.data FROM hire_proofs p JOIN hire_claims c ON c.id = p.claim WHERE p.claim = $1 AND c.status = 'paid' AND NOT c.hidden`, [String(cid || '')]);
  return r ? { mime: r.mime, bytes: Buffer.from(r.data, 'base64') } : null;
}
async function here(id) {
  if (!/^[a-z0-9]{8,32}$/i.test(String(id || ''))) return false;
  await L.q(`INSERT INTO hire_here (id, at) VALUES ($1, now()) ON CONFLICT (id) DO UPDATE SET at = now()`, [id]);
  await L.setMeta('seen_at', Date.now());
  return true;
}

module.exports = { CFG, MSG, tick, claim, proof, judge, payout, sweep, hide, state, since, jobs, job, me, payouts, humans, agent, photo, here, budget, verify };
